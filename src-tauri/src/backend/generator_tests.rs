#[cfg(test)]
mod tests {
    use super::super::generator::*;
    use crate::backend::project::{Project, ProjectInfo, Service, TiltConfig};
    use std::collections::HashMap;
    use std::fs;
    use tempfile::TempDir;

    fn create_test_project() -> (Project, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let workspace_path = temp_dir.path().to_str().unwrap().to_string();

        let project = Project {
            project: ProjectInfo {
                name: "test-project".to_string(),
                workspace_path: workspace_path.clone(),
                services_path: Some("repos".to_string()),
                tilt: TiltConfig {
                    mode: "local".to_string(),
                },
            },
            environments: HashMap::from([(
                "dev".to_string(),
                crate::backend::project::Environment {
                    services: vec![
                        Service {
                            name: "service-one".to_string(),
                            port: 3000,
                            enabled: true,
                            docker: Some(crate::backend::project::DockerConfig {
                                dockerfile: Some("Dockerfile".to_string()),
                            }),
                            k8s: Some(crate::backend::project::K8sConfig {
                                manifests: Some("k8s".to_string()),
                            }),
                            helm: None,
                            kustomize: None,
                            repo: None,
                            path: None,
                            depends_on: None,
                            env: Some(HashMap::from([
                                ("PORT".to_string(), "3000".to_string()),
                                ("ENV".to_string(), "dev".to_string()),
                            ])),
                        },
                        Service {
                            name: "service-two".to_string(),
                            port: 4000,
                            enabled: true,
                            docker: Some(crate::backend::project::DockerConfig {
                                dockerfile: Some("Dockerfile".to_string()),
                            }),
                            k8s: None,
                            helm: None,
                            kustomize: None,
                            repo: None,
                            path: None,
                            depends_on: Some(vec!["service-one".to_string()]),
                            env: None,
                        },
                    ],
                    shared_env: HashMap::new(),
                },
            )]),
        };

        (project, temp_dir)
    }

    #[test]
    fn test_render_template() {
        let template = "Hello {{NAME}}, your age is {{AGE}}!";
        let replacements = [("{{NAME}}", "Alice"), ("{{AGE}}", "30")];

        let result = render_template(template, &replacements);

        assert_eq!(result, "Hello Alice, your age is 30!");
    }

    #[test]
    fn test_render_template_multiple_occurrences() {
        let template = "{{VAR}} is {{VAR}} is {{VAR}}";
        let replacements = [("{{VAR}}", "test")];

        let result = render_template(template, &replacements);

        assert_eq!(result, "test is test is test");
    }

    #[test]
    fn test_generate_tiltfiles_creates_directories() {
        let (project, _temp_dir) = create_test_project();

        let result = generate_tiltfiles(&project, "dev");

        assert!(result.is_ok());

        let tilt_dir = format!("{}/tilt/dev", project.project.workspace_path);
        assert!(std::path::Path::new(&tilt_dir).exists());

        let services_dir = format!("{}/services", tilt_dir);
        assert!(std::path::Path::new(&services_dir).exists());
    }

    #[test]
    fn test_generate_tiltfiles_creates_root_tiltfile() {
        let (project, _temp_dir) = create_test_project();

        generate_tiltfiles(&project, "dev").unwrap();

        let root_tiltfile = format!(
            "{}/tilt/dev/Tiltfile",
            project.project.workspace_path
        );
        assert!(std::path::Path::new(&root_tiltfile).exists());

        let content = fs::read_to_string(&root_tiltfile).unwrap();
        assert!(content.contains("# GENERATED — DO NOT EDIT"));
        assert!(content.contains("# Environment: dev"));
        assert!(content.contains("load(\"./services/service-one.tilt.py\""));
        assert!(content.contains("load(\"./services/service-two.tilt.py\""));
    }

    #[test]
    fn test_generate_tiltfiles_creates_service_tiltfiles() {
        let (project, _temp_dir) = create_test_project();

        generate_tiltfiles(&project, "dev").unwrap();

        let service_one_tiltfile = format!(
            "{}/tilt/dev/services/service-one.tilt.py",
            project.project.workspace_path
        );
        assert!(std::path::Path::new(&service_one_tiltfile).exists());

        let content = fs::read_to_string(&service_one_tiltfile).unwrap();
        assert!(content.contains("def service_one():"));
        assert!(content.contains("docker_build"));
        assert!(content.contains("k8s_yaml"));
        assert!(content.contains("k8s_resource"));
    }

    #[test]
    fn test_generate_tiltfiles_handles_dependencies() {
        let (project, _temp_dir) = create_test_project();

        generate_tiltfiles(&project, "dev").unwrap();

        let service_two_tiltfile = format!(
            "{}/tilt/dev/services/service-two.tilt.py",
            project.project.workspace_path
        );
        let content = fs::read_to_string(&service_two_tiltfile).unwrap();
        
        assert!(content.contains("resource_deps"));
        assert!(content.contains("service-one"));
    }

    #[test]
    fn test_generate_tiltfiles_nonexistent_environment() {
        let (project, _temp_dir) = create_test_project();

        let result = generate_tiltfiles(&project, "nonexistent");

        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Environment nonexistent not found"));
    }

    #[test]
    fn test_generate_service_files_creates_env_file() {
        let (project, _temp_dir) = create_test_project();
        let env_config = project.environments.get("dev").unwrap();
        let service = &env_config.services[0];

        // Create service directory
        let service_path = format!(
            "{}/repos/{}",
            project.project.workspace_path,
            service.name
        );
        fs::create_dir_all(&service_path).unwrap();

        generate_service_files(
            &project.project.workspace_path,
            "repos",
            "dev",
            service,
            &HashMap::new(),
        )
        .unwrap();

        let env_file = format!("{}/.env.dev", service_path);
        assert!(std::path::Path::new(&env_file).exists());

        let content = fs::read_to_string(&env_file).unwrap();
        assert!(content.contains("PORT=3000"));
        assert!(content.contains("ENV=dev"));
    }

    #[test]
    fn test_generate_k8s_deployment_with_resources() {
        let (project, _temp_dir) = create_test_project();
        let env_config = project.environments.get("dev").unwrap();
        let service = &env_config.services[0];

        // Create k8s directory
        let k8s_path = format!(
            "{}/repos/{}/k8s",
            project.project.workspace_path,
            service.name
        );
        fs::create_dir_all(&k8s_path).unwrap();

        generate_k8s_deployment(
            &k8s_path,
            service,
            &service.env.as_ref().unwrap().clone(),
        )
        .unwrap();

        let deployment_file = format!("{}/deployment.yaml", k8s_path);
        let content = fs::read_to_string(&deployment_file).unwrap();

        // Check for resource limits and requests
        assert!(content.contains("resources:"));
        assert!(content.contains("requests:"));
        assert!(content.contains("memory: \"128Mi\""));
        assert!(content.contains("cpu: \"100m\""));
        assert!(content.contains("limits:"));
        assert!(content.contains("memory: \"256Mi\""));
        assert!(content.contains("cpu: \"500m\""));

        // Check for ConfigMap
        assert!(content.contains("kind: ConfigMap"));
        assert!(content.contains("service-one-config"));

        // Check for Deployment
        assert!(content.contains("kind: Deployment"));
        assert!(content.contains("replicas: 1"));

        // Check for Service
        assert!(content.contains("kind: Service"));
        assert!(content.contains("type: ClusterIP"));
    }

    #[test]
    fn test_service_name_with_hyphens() {
        let (mut project, _temp_dir) = create_test_project();
        
        // Update service name to have hyphens
        if let Some(env) = project.environments.get_mut("dev") {
            env.services[0].name = "my-test-service".to_string();
        }

        generate_tiltfiles(&project, "dev").unwrap();

        let service_tiltfile = format!(
            "{}/tilt/dev/services/my-test-service.tilt.py",
            project.project.workspace_path
        );
        let content = fs::read_to_string(&service_tiltfile).unwrap();

        // Function name should use underscores
        assert!(content.contains("def my_test_service():"));
        
        // But k8s_resource should use the actual service name with hyphens
        assert!(content.contains("k8s_resource(\n        \"my-test-service\""));
    }

    #[test]
    fn test_generate_env_file_merges_shared_env() {
        let (project, _temp_dir) = create_test_project();
        let service_path = format!(
            "{}/repos/service-one",
            project.project.workspace_path
        );
        fs::create_dir_all(&service_path).unwrap();

        let service_env = HashMap::from([
            ("SERVICE_VAR".to_string(), "service_value".to_string()),
        ]);
        let shared_env = HashMap::from([
            ("SHARED_VAR".to_string(), "shared_value".to_string()),
        ]);

        generate_env_file(&service_path, "dev", &service_env, &shared_env).unwrap();

        let env_file = format!("{}/.env.dev", service_path);
        let content = fs::read_to_string(&env_file).unwrap();

        assert!(content.contains("SERVICE_VAR=service_value"));
        assert!(content.contains("SHARED_VAR=shared_value"));
    }
}
