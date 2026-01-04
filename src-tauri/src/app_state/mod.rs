pub mod model;
pub mod store;

use chrono::Utc;
use model::RecentProject;
pub use store::{load_state, save_state};

pub fn add_recent_project(
    app: &tauri::AppHandle,
    name: String,
    path: String,
) -> Result<(), crate::backend::errors::AppError> {
    let mut state = load_state(app);

    state.recent_projects.retain(|p| p.path != path);

    state.recent_projects.insert(
        0,
        RecentProject {
            name,
            path,
            last_opened: Utc::now().to_rfc3339(),
        },
    );

    state.recent_projects.truncate(10);

    save_state(app, &state)
}

pub fn remove_recent_project(
    app: &tauri::AppHandle,
    path: String,
) -> Result<(), crate::backend::errors::AppError> {
    let mut state = load_state(app);

    state.recent_projects.retain(|p| p.path != path);

    save_state(app, &state)
}
