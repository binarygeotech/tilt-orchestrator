use crate::backend::generator::{generate_tiltfiles, reorder_services};
use crate::backend::git::clone_repo;
use crate::backend::project::{Project, Service};
use crate::backend::tilt_manager::{
    get_tilt_logs, read_state, reconcile_tilt_state, restart_tilt, start_tilt, stop_tilt,
};
use crate::project::{
    create_project, load_project_info, open_in_editor, update_project, update_service,
};
use anyhow::Result;
use serde::Deserialize;

/// Central IPC command handler
pub async fn handle_ipc(command: &str, args: serde_json::Value) -> Result<serde_json::Value> {
    match command {
        "generateTiltfiles" => {
            #[derive(Deserialize)]
            struct Args {
                project: Project,
                env: String,
            }
            let args: Args = serde_json::from_value(args)?;
            generate_tiltfiles(&args.project, &args.env)?;
            Ok(serde_json::json!(null))
        }

        "startTilt" => {
            #[derive(Deserialize)]
            struct Args {
                project: Project,
                env: String,
            }
            let args: Args = serde_json::from_value(args)?;
            start_tilt(&args.project.project.workspace_path, &args.env)?;
            Ok(serde_json::json!(null))
        }

        "stopTilt" => {
            #[derive(Deserialize)]
            struct Args {
                project: Project,
                env: String,
            }
            let args: Args = serde_json::from_value(args)?;
            stop_tilt(&args.project.project.workspace_path, &args.env)?;
            Ok(serde_json::json!(null))
        }

        "restartTilt" => {
            #[derive(Deserialize)]
            struct Args {
                project: Project,
                env: String,
            }
            let args: Args = serde_json::from_value(args)?;
            restart_tilt(&args.project.project.workspace_path, &args.env)?;
            Ok(serde_json::json!(null))
        }

        "getTiltState" => {
            #[derive(Deserialize)]
            struct Args {
                project: Project,
                env: String,
            }
            let args: Args = serde_json::from_value(args)?;
            let state = read_state(&args.project.project.workspace_path, &args.env);
            Ok(serde_json::to_value(state)?)
        }

        "reconcileTiltState" => {
            #[derive(Deserialize)]
            struct Args {
                project: Project,
                env: String,
            }
            let args: Args = serde_json::from_value(args)?;
            let status = reconcile_tilt_state(&args.project.project.workspace_path, &args.env)?;
            Ok(serde_json::to_value(status)?)
        }

        "getTiltLogs" => {
            #[derive(Deserialize)]
            struct Args {
                project: Project,
                env: String,
                lines: Option<usize>,
            }
            let args: Args = serde_json::from_value(args)?;
            let logs = get_tilt_logs(&args.project.project.workspace_path, &args.env, args.lines)?;
            Ok(serde_json::to_value(logs)?)
        }

        "cloneRepo" => {
            #[derive(Deserialize)]
            struct Args {
                url: String,
                path: String,
                branch: Option<String>,
            }
            let args: Args = serde_json::from_value(args)?;
            clone_repo(&args.url, &args.path, args.branch.as_deref()).await?;
            Ok(serde_json::json!(null))
        }

        "createProject" => {
            #[derive(Deserialize)]
            struct Args {
                name: String,
                workspace_path: String,
                services_path: String,
            }
            let args: Args = serde_json::from_value(args)?;
            let project =
                create_project(&args.name, &args.workspace_path, Some(&args.services_path))
                    .map_err(|e| anyhow::anyhow!("Failed to create project: {}", e))?;
            Ok(serde_json::to_value(project)?)
        }

        "openProject" => {
            #[derive(Deserialize)]
            struct Args {
                workspace_path: String,
            }
            let args: Args = serde_json::from_value(args)?;
            let project = load_project_info(&args.workspace_path)
                .map_err(|e| anyhow::anyhow!("Failed to load project: {}", e))?;
            Ok(serde_json::to_value(project)?)
        }

        "updateProject" => {
            #[derive(Deserialize)]
            struct Args {
                workspace_path: String,
                project: Project,
            }
            let args: Args = serde_json::from_value(args)?;
            let project = update_project(&args.workspace_path, &args.project)
                .map_err(|e| anyhow::anyhow!("Failed to update project: {}", e))?;
            Ok(serde_json::to_value(project)?)
        }

        "updateService" => {
            #[derive(Deserialize)]
            struct Args {
                workspace_path: String,
                env: String,
                service_name: String,
                service: Service,
            }
            let args: Args = serde_json::from_value(args)?;
            let project = update_service(
                &args.workspace_path,
                &args.env,
                &args.service_name,
                args.service,
            )
            .map_err(|e| anyhow::anyhow!("Failed to update service: {}", e))?;
            Ok(serde_json::to_value(project)?)
        }

        "openInEditor" => {
            #[derive(Deserialize, Clone, Debug)]
            struct Args {
                project: Project,
                repo_name: String,
                editor: Option<String>,
            }
            let args: Args = serde_json::from_value(args)?;
            let services_path = args.project.project.services_path.as_deref();
            println!("{:?}", &args.clone());
            open_in_editor(
                std::path::Path::new(&args.project.project.workspace_path),
                &args.repo_name,
                args.editor.as_deref(),
                services_path,
            )?;
            Ok(serde_json::json!(null))
        }

        "reorderServices" => {
            #[derive(Deserialize)]
            struct Args {
                project: Project,
                env: String,
                new_order: Vec<String>,
            }
            let mut args: Args = serde_json::from_value(args)?;
            reorder_services(&mut args.project, &args.env, args.new_order)?;
            Ok(serde_json::to_value(args.project)?)
        }

        _ => Err(anyhow::anyhow!("Unknown IPC command: {}", command)),
    }
}
