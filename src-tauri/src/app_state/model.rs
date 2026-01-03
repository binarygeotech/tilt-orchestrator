use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct AppState {
    pub window: WindowState,
    pub recent_projects: Vec<RecentProject>,
    pub preferences: Preferences,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WindowState {
    pub width: f64,
    pub height: f64,
    pub x: Option<f64>,
    pub y: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RecentProject {
    pub name: String,
    pub path: String,
    pub last_opened: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Preferences {
    pub auto_open_last_project: bool,
    pub default_editor: Option<String>,
}

impl Default for WindowState {
    fn default() -> Self {
        Self {
            width: 1024.0,
            height: 768.0,
            x: None,
            y: None,
        }
    }
}

impl Default for Preferences {
    fn default() -> Self {
        Self {
            auto_open_last_project: false,
            default_editor: None,
        }
    }
}
