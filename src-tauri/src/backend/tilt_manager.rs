use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

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
fn check_tilt_process_running(pid: Option<u32>) -> bool {
    if let Some(pid_val) = pid {
        // Check if process exists by trying to send signal 0
        #[cfg(unix)]
        {
            use std::process::Command;
            Command::new("kill")
                .args(&["-0", &pid_val.to_string()])
                .output()
                .map(|output| output.status.success())
                .unwrap_or(false)
        }
        #[cfg(not(unix))]
        {
            // On Windows, just assume it's running if we have a PID
            true
        }
    } else {
        false
    }
}

/// Reconcile Tilt state periodically
pub fn reconcile_tilt_state(workspace: &str, env: &str) -> io::Result<TitleStatus> {
    let mut state = read_state(workspace, env);
    let tilt_running = check_tilt_process_running(state.tilt.pid);
    let status = if tilt_running { "running" } else { "stopped" }.to_string();

    if state.tilt.status != status {
        state.tilt.status = status.clone();
        write_state(workspace, env, &state)?;
    }

    Ok(TitleStatus { status: status })
}

/// Start Tilt for the given workspace/env
pub fn start_tilt(workspace: &str, env: &str) -> io::Result<()> {
    let state = read_state(workspace, env);
    if state.tilt.status == "running" {
        return Ok(());
    }

    let tiltfile = Path::new(workspace).join("tilt").join(env).join("Tiltfile");
    let log_file_path = log_path(workspace, env);

    // Create log file
    let log_file = File::create(&log_file_path)?;

    let child = Command::new("tilt")
        .args(&["up", "-f"])
        .arg(tiltfile)
        .current_dir(workspace)
        .stdin(Stdio::null())
        .stdout(log_file.try_clone()?)
        .stderr(log_file)
        .spawn()?;

    let pid = child.id();

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
pub fn stop_tilt(workspace: &str, env: &str) -> io::Result<()> {
    let state = read_state(workspace, env);

    if let Some(pid) = state.tilt.pid {
        // Kill the process
        #[cfg(unix)]
        {
            Command::new("kill").arg(pid.to_string()).output()?;
        }
        #[cfg(not(unix))]
        {
            Command::new("taskkill")
                .args(&["/F", "/PID", &pid.to_string()])
                .output()?;
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
pub fn restart_tilt(workspace: &str, env: &str) -> io::Result<()> {
    let _ = stop_tilt(&workspace, &env)?;

    let _ = start_tilt(&workspace, &env)?;

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
