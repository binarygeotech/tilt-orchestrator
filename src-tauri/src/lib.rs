#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod app_state;
mod backend;
mod commands;
mod project;
mod tray_icon;

use app_state::{load_state, save_state};
use tauri::{AppHandle, Manager, WindowEvent};
use tokio::sync::RwLock;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn close_splashscreen(window: tauri::Window) -> Result<(), String> {
    // Close splashscreen
    if let Some(splashscreen) = window.get_webview_window("splashscreen") {
        splashscreen.close().map_err(|e| e.to_string())?;
    }
    // Show main window
    window
        .get_webview_window("main")
        .ok_or("main window not found")?
        .show()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn __close_splashscreen(app: AppHandle) -> Result<(), String> {
    let splash_window = app.get_webview_window("splashscreen").unwrap();
    let main_window = app.get_webview_window("main").unwrap();
    splash_window.close().unwrap();
    main_window.show().unwrap();

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            #[cfg(desktop)]
            {
                let _ = app
                    .get_webview_window("main")
                    .expect("no main window")
                    .set_focus();
            }
        }))
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            let state = load_state(app.handle());

            let _ = tray_icon::tray_manager::create_tray(app.handle());

            app.manage(RwLock::new(tray_icon::tray_manager::TrayState::default()));

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
            commands::remove_recent_project_cmd,
            commands::get_recent_projects,
            close_splashscreen,
            tray_icon::tray_manager::update_tray_menu,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
