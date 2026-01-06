use std::collections::HashMap;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::process::Command;
use chrono::Local;

// mod backend;
pub mod paths;
pub mod store;

use crate::backend::errors::AppError;
use crate::backend::generator::generate_tiltfiles;
use crate::backend::git::clone_repo;
use crate::backend::project::{Environment, Project, ProjectInfo, Service, Tilt, TiltMode};
use crate::project::paths::*;
use crate::project::store::{assert_service_path, read_json, rename_project, write_json};

pub fn __create_project(info: ProjectInfo) -> Result<(), AppError> {
    let root = project_root(&info.workspace_path, &info.name);

    write_json(
        &project_file(&root),
        &Project {
            project: info,
            environments: HashMap::new(), // not persisted
        },
    )?;

    let dev = Environment {
        shared_env: HashMap::new(),
        services: vec![],
    };

    write_json(&env_file(&root, "dev"), &dev)?;
    Ok(())
}

/// Create a new project workspace
pub fn create_project(
    name: &str,
    workspace_path: &str,
    services_path: Option<&str>,
) -> Result<Project, AppError> {
    let project_path = project_root(workspace_path, name);
    let services_path = services_path.unwrap_or("repos");
    // let project_path = std::path::PathBuf::from(workspace_path).join(name);
    let dirs = [services_path, "tilt", ".tooling"];

    for dir in dirs.iter() {
        fs::create_dir_all(project_path.join(dir))?;
    }

    let mut environments = HashMap::new();
    environments.insert(
        "dev".to_string(),
        Environment {
            shared_env: HashMap::new(),
            services: Vec::new(),
        },
    );
    environments.insert(
        "staging".to_string(),
        Environment {
            shared_env: HashMap::new(),
            services: Vec::new(),
        },
    );
    environments.insert(
        "prod".to_string(),
        Environment {
            shared_env: HashMap::new(),
            services: Vec::new(),
        },
    );

    let project = Project {
        project: ProjectInfo {
            name: name.to_string(),
            workspace_path: project_path.to_string_lossy().to_string(),
            tilt: Tilt {
                mode: TiltMode::Root,
            },
            services_path: Some(services_path.to_string()),
        },
        environments,
    };

    write_json(&project_file(&project_path), &project)?;

    for (key, environment) in project.environments.iter() {
        write_json(&env_file(&project_path, key), &environment)?;

        // Clone repositories and create service directories for each service
        for service in environment.services.iter() {
            let service_dir = project_path.join(services_path).join(&service.name);

            // Create service directory
            fs::create_dir_all(&service_dir)?;

            // Clone repository if configured
            if let Some(repo) = &service.repo {
                let rt = tokio::runtime::Runtime::new()
                    .map_err(|e| AppError::Io(io::Error::other(e.to_string())))?;

                rt.block_on(async {
                    clone_repo(
                        &repo.url,
                        service_dir.to_str().unwrap(),
                        repo.branch.as_deref(),
                    )
                    .await
                })
                .map_err(AppError::Io)?;
            }
        }

        // Generate tiltfiles after setting up services
        let _ = generate_tiltfiles(&project, key);
    }

    Ok(project)
}

pub fn update_project(workspace_path: &str, project: &Project) -> Result<Project, AppError> {
    let p: Project = read_json(&project_file(workspace_path.as_ref()))?;

    let project_name_old: String = p.project.name.to_string();
    let is_name_changed: bool = project_name_old != project.project.name;
    let mut project_path: String = workspace_path.to_string();

    if is_name_changed {
        let old_root = Path::new(workspace_path);

        if let Some(parent) = old_root.parent() {
            let new_root = project_root(parent.to_str().unwrap_or(""), &project.project.name);

            rename_project(old_root, &new_root, &project.project.name)?;

            project_path = new_root.to_string_lossy().to_string();
        }
    }

    write_json(&project_file(Path::new(&project_path)), &project)?;

    let services_path = project.project.services_path.as_deref().unwrap_or("repos");

    for (key, environment) in project.environments.iter() {
        // Get old environment to compare services
        let old_env: Environment =
            read_json(&env_file(Path::new(&project_path), key)).unwrap_or(Environment {
                shared_env: HashMap::new(),
                services: vec![],
            });

        // Find new services (not in old environment)
        let old_service_names: Vec<String> =
            old_env.services.iter().map(|s| s.name.clone()).collect();
        let new_services: Vec<&Service> = environment
            .services
            .iter()
            .filter(|s| !old_service_names.contains(&s.name))
            .collect();

        // Write environment
        write_json(&env_file(Path::new(&project_path), key), &environment)?;

        // Generate tiltfiles
        let _ = generate_tiltfiles(project, key);

        // Process all services
        let env_services: Vec<Service> = environment.services.clone();

        for service in env_services.iter() {
            let service_dir = Path::new(&project_path)
                .join(services_path)
                .join(&service.name);

            // Create service directory if it doesn't exist
            if !service_dir.exists() {
                fs::create_dir_all(&service_dir)?;
            }

            // Clone repository for new services if configured
            if new_services.iter().any(|s| s.name == service.name) {
                if let Some(repo) = &service.repo {
                    // Only clone if directory is empty
                    if service_dir
                        .read_dir()
                        .map(|mut i| i.next().is_none())
                        .unwrap_or(true)
                    {
                        let rt = tokio::runtime::Runtime::new()
                            .map_err(|e| AppError::Io(io::Error::other(e.to_string())))?;

                        rt.block_on(async {
                            clone_repo(
                                &repo.url,
                                service_dir.to_str().unwrap(),
                                repo.branch.as_deref(),
                            )
                            .await
                        })
                        .map_err(AppError::Io)?;
                    }
                }
            }

            // Ensure custom path exists if specified
            if let Some(path) = &service.path {
                assert_service_path(Path::new(path))?;
            }
        }
    }

    Ok(project.clone())
}

/// Open a repository in the user’s editor (default VSCode)
pub fn open_in_editor(
    workspace: &Path,
    repo_name: &str,
    editor: Option<&str>,
    services_path: Option<&str>,
) -> io::Result<()> {
    let editor = editor.unwrap_or("code");
    let services_path = services_path.unwrap_or("repos");
    let repo_path = workspace.join(services_path).join(repo_name);

    if !repo_path.exists() {
        return Err(io::Error::new(
            io::ErrorKind::NotFound,
            format!("Repo {} does not exist at {:?}", repo_name, repo_path),
        ));
    }

    let status = Command::new(editor).arg(repo_path).status();

    match status {
        Ok(s) if s.success() => Ok(()),
        Ok(s) => {
            eprintln!("Failed to open editor: exited with status {}", s);
            Ok(())
        }
        Err(e) => {
            eprintln!("Failed to open editor: {}", e);
            Ok(())
        }
    }
}

// pub fn __load_project_info(root: &str) -> Result<ProjectInfo, AppError> {
//     let p: Project = read_json(&project_file(root.as_ref()))?;
//     Ok(p.project)
// }

pub fn load_project_info(root: &str) -> Result<Project, AppError> {
    let p: Project = read_json(&project_file(root.as_ref()))?;
    Ok(p)
}

/// Check if a directory is a valid Tilt Orchestrator project
pub fn is_valid_project(path: &str) -> bool {
    let project_path = Path::new(path);
    project_file(project_path).exists()
}

/// Create a timestamped backup path that doesn't overwrite existing backups
fn create_timestamped_backup_path(original_path: &Path) -> PathBuf {
    let timestamp = Local::now().format("%Y%m%d_%H%M%S");
    let parent = original_path.parent().unwrap_or(Path::new("."));
    let name = original_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("untitled");
    parent.join(format!("{}.backup.{}", name, timestamp))
}

/// Initialize an existing directory as a Tilt Orchestrator project
pub fn initialize_existing_project(path: &str, services_path: &str) -> Result<Project, AppError> {
    let project_path = Path::new(path);

    // Extract project name from directory name
    let name = project_path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| {
            AppError::Io(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Invalid project path",
            ))
        })?;

    // Backup existing Tiltfile if it exists
    let existing_tiltfile = project_path.join("Tiltfile");
    if existing_tiltfile.exists() {
        let backup_path = create_timestamped_backup_path(&existing_tiltfile);
        fs::rename(&existing_tiltfile, &backup_path)?;
    }

    // Backup existing tilt directory if it exists
    let existing_tilt_dir = project_path.join("tilt");
    if existing_tilt_dir.exists() && !project_path.join("project.json").exists() {
        let backup_path = create_timestamped_backup_path(&existing_tilt_dir);
        fs::rename(&existing_tilt_dir, &backup_path)?;
    }

    // Create necessary directories
    let dirs = [services_path, "tilt", ".tooling"];
    for dir in dirs.iter() {
        fs::create_dir_all(project_path.join(dir))?;
    }

    // Create environments directory
    fs::create_dir_all(project_path.join("environments"))?;

    // Create default environments
    let mut environments = HashMap::new();
    for env_name in ["dev", "staging", "prod"] {
        environments.insert(
            env_name.to_string(),
            Environment {
                shared_env: HashMap::new(),
                services: Vec::new(),
            },
        );
        write_json(&env_file(project_path, env_name), &environments[env_name])?;
    }

    let project = Project {
        project: ProjectInfo {
            name: name.to_string(),
            workspace_path: project_path.to_string_lossy().to_string(),
            tilt: Tilt {
                mode: TiltMode::Root,
            },
            services_path: Some(services_path.to_string()),
        },
        environments,
    };

    write_json(&project_file(project_path), &project)?;

    // Generate Tiltfiles for all environments
    for env_name in ["dev", "staging", "prod"] {
        generate_tiltfiles(&project, env_name).map_err(|e| std::io::Error::other(e.to_string()))?;
    }

    Ok(project)
}

/// Update a specific service in an environment
pub fn update_service(
    workspace_path: &str,
    env: &str,
    service_name: &str,
    updated_service: Service,
) -> Result<Project, AppError> {
    let project_path = Path::new(workspace_path);
    let mut project: Project = read_json(&project_file(project_path))?;

    // Get the environment
    let environment = project.environments.get_mut(env).ok_or_else(|| {
        AppError::Io(io::Error::new(
            io::ErrorKind::NotFound,
            format!("Environment {} not found", env),
        ))
    })?;

    // Find and update the service
    let service_index = environment
        .services
        .iter()
        .position(|s| s.name == service_name)
        .ok_or_else(|| {
            AppError::Io(io::Error::new(
                io::ErrorKind::NotFound,
                format!("Service {} not found in environment {}", service_name, env),
            ))
        })?;

    environment.services[service_index] = updated_service.clone();

    // Write updated environment back to disk
    write_json(&env_file(project_path, env), environment)?;

    // Regenerate Tiltfiles for this environment
    let _ = generate_tiltfiles(&project, env);

    Ok(project)
}

// pub fn load_environment(root: &str, env: &str) -> Result<Environment, AppError> {
//     read_json(&env_file(root.as_ref(), env))
// }

// pub fn save_environment(root: &str, env_name: &str, env: &Environment) -> Result<(), AppError> {
//     write_json(&env_file(root.as_ref(), env_name), env)
// }
