use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use tauri_plugin_shell::{process::CommandEvent, ShellExt};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TiltInstallation {
    pub installed: bool,
    pub path: Option<String>,
    pub version: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TiltState {
    pub status: String,
    pub pid: Option<u32>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct State {
    pub tilt: TiltState,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TitleStatus {
    pub status: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TiltLog {
    pub logs: Vec<String>,
}

fn runtime_path(workspace: &str, env: &str) -> PathBuf {
    Path::new(workspace)
        .join(".tooling")
        .join(format!("{}_runtime.json", env))
}

fn log_path(workspace: &str, env: &str) -> PathBuf {
    Path::new(workspace)
        .join(".tooling")
        .join(format!("{}_tilt.log", env))
}

/// Validate an executable path by checking its version
pub async fn validate_executable_path(
    app_handle: &tauri::AppHandle,
    path: &str,
    args: Option<&str>,
) -> io::Result<String> {
    let version_result = app_handle
        .shell()
        .command(path)
        .args([args.unwrap_or("--version")])
        .output()
        .await;

    match version_result {
        Ok(output) => {
            if output.status.success() {
                // Try stdout first, then stderr (some tools output version to stderr)
                let stdout_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
                let version = if !stdout_str.is_empty() {
                    stdout_str
                } else {
                    String::from_utf8_lossy(&output.stderr).trim().to_string()
                };

                if version.is_empty() {
                    Err(io::Error::other("Failed to get version from executable"))
                } else {
                    Ok(version)
                }
            } else {
                Err(io::Error::other("Failed to get version from executable"))
            }
        }
        Err(e) => Err(io::Error::new(
            io::ErrorKind::NotFound,
            format!("Executable not found or not accessible: {}", e),
        )),
    }
}

/// Check if Tilt is installed and return its path
pub async fn check_tilt_installed(app_handle: &tauri::AppHandle) -> io::Result<TiltInstallation> {
    #[cfg(unix)]
    let which_cmd = "which";
    #[cfg(not(unix))]
    let which_cmd = "where";

    let result = app_handle
        .shell()
        .command(which_cmd)
        .args(["tilt"])
        .output()
        .await;

    match result {
        Ok(output) => {
            if output.status.success() {
                let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
                let tilt_path = path_str.lines().next().unwrap_or("").to_string();

                if tilt_path.is_empty() {
                    return Ok(TiltInstallation {
                        installed: false,
                        path: None,
                        version: None,
                    });
                }

                // Try to get version
                let version_result = app_handle
                    .shell()
                    .command(&tilt_path)
                    .args(["--version"])
                    .output()
                    .await;

                let version = if let Ok(ver_output) = version_result {
                    if ver_output.status.success() {
                        // Try stdout first, then stderr
                        let stdout_str = String::from_utf8_lossy(&ver_output.stdout)
                            .trim()
                            .to_string();
                        let version_str = if !stdout_str.is_empty() {
                            stdout_str
                        } else {
                            String::from_utf8_lossy(&ver_output.stderr)
                                .trim()
                                .to_string()
                        };

                        if !version_str.is_empty() {
                            Some(version_str)
                        } else {
                            None
                        }
                    } else {
                        None
                    }
                } else {
                    None
                };

                Ok(TiltInstallation {
                    installed: true,
                    path: Some(tilt_path),
                    version,
                })
            } else {
                Ok(TiltInstallation {
                    installed: false,
                    path: None,
                    version: None,
                })
            }
        }
        Err(_) => Ok(TiltInstallation {
            installed: false,
            path: None,
            version: None,
        }),
    }
}

/// Write runtime state to file
fn write_state(workspace: &str, env: &str, state: &State) -> io::Result<()> {
    let tooling_dir = Path::new(workspace).join(".tooling");
    fs::create_dir_all(&tooling_dir)?;
    let path = runtime_path(workspace, env);
    let json = serde_json::to_string_pretty(state)?;
    fs::write(path, json)?;
    Ok(())
}

/// Read runtime state (public for IPC)
pub fn read_state(workspace: &str, env: &str) -> State {
    let path = runtime_path(workspace, env);
    let content = fs::read_to_string(path);
    match content {
        Ok(data) => serde_json::from_str(&data).unwrap_or(State {
            tilt: TiltState {
                status: "stopped".to_string(),
                pid: None,
            },
        }),
        Err(_) => State {
            tilt: TiltState {
                status: "stopped".to_string(),
                pid: None,
            },
        },
    }
}

/// Check if a Tilt process is still alive
async fn check_tilt_process_running(pid: Option<u32>, app_handle: &tauri::AppHandle) -> bool {
    if let Some(pid_val) = pid {
        #[cfg(unix)]
        {
            let result = app_handle
                .shell()
                .command("kill")
                .args(["-0", &pid_val.to_string()])
                .status()
                .await;
            result.map(|status| status.success()).unwrap_or(false)
        }
        #[cfg(not(unix))]
        {
            println!("{}", pid_val);
            // On Windows, check if process exists
            let result = app_handle
                .shell()
                .command("tasklist")
                .args(["/FI", &format!("PID eq {}", pid_val)])
                .output()
                .await;
            result
                .map(|output| {
                    String::from_utf8_lossy(&output.stdout).contains(&pid_val.to_string())
                })
                .unwrap_or(false)
        }
    } else {
        false
    }
}

/// Reconcile Tilt state periodically
pub async fn reconcile_tilt_state(
    workspace: &str,
    env: &str,
    app_handle: &tauri::AppHandle,
) -> io::Result<TitleStatus> {
    let mut state = read_state(workspace, env);
    let tilt_running = check_tilt_process_running(state.tilt.pid, app_handle).await;
    let status = if tilt_running { "running" } else { "stopped" }.to_string();

    if state.tilt.status != status {
        state.tilt.status = status.clone();
        write_state(workspace, env, &state)?;
    }

    Ok(TitleStatus { status })
}

/// Start Tilt for the given workspace/env
pub async fn start_tilt(
    workspace: &str,
    env: &str,
    app_handle: &tauri::AppHandle,
    tilt_path_override: Option<&str>,
) -> io::Result<()> {
    let state = read_state(workspace, env);
    if state.tilt.status == "running" {
        return Ok(());
    }

    // Use provided tilt path or check if tilt is installed
    let tilt_path = if let Some(path) = tilt_path_override {
        // Validate the provided path
        validate_executable_path(app_handle, path, Some("version")).await?;
        path.to_string()
    } else {
        let tilt_installation = check_tilt_installed(app_handle).await?;
        if !tilt_installation.installed {
            return Err(io::Error::new(
                io::ErrorKind::NotFound,
                "Tilt is not installed. Please configure Tilt path in Settings or install Tilt from https://docs.tilt.dev/install.html",
            ));
        }
        tilt_installation.path.unwrap_or_else(|| "tilt".to_string())
    };
    let tiltfile = Path::new(workspace).join("tilt").join(env).join("Tiltfile");
    let log_file_path = log_path(workspace, env);

    // Create log file
    let _log_file = File::create(&log_file_path)?;

    let (mut rx, child) = app_handle
        .shell()
        .command(&tilt_path)
        .args([
            "up",
            "-f",
            tiltfile.to_str().ok_or_else(|| {
                io::Error::new(io::ErrorKind::InvalidInput, "Invalid Tiltfile path")
            })?,
        ])
        .current_dir(workspace)
        .spawn()
        .map_err(|e| io::Error::other(e.to_string()))?;

    let pid = child.pid();

    // Spawn a task to capture output and write to log file
    let log_file_path_clone = log_file_path.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            let mut file = match std::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(&log_file_path_clone)
            {
                Ok(f) => f,
                Err(_) => continue,
            };

            match event {
                CommandEvent::Stdout(line) => {
                    let _ = writeln!(file, "{}", String::from_utf8_lossy(&line));
                }
                CommandEvent::Stderr(line) => {
                    let _ = writeln!(file, "{}", String::from_utf8_lossy(&line));
                }
                CommandEvent::Terminated(_) => break,
                _ => {}
            }
        }
    });

    write_state(
        workspace,
        env,
        &State {
            tilt: TiltState {
                status: "starting".to_string(),
                pid: Some(pid),
            },
        },
    )?;

    Ok(())
}

/// Stop Tilt for the given workspace/env
pub async fn stop_tilt(
    workspace: &str,
    env: &str,
    app_handle: &tauri::AppHandle,
) -> io::Result<()> {
    let state = read_state(workspace, env);

    if let Some(pid) = state.tilt.pid {
        // Kill the process
        #[cfg(unix)]
        {
            app_handle
                .shell()
                .command("kill")
                .args([pid.to_string()])
                .status()
                .await
                .map_err(|e| io::Error::other(e.to_string()))?;
        }
        #[cfg(not(unix))]
        {
            app_handle
                .shell()
                .command("taskkill")
                .args(["/F", "/PID", &pid.to_string()])
                .status()
                .await
                .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
        }

        write_state(
            workspace,
            env,
            &State {
                tilt: TiltState {
                    status: "stopped".to_string(),
                    pid: None,
                },
            },
        )?;
    }

    Ok(())
}

/// Restart Tilt for the given workspace/env
pub async fn restart_tilt(
    workspace: &str,
    env: &str,
    app_handle: &tauri::AppHandle,
    tilt_path_override: Option<&str>,
) -> io::Result<()> {
    stop_tilt(workspace, env, app_handle).await?;

    start_tilt(workspace, env, app_handle, tilt_path_override).await?;

    Ok(())
}

/// Get Tilt logs for the given workspace/env
pub fn get_tilt_logs(workspace: &str, env: &str, lines: Option<usize>) -> io::Result<TiltLog> {
    let log_file_path = log_path(workspace, env);

    if !log_file_path.exists() {
        return Ok(TiltLog { logs: Vec::new() });
    }

    let content = fs::read_to_string(log_file_path)?;

    if let Some(n) = lines {
        // Return last n lines
        // let all_lines: Vec<String> = content.lines().collect();
        let all_lines: Vec<String> = content.lines().map(String::from).collect();
        let start = all_lines.len().saturating_sub(n);
        Ok(TiltLog {
            logs: all_lines[start..].to_vec(),
        })
    } else {
        Ok(TiltLog {
            logs: vec![content],
        })
    }
}
