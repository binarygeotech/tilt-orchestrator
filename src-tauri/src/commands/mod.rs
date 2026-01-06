use crate::app_state::model::{Preferences, RecentProject};
use crate::app_state::{add_recent_project, load_state, remove_recent_project, save_state};
use crate::backend::ipc::handle_ipc;
use tauri::command;

#[command]
pub fn get_app_state(app: tauri::AppHandle) -> crate::app_state::model::AppState {
    load_state(&app)
}

/// Get recent projects only (project picker)
#[command]
pub fn get_recent_projects(app: tauri::AppHandle) -> Vec<RecentProject> {
    load_state(&app).recent_projects
}

/// Get preferences
#[command]
pub fn get_preferences(app: tauri::AppHandle) -> Preferences {
    load_state(&app).preferences
}

/// Update user preferences
#[command]
pub fn update_preferences(app: tauri::AppHandle, preferences: Preferences) -> Result<(), String> {
    let mut state = load_state(&app);
    state.preferences = preferences;
    save_state(&app, &state).map_err(|e| e.to_string())
}

/// Add / update a recent project entry
#[command]
pub fn add_recent_project_cmd(
    app: tauri::AppHandle,
    name: String,
    path: String,
) -> Result<(), String> {
    add_recent_project(&app, name, path).map_err(|e| e.to_string())
}

/// Remove a project from recent projects
#[command]
pub fn remove_recent_project_cmd(app: tauri::AppHandle, path: String) -> Result<(), String> {
    remove_recent_project(&app, path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn call_backend(
    app: tauri::AppHandle,
    command: &str,
    args: serde_json::Value,
) -> Result<String, String> {
    handle_ipc(app, command, args)
        .await
        .map(|val| val.to_string())
        .map_err(|e| e.to_string())
}
