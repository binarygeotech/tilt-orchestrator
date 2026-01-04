use super::model::AppState;
use crate::backend::errors::AppError;
use std::{fs, path::PathBuf};
use tauri::Manager;

fn state_file(app_handle: &tauri::AppHandle) -> Result<PathBuf, AppError> {
    let dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Invalid(format!("App data dir error: {}", e)))?;
    Ok(dir.join("state.json"))
}

pub fn load_state(app: &tauri::AppHandle) -> AppState {
    let path = match state_file(app) {
        Ok(p) => p,
        Err(_) => return AppState::default(),
    };

    fs::read_to_string(path)
        .ok()
        .and_then(|data| serde_json::from_str(&data).ok())
        .unwrap_or_default()
}

pub fn save_state(app: &tauri::AppHandle, state: &AppState) -> Result<(), AppError> {
    let path = state_file(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(path, serde_json::to_string_pretty(state)?)?;
    Ok(())
}
