use anyhow::{Context, Result};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

// Assuming these are defined elsewhere in your crate
use crate::backend::dependency_graph::{detect_cycles, topo_sort};
use crate::backend::project::{Project, Service};

// =============================================================================
// TEMPLATES
// =============================================================================
// This module uses a template-based approach for generating Tiltfiles and K8s
// manifests. Templates are defined as constants and use {{PLACEHOLDER}} syntax
// for variable substitution.
//
// Benefits:
// - Easy to read and maintain
// - Clear separation between logic and content
// - Simple to modify templates without touching logic
// - No external dependencies for templating
// =============================================================================

const ROOT_TILTFILE_TEMPLATE: &str = r#"# GENERATED — DO NOT EDIT
# Environment: {{ENV_NAME}}

{{LOADS}}

services = [
{{SERVICES}}
]

for svc in services:
    svc()
"#;

const SERVICE_TILTFILE_TEMPLATE: &str = r#"# GENERATED — DO NOT EDIT

def {{SERVICE_NAME_SNAKE}}():
{{DOCKER_SECTION}}{{K8S_SECTION}}
    k8s_resource(
        "{{SERVICE_NAME}}",
        port_forwards={{PORT}},
        resource_deps={{DEPENDENCIES}}
    )
"#;

const K8S_DEPLOYMENT_TEMPLATE: &str = r#"apiVersion: v1
kind: ConfigMap
metadata:
  name: {{SERVICE_NAME}}-config
data:
{{ENV_DATA}}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{SERVICE_NAME}}
  labels:
    app: {{SERVICE_NAME}}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: {{SERVICE_NAME}}
  template:
    metadata:
      labels:
        app: {{SERVICE_NAME}}
    spec:
      containers:
      - name: {{SERVICE_NAME}}
        image: {{SERVICE_NAME}}
        ports:
        - containerPort: {{PORT}}
        envFrom:
        - configMapRef:
            name: {{SERVICE_NAME}}-config
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: {{SERVICE_NAME}}
spec:
  selector:
    app: {{SERVICE_NAME}}
  ports:
  - port: {{PORT}}
    targetPort: {{PORT}}
  type: ClusterIP
"#;

// Template helper functions
fn render_template(template: &str, replacements: &[(&str, &str)]) -> String {
    let mut result = template.to_string();
    for (key, value) in replacements {
        result = result.replace(key, value);
    }
    result
}

pub fn generate_tiltfiles(project: &Project, env_name: &str) -> Result<()> {
    let env_config = project
        .environments
        .get(env_name)
        .ok_or_else(|| anyhow::anyhow!("Environment {} not found", env_name))?;

    let workspace = &project.project.workspace_path;
    let services_path = project.project.services_path.as_deref().unwrap_or("repos");
    let tilt_dir = Path::new(workspace).join("tilt").join(env_name);
    let services_dir = tilt_dir.join("services");

    fs::create_dir_all(&services_dir)
        .with_context(|| format!("Failed to create directory: {}", services_dir.display()))?;

    let enabled_services: Vec<Service> = env_config
        .services
        .iter()
        .filter(|s| s.enabled)
        .cloned()
        .collect();

    if let Some(cycle) = detect_cycles(&enabled_services) {
        let cycle_str: String = cycle.join(" -> ");
        return Err(anyhow::anyhow!("Dependency cycle detected: {}", cycle_str));
    }

    let sorted_services = topo_sort(&enabled_services);

    // Generate root Tiltfile using template
    let loads = sorted_services
        .iter()
        .map(|s| {
            format!(
                r#"load("./services/{}.tilt.py", "{}")"#,
                s.name,
                s.name.replace('-', "_")
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    let services_list = sorted_services
        .iter()
        .map(|s| format!("    {},", s.name.replace('-', "_")))
        .collect::<Vec<_>>()
        .join("\n");

    let root_tiltfile = render_template(
        ROOT_TILTFILE_TEMPLATE,
        &[
            ("{{ENV_NAME}}", env_name),
            ("{{LOADS}}", &loads),
            ("{{SERVICES}}", &services_list),
        ],
    );

    let root_tiltfile_path = tilt_dir.join("Tiltfile");
    fs::write(&root_tiltfile_path, root_tiltfile)
        .with_context(|| format!("Failed to write {}", root_tiltfile_path.display()))?;

    // Per-service Tiltfiles and additional files
    for svc in sorted_services {
        let service_tiltfile_content =
            generate_service_tiltfile(&env_config.shared_env, &svc, services_path);
        let service_file_path = services_dir.join(format!("{}.tilt.py", svc.name));

        fs::write(&service_file_path, service_tiltfile_content)
            .with_context(|| format!("Failed to write {}", service_file_path.display()))?;

        // Generate additional files based on deployment type
        generate_service_files(
            workspace,
            env_name,
            &env_config.shared_env,
            &svc,
            services_path,
        )?;
    }

    Ok(())
}

fn generate_service_tiltfile(
    shared_env: &HashMap<String, String>,
    svc: &Service,
    services_path: &str,
) -> String {
    let mut env: HashMap<String, String> = shared_env.clone();
    if let Some(svc_env) = &svc.env {
        env.extend(svc_env.clone());
    }

    let docker_context = svc
        .docker
        .as_ref()
        .map(|d| d.context.as_str())
        .unwrap_or(".");

    let dockerfile_name = svc
        .docker
        .as_ref()
        .map(|d| d.dockerfile.as_str())
        .unwrap_or("Dockerfile");

    let manifests_path = svc
        .k8s
        .as_ref()
        .map(|k| k.manifests.as_str())
        .unwrap_or("k8s");

    // Build docker_build section if docker is configured
    let docker_section = if svc.docker.is_some() {
        format!(
            r#"    docker_build(
        "{}",
        context="../../{}/{}/{}",
        dockerfile="../../{}/{}/{}",
    )
"#,
            svc.name,
            services_path,
            svc.name,
            docker_context,
            services_path,
            svc.name,
            dockerfile_name,
        )
    } else {
        String::new()
    };

    // Build k8s_yaml section based on what's configured
    let k8s_section = if let Some(helm) = &svc.helm {
        format!(
            r#"    helm(
        "{}",
        namespace="{}",
    )
"#,
            helm.chart,
            helm.namespace.as_deref().unwrap_or("default")
        )
    } else if let Some(kustomize) = &svc.kustomize {
        format!(
            r#"    k8s_yaml(kustomize("../../{}/{}/{}"))
"#,
            services_path, svc.name, kustomize.path
        )
    } else if svc.k8s.is_some() {
        format!(
            r#"    k8s_yaml("../../{}/{}/{}")
"#,
            services_path, svc.name, manifests_path
        )
    } else {
        String::new()
    };

    // Use template for service Tiltfile
    render_template(
        SERVICE_TILTFILE_TEMPLATE,
        &[
            ("{{SERVICE_NAME}}", &svc.name),
            ("{{SERVICE_NAME_SNAKE}}", &svc.name.replace("-", "_")),
            ("{{DOCKER_SECTION}}", &docker_section),
            ("{{K8S_SECTION}}", &k8s_section),
            ("{{PORT}}", &svc.port.to_string()),
            (
                "{{DEPENDENCIES}}",
                &serde_json::to_string(&svc.depends_on.as_deref().unwrap_or(&[])).unwrap(),
            ),
        ],
    )
}

fn generate_service_files(
    workspace: &str,
    env_name: &str,
    shared_env: &HashMap<String, String>,
    svc: &Service,
    services_path: &str,
) -> Result<()> {
    let service_dir = Path::new(workspace).join(services_path).join(&svc.name);

    // Merge shared and service env vars
    let mut env: HashMap<String, String> = shared_env.clone();
    if let Some(svc_env) = &svc.env {
        env.extend(svc_env.clone());
    }

    // Always generate .env file for the service
    generate_env_file(&service_dir, env_name, &env)?;

    // If k8s is specified, generate k8s YAML file (with merged ConfigMap)
    if svc.k8s.is_some() {
        let k8s_dir = service_dir.join("k8s");
        fs::create_dir_all(&k8s_dir)
            .with_context(|| format!("Failed to create k8s directory: {}", k8s_dir.display()))?;

        // Generate Deployment with embedded ConfigMap
        generate_k8s_deployment(&k8s_dir, &svc.name, svc.port, &env)?;
    }

    Ok(())
}

fn generate_k8s_deployment(
    k8s_dir: &Path,
    service_name: &str,
    port: u16,
    env: &HashMap<String, String>,
) -> Result<()> {
    let deployment_path = k8s_dir.join(format!("{}-deployment.yaml", service_name));

    // Only generate if file doesn't exist
    if deployment_path.exists() {
        return Ok(());
    }

    let env_data = env
        .iter()
        .map(|(k, v)| format!("  {}: \"{}\"", k, v.replace("\"", "\\\"")))
        .collect::<Vec<_>>()
        .join("\n");

    // Use template for Deployment with embedded ConfigMap
    let deployment = render_template(
        K8S_DEPLOYMENT_TEMPLATE,
        &[
            ("{{SERVICE_NAME}}", service_name),
            ("{{PORT}}", &port.to_string()),
            ("{{ENV_DATA}}", &env_data),
        ],
    );

    fs::write(&deployment_path, deployment)
        .with_context(|| format!("Failed to write deployment: {}", deployment_path.display()))?;

    Ok(())
}

fn generate_env_file(
    service_dir: &Path,
    env_name: &str,
    env: &HashMap<String, String>,
) -> Result<()> {
    let env_file_path = service_dir.join(format!(".env.{}", env_name));

    // Only generate if file doesn't exist
    if env_file_path.exists() {
        return Ok(());
    }

    let env_content = env
        .iter()
        .map(|(k, v)| format!("{}={}", k, v))
        .collect::<Vec<_>>()
        .join("\n");

    fs::write(&env_file_path, env_content)
        .with_context(|| format!("Failed to write env file: {}", env_file_path.display()))?;

    Ok(())
}

pub fn reorder_services(project: &mut Project, env: &str, new_order: Vec<String>) -> Result<()> {
    let env_config = project
        .environments
        .get_mut(env)
        .ok_or_else(|| anyhow::anyhow!("Environment {} not found", env))?;

    env_config.services.sort_by(|a, b| {
        let a_idx = new_order
            .iter()
            .position(|n| n == &a.name)
            .unwrap_or(usize::MAX);
        let b_idx = new_order
            .iter()
            .position(|n| n == &b.name)
            .unwrap_or(usize::MAX);
        a_idx.cmp(&b_idx)
    });

    // Optional: validate no cycles after reorder
    let enabled_services: Vec<Service> = env_config
        .services
        .iter()
        .filter(|s| s.enabled)
        .cloned()
        .collect();
    if let Some(cycle) = detect_cycles(&enabled_services) {
        let cycle_str: String = cycle.join(" -> ");
        return Err(anyhow::anyhow!(
            "Invalid reorder: cycle detected {}",
            cycle_str
        ));
    }

    // Regenerate Tiltfiles
    generate_tiltfiles(project, env)
}
