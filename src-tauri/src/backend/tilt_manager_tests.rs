#[cfg(test)]
mod tests {
    use super::super::tilt_manager::*;
    use crate::backend::project::{Project, ProjectInfo, TiltConfig};
    use std::collections::HashMap;
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
            environments: HashMap::new(),
        };

        (project, temp_dir)
    }

    #[test]
    fn test_log_path_format() {
        let (project, _temp_dir) = create_test_project();
        let env_name = "dev";

        let log_path = log_path(&project, env_name);

        let expected = format!(
            "{}/.tooling/dev_tilt.log",
            project.project.workspace_path
        );
        assert_eq!(log_path, expected);
    }

    #[test]
    fn test_log_path_different_environments() {
        let (project, _temp_dir) = create_test_project();

        let dev_log = log_path(&project, "dev");
        let prod_log = log_path(&project, "prod");

        assert!(dev_log.contains("dev_tilt.log"));
        assert!(prod_log.contains("prod_tilt.log"));
        assert_ne!(dev_log, prod_log);
    }

    #[tokio::test]
    async fn test_get_tilt_logs_empty_file() {
        let (project, _temp_dir) = create_test_project();
        let env_name = "dev";

        // Create empty log file
        let log_file_path = log_path(&project, env_name);
        let log_dir = std::path::Path::new(&log_file_path).parent().unwrap();
        std::fs::create_dir_all(log_dir).unwrap();
        std::fs::write(&log_file_path, "").unwrap();

        let result = get_tilt_logs(&project, env_name, None).await;

        assert!(result.is_ok());
        let logs: TiltLog = serde_json::from_str(&result.unwrap()).unwrap();
        assert_eq!(logs.logs.len(), 0);
    }

    #[tokio::test]
    async fn test_get_tilt_logs_with_content() {
        let (project, _temp_dir) = create_test_project();
        let env_name = "dev";

        // Create log file with content
        let log_file_path = log_path(&project, env_name);
        let log_dir = std::path::Path::new(&log_file_path).parent().unwrap();
        std::fs::create_dir_all(log_dir).unwrap();
        std::fs::write(&log_file_path, "line 1\nline 2\nline 3\n").unwrap();

        let result = get_tilt_logs(&project, env_name, None).await;

        assert!(result.is_ok());
        let logs: TiltLog = serde_json::from_str(&result.unwrap()).unwrap();
        assert_eq!(logs.logs.len(), 3);
        assert_eq!(logs.logs[0], "line 1");
        assert_eq!(logs.logs[1], "line 2");
        assert_eq!(logs.logs[2], "line 3");
    }

    #[tokio::test]
    async fn test_get_tilt_logs_with_limit() {
        let (project, _temp_dir) = create_test_project();
        let env_name = "dev";

        // Create log file with many lines
        let log_file_path = log_path(&project, env_name);
        let log_dir = std::path::Path::new(&log_file_path).parent().unwrap();
        std::fs::create_dir_all(log_dir).unwrap();
        
        let mut content = String::new();
        for i in 1..=10 {
            content.push_str(&format!("line {}\n", i));
        }
        std::fs::write(&log_file_path, content).unwrap();

        // Request only last 5 lines
        let result = get_tilt_logs(&project, env_name, Some(5)).await;

        assert!(result.is_ok());
        let logs: TiltLog = serde_json::from_str(&result.unwrap()).unwrap();
        assert_eq!(logs.logs.len(), 5);
        assert_eq!(logs.logs[0], "line 6");
        assert_eq!(logs.logs[4], "line 10");
    }

    #[tokio::test]
    async fn test_get_tilt_logs_nonexistent_file() {
        let (project, _temp_dir) = create_test_project();
        let env_name = "nonexistent";

        let result = get_tilt_logs(&project, env_name, None).await;

        // Should return empty logs, not error
        assert!(result.is_ok());
        let logs: TiltLog = serde_json::from_str(&result.unwrap()).unwrap();
        assert_eq!(logs.logs.len(), 0);
    }

    #[test]
    fn test_tilt_status_serialization() {
        let status = TiltStatus {
            status: "running".to_string(),
        };

        let json = serde_json::to_string(&status).unwrap();
        assert!(json.contains("\"status\":\"running\""));

        let deserialized: TiltStatus = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.status, "running");
    }

    #[test]
    fn test_tilt_log_serialization() {
        let log = TiltLog {
            logs: vec!["log1".to_string(), "log2".to_string()],
        };

        let json = serde_json::to_string(&log).unwrap();
        assert!(json.contains("\"logs\""));
        assert!(json.contains("log1"));
        assert!(json.contains("log2"));

        let deserialized: TiltLog = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.logs.len(), 2);
    }
}
