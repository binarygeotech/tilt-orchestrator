use serde::{Deserialize, Serialize};
use tauri::{
    menu::{Menu, MenuBuilder, MenuItemBuilder, SubmenuBuilder},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager,
};
use tokio::sync::RwLock;

use crate::backend::project::Project;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TiltState {
    pub status: String,
    pub is_running: bool,
    pub web_ui_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TrayState {
    pub current_project: Option<Project>,
    pub current_env: Option<String>,
    pub tilt_state: Option<TiltState>,
}

fn build_menu(app: &AppHandle, state: &TrayState) -> tauri::Result<Menu<tauri::Wry>> {
    let mut menu_builder = MenuBuilder::new(app);

    // 1. Show UI
    menu_builder = menu_builder.text("show_ui", "Show UI").separator();

    // 2. Project Name
    if let Some(ref project) = state.current_project {
        let project_name = format!("Project: {}", project.project.name);
        menu_builder = menu_builder.text("project_name", project_name).separator();

        // 3. Tilt Controls Submenu
        let is_running = state
            .tilt_state
            .as_ref()
            .map(|t| t.is_running)
            .unwrap_or(false);

        let start_item = MenuItemBuilder::new("Start Tilt")
            .id("tilt_start")
            .enabled(!is_running)
            .build(app)?;

        let stop_item = MenuItemBuilder::new("Stop Tilt")
            .id("tilt_stop")
            .enabled(is_running)
            .build(app)?;

        let restart_item = MenuItemBuilder::new("Restart Tilt")
            .id("tilt_restart")
            .enabled(is_running)
            .build(app)?;

        let web_ui_item = MenuItemBuilder::new("Open Web UI")
            .id("tilt_web_ui")
            .enabled(is_running)
            .build(app)?;

        let tilt_submenu = SubmenuBuilder::new(app, "Tilt Controls")
            .item(&start_item)
            .item(&stop_item)
            .item(&restart_item)
            .separator()
            .item(&web_ui_item)
            .build()?;

        menu_builder = menu_builder.item(&tilt_submenu);

        // 4. Services Submenu
        if let Some(ref env_name) = state.current_env {
            if let Some(environment) = project.environments.get(env_name) {
                if !environment.services.is_empty() {
                    let mut services_submenu = SubmenuBuilder::new(app, "Services");

                    for service in &environment.services {
                        let service_name = service.name.clone();

                        // TODO: Implement toggling service status properly including regenerating the tilt files
                        // let enable_text = if service.enabled { "Disable" } else { "Enable" };
                        // let enable_item = MenuItemBuilder::new(enable_text)
                        //     .id(&format!("service_toggle_{}", service_name))
                        //     .build(app)?;

                        let editor_item = MenuItemBuilder::new("Open in Editor")
                            .id(format!("service_editor_{}", service_name))
                            .build(app)?;

                        let service_submenu = SubmenuBuilder::new(app, &service_name)
                            // .item(&enable_item)
                            .item(&editor_item)
                            .build()?;

                        services_submenu = services_submenu.item(&service_submenu);
                    }

                    menu_builder = menu_builder.item(&services_submenu.build()?);
                }
            }
        }

        menu_builder = menu_builder.separator();
    } else {
        menu_builder = menu_builder
            .item(
                &MenuItemBuilder::new("No Project Open")
                    .id("no_project")
                    .enabled(false)
                    .build(app)?,
            )
            // .text("no_project", "No Project Open")
            .separator();
    }

    // Quit
    menu_builder = menu_builder.text("quit", "Quit");

    menu_builder.build()
}

pub fn create_tray(app: &AppHandle) -> tauri::Result<()> {
    let state = TrayState::default();
    let menu = build_menu(app, &state)?;

    let _tray = TrayIconBuilder::with_id("main")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .on_menu_event(handle_menu_event)
        .build(app)?;

    Ok(())
}

fn handle_menu_event(app: &AppHandle, event: tauri::menu::MenuEvent) {
    let id = event.id.as_ref();

    match id {
        "show_ui" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        "tilt_start" => {
            // Emit the frontend event to start Tilt
            app.emit("start-tilt", ()).unwrap();
        }
        "tilt_stop" => {
            app.emit("stop-tilt", ()).unwrap();
        }
        "tilt_restart" => {
            app.emit("restart-tilt", ()).unwrap();
        }
        "tilt_web_ui" => {
            // Open Tilt Web UI in browser
            // let url = "http://localhost:10350";
            let app_handle = app.clone();
            tauri::async_runtime::spawn(async move {
                let state = app_handle.state::<RwLock<TrayState>>();
                let state = state.read().await.clone();

                if let Some(tilt_state) = state.tilt_state {
                    if let Some(web_ui_url) = tilt_state.web_ui_url {
                        println!("{}", web_ui_url);
                        if !web_ui_url.is_empty() {
                            let _ = tauri_plugin_opener::open_url(&web_ui_url, None::<&str>);
                        }
                    }
                }
            });
        }
        "quit" => {
            app.exit(0);
        }
        _ => {
            // Handle service toggle and editor commands
            if id.starts_with("service_toggle_") {
                let service_name = id.strip_prefix("service_toggle_").unwrap();
                app.emit("toggle-service", service_name).unwrap();
            } else if id.starts_with("service_editor_") {
                let service_name = id.strip_prefix("service_editor_").unwrap();
                app.emit("open-service-in-editor", service_name).unwrap();
            }
        }
    }
}

#[tauri::command]
pub async fn update_tray_menu(
    app: AppHandle,
    project: Option<Project>,
    env: Option<String>,
    tilt_state: Option<TiltState>,
) -> Result<(), String> {
    // let state = TrayState {
    //     current_project: project.clone(),
    //     current_env: env,
    //     tilt_state: tilt_state.clone(),
    // };

    let state_handle = app.state::<RwLock<TrayState>>();
    let mut state = state_handle.write().await;
    *state = TrayState {
        current_project: project,
        current_env: env,
        tilt_state,
    };

    let menu = build_menu(&app, &state).map_err(|e| e.to_string())?;

    // Get the tray icon and update its menu
    if let Some(tray) = app.tray_by_id("main") {
        tray.set_menu(Some(menu)).map_err(|e| e.to_string())?;
    }

    Ok(())
}
