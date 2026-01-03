#[cfg(test)]
mod tests {
    use super::super::project_manager::*;
    use crate::backend::project::{Project, Service};
    use std::collections::HashMap;
    use tempfile::TempDir;

    #[test]
    fn test_create_project_basic() {
        let temp_dir = TempDir::new().unwrap();
        let workspace_path = temp_dir.path().to_str().unwrap();

        let result = create_project("test-project", workspace_path, "repos");

        assert!(result.is_ok());
        let project = result.unwrap();
        
        assert_eq!(project.project.name, "test-project");
        assert_eq!(project.project.workspace_path, workspace_path);
        assert_eq!(project.project.services_path, Some("repos".to_string()));
        assert_eq!(project.project.tilt.mode, "local");
    }

    #[test]
    fn test_create_project_creates_default_environments() {
        let temp_dir = TempDir::new().unwrap();
        let workspace_path = temp_dir.path().to_str().unwrap();

        let project = create_project("test-project", workspace_path, "repos").unwrap();

        assert!(project.environments.contains_key("dev"));
        assert!(project.environments.contains_key("staging"));
        assert!(project.environments.contains_key("prod"));
    }

    #[test]
    fn test_create_project_creates_file() {
        let temp_dir = TempDir::new().unwrap();
        let workspace_path = temp_dir.path().to_str().unwrap();

        create_project("test-project", workspace_path, "repos").unwrap();

        let project_file = format!("{}/.tilt/project.json", workspace_path);
        assert!(std::path::Path::new(&project_file).exists());
    }

    #[test]
    fn test_open_project() {
        let temp_dir = TempDir::new().unwrap();
        let workspace_path = temp_dir.path().to_str().unwrap();

        // Create a project first
        create_project("test-project", workspace_path, "repos").unwrap();

        // Open the project
        let result = open_project(workspace_path);

        assert!(result.is_ok());
        let project = result.unwrap();
        assert_eq!(project.project.name, "test-project");
    }

    #[test]
    fn test_open_project_nonexistent() {
        let temp_dir = TempDir::new().unwrap();
        let workspace_path = temp_dir.path().to_str().unwrap();

        let result = open_project(workspace_path);

        assert!(result.is_err());
    }

    #[test]
    fn test_update_project() {
        let temp_dir = TempDir::new().unwrap();
        let workspace_path = temp_dir.path().to_str().unwrap();

        // Create initial project
        let mut project = create_project("test-project", workspace_path, "repos").unwrap();

        // Modify project
        project.project.name = "updated-project".to_string();

        // Update project
        let result = update_project(workspace_path, &project);

        assert!(result.is_ok());

        // Verify changes persisted
        let loaded_project = open_project(workspace_path).unwrap();
        assert_eq!(loaded_project.project.name, "updated-project");
    }

    #[test]
    fn test_add_environment() {
        let temp_dir = TempDir::new().unwrap();
        let workspace_path = temp_dir.path().to_str().unwrap();

        let mut project = create_project("test-project", workspace_path, "repos").unwrap();

        // Add new environment
        add_environment(&mut project, "qa");

        assert!(project.environments.contains_key("qa"));
        assert_eq!(project.environments.get("qa").unwrap().services.len(), 0);
    }

    #[test]
    fn test_add_service_to_environment() {
        let temp_dir = TempDir::new().unwrap();
        let workspace_path = temp_dir.path().to_str().unwrap();

        let mut project = create_project("test-project", workspace_path, "repos").unwrap();

        let service = Service {
            name: "test-service".to_string(),
            port: 3000,
            enabled: true,
            docker: Some(crate::backend::project::DockerConfig {
                dockerfile: Some("Dockerfile".to_string()),
            }),
            k8s: None,
            helm: None,
            kustomize: None,
            repo: None,
            path: None,
            depends_on: None,
            env: None,
        };

        let result = add_service(&mut project, "dev", service.clone());

        assert!(result.is_ok());
        
        let env = project.environments.get("dev").unwrap();
        assert_eq!(env.services.len(), 1);
        assert_eq!(env.services[0].name, "test-service");
    }

    #[test]
    fn test_add_service_to_nonexistent_environment() {
        let temp_dir = TempDir::new().unwrap();
        let workspace_path = temp_dir.path().to_str().unwrap();

        let mut project = create_project("test-project", workspace_path, "repos").unwrap();

        let service = Service {
            name: "test-service".to_string(),
            port: 3000,
            enabled: true,
            docker: None,
            k8s: None,
            helm: None,
            kustomize: None,
            repo: None,
            path: None,
            depends_on: None,
            env: None,
        };

        let result = add_service(&mut project, "nonexistent", service);

        assert!(result.is_err());
    }

    #[test]
    fn test_update_service() {
        let temp_dir = TempDir::new().unwrap();
        let workspace_path = temp_dir.path().to_str().unwrap();

        // Create project with a service
        let mut project = create_project("test-project", workspace_path, "repos").unwrap();
        
        let service = Service {
            name: "test-service".to_string(),
            port: 3000,
            enabled: true,
            docker: None,
            k8s: None,
            helm: None,
            kustomize: None,
            repo: None,
            path: None,
            depends_on: None,
            env: None,
        };

        add_service(&mut project, "dev", service).unwrap();

        // Update the service
        let updated_service = Service {
            name: "test-service".to_string(),
            port: 4000, // Changed port
            enabled: false, // Changed enabled status
            docker: None,
            k8s: None,
            helm: None,
            kustomize: None,
            repo: None,
            path: None,
            depends_on: None,
            env: Some(HashMap::from([
                ("NEW_VAR".to_string(), "value".to_string()),
            ])),
        };

        let result = update_service(workspace_path, "dev", "test-service", updated_service);

        assert!(result.is_ok());

        // Verify changes
        let loaded_project = open_project(workspace_path).unwrap();
        let env = loaded_project.environments.get("dev").unwrap();
        let service = env.services.iter().find(|s| s.name == "test-service").unwrap();
        
        assert_eq!(service.port, 4000);
        assert_eq!(service.enabled, false);
        assert!(service.env.is_some());
    }

    #[test]
    fn test_update_nonexistent_service() {
        let temp_dir = TempDir::new().unwrap();
        let workspace_path = temp_dir.path().to_str().unwrap();

        let project = create_project("test-project", workspace_path, "repos").unwrap();

        let service = Service {
            name: "nonexistent-service".to_string(),
            port: 3000,
            enabled: true,
            docker: None,
            k8s: None,
            helm: None,
            kustomize: None,
            repo: None,
            path: None,
            depends_on: None,
            env: None,
        };

        let result = update_service(workspace_path, "dev", "nonexistent-service", service);

        assert!(result.is_err());
    }

    #[test]
    fn test_remove_service() {
        let temp_dir = TempDir::new().unwrap();
        let workspace_path = temp_dir.path().to_str().unwrap();

        let mut project = create_project("test-project", workspace_path, "repos").unwrap();
        
        let service = Service {
            name: "test-service".to_string(),
            port: 3000,
            enabled: true,
            docker: None,
            k8s: None,
            helm: None,
            kustomize: None,
            repo: None,
            path: None,
            depends_on: None,
            env: None,
        };

        add_service(&mut project, "dev", service).unwrap();

        // Remove the service
        let result = remove_service(&mut project, "dev", "test-service");

        assert!(result.is_ok());
        
        let env = project.environments.get("dev").unwrap();
        assert_eq!(env.services.len(), 0);
    }

    #[test]
    fn test_set_shared_env() {
        let temp_dir = TempDir::new().unwrap();
        let workspace_path = temp_dir.path().to_str().unwrap();

        let mut project = create_project("test-project", workspace_path, "repos").unwrap();

        let shared_env = HashMap::from([
            ("API_URL".to_string(), "https://api.example.com".to_string()),
            ("LOG_LEVEL".to_string(), "info".to_string()),
        ]);

        let result = set_shared_env(&mut project, "dev", shared_env.clone());

        assert!(result.is_ok());
        
        let env = project.environments.get("dev").unwrap();
        assert_eq!(env.shared_env, shared_env);
    }
}
