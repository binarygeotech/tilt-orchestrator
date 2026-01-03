use tauri::command;
use crate::app_state::{load_state, save_state, add_recent_project};
use crate::app_state::model::{RecentProject, Preferences};
use crate::backend::ipc::handle_ipc;

#[command]
pub fn get_app_state(app: tauri::AppHandle) -> crate::app_state::model::AppState {
    load_state(&app)
}

/// Get recent projects only (project picker)
#[command]
pub fn get_recent_projects(
    app: tauri::AppHandle,
) -> Vec<RecentProject> {
    load_state(&app).recent_projects
}

/// Get preferences
#[command]
pub fn get_preferences(
    app: tauri::AppHandle,
) -> Preferences {
    load_state(&app).preferences
}

/// Update user preferences
#[command]
pub fn update_preferences(
    app: tauri::AppHandle,
    preferences: Preferences,
) -> Result<(), String> {
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
    add_recent_project(&app, name, path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn call_backend(command: &str, args: serde_json::Value) -> Result<String, String> {
    handle_ipc(command, args)
        .await
        .map(|val| val.to_string())
        .map_err(|e| e.to_string())
}