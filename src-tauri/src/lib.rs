#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod app_state;
mod backend;
mod commands;
mod project;

use app_state::{load_state, save_state};
use tauri::{Manager, WindowEvent};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            let state = load_state(app.handle());

            let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize {
                width: state.window.width,
                height: state.window.height,
            }));

            if let (Some(x), Some(y)) = (state.window.x, state.window.y) {
                let _ =
                    window.set_position(tauri::Position::Logical(tauri::LogicalPosition { x, y }));
            }

            Ok(())
        })
        .on_window_event(|window, event| match event {
            WindowEvent::Moved(pos) => {
                let app = window.app_handle();
                let mut state = load_state(app);
                state.window.x = Some(pos.x as f64);
                state.window.y = Some(pos.y as f64);
                let _ = save_state(app, &state);
            }
            WindowEvent::Resized(_) => {
                let app = window.app_handle();
                let mut state = load_state(app);
                if let Ok(size) = window.outer_size() {
                    state.window.width = size.width as f64;
                    state.window.height = size.height as f64;
                }
                let _ = save_state(app, &state);
            }
            _ => {}
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::call_backend,
            commands::get_app_state,
            commands::get_preferences,
            commands::update_preferences,
            commands::add_recent_project_cmd,
            commands::get_recent_projects,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
