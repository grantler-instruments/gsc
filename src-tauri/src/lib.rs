mod devices;
mod dmx;
mod enttec_pro;
mod macos_package;
mod midi_input;
mod osc;
mod project_open;

use std::sync::Mutex;

use devices::{list_audio_output_devices, list_midi_ports, send_midi};
use dmx::send_dmx;
use enttec_pro::{
    connect_enttec_pro, disconnect_enttec_pro, is_enttec_pro_connected, list_serial_ports,
    send_enttec_pro_dmx, EnttecProState,
};
use macos_package::mark_gsc_project_package;
use midi_input::{
    list_midi_input_ports, start_midi_input, stop_midi_input, MidiInputState,
};
use osc::send_osc;
use project_open::{
    handle_cli_open_files, handle_opened_urls, take_pending_open_paths, PendingOpenPaths,
};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{Emitter, RunEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .manage(MidiInputState(Mutex::new(None)))
        .manage(EnttecProState(Mutex::new(None)))
        .manage(PendingOpenPaths(Mutex::new(Vec::new())))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_audio_output_devices,
            list_midi_ports,
            send_midi,
            send_dmx,
            list_serial_ports,
            connect_enttec_pro,
            disconnect_enttec_pro,
            is_enttec_pro_connected,
            send_enttec_pro_dmx,
            send_osc,
            list_midi_input_ports,
            start_midi_input,
            stop_midi_input,
            take_pending_open_paths,
            mark_gsc_project_package,
        ])
        .setup(|app| {
            handle_cli_open_files(app.handle());
            setup_app_menu(app)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            match event.id().as_ref() {
                "new_project" => {
                    let _ = app.emit("gsc://new-project", ());
                }
                "open_settings" => {
                    let _ = app.emit("gsc://open-settings", ());
                }
                "open_project" => {
                    let _ = app.emit("gsc://open-project", ());
                }
                "save_project" => {
                    let _ = app.emit("gsc://save-project", ());
                }
                _ => {}
            }
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    app.run(|app, event| {
        if let RunEvent::Opened { urls } = event {
            handle_opened_urls(app, urls);
        }
    });
}

fn setup_app_menu(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        return Ok(());
    }

    let handle = app.handle();

    let new_project =
        MenuItem::with_id(handle, "new_project", "New Project", true, Some("CmdOrCtrl+N"))?;
    let open_project =
        MenuItem::with_id(handle, "open_project", "Open…", true, Some("CmdOrCtrl+O"))?;
    let save_project =
        MenuItem::with_id(handle, "save_project", "Save", true, Some("CmdOrCtrl+S"))?;
    let settings =
        MenuItem::with_id(handle, "open_settings", "Settings…", true, Some("CmdOrCtrl+,"))?;
    let file_submenu = Submenu::with_items(
        handle,
        "File",
        true,
        &[&new_project, &open_project, &save_project, &settings],
    )?;

    let undo = PredefinedMenuItem::undo(handle, None)?;
    let redo = PredefinedMenuItem::redo(handle, None)?;
    let edit_sep = PredefinedMenuItem::separator(handle)?;
    let cut = PredefinedMenuItem::cut(handle, None)?;
    let copy = PredefinedMenuItem::copy(handle, None)?;
    let paste = PredefinedMenuItem::paste(handle, None)?;
    let select_all = PredefinedMenuItem::select_all(handle, None)?;
    let edit_submenu = Submenu::with_items(
        handle,
        "Edit",
        true,
        &[&undo, &redo, &edit_sep, &cut, &copy, &paste, &select_all],
    )?;

    let menu = {
        #[cfg(target_os = "macos")]
        {
            let about = PredefinedMenuItem::about(handle, None, None)?;
            let quit = PredefinedMenuItem::quit(handle, None)?;
            let app_name = handle
                .config()
                .product_name
                .clone()
                .unwrap_or_else(|| "Grantler Stage Control".to_string());
            let app_submenu = Submenu::with_items(
                handle,
                &app_name,
                true,
                &[&about, &settings, &quit],
            )?;
            Menu::with_items(handle, &[&app_submenu, &file_submenu, &edit_submenu])?
        }
        #[cfg(not(target_os = "macos"))]
        {
            let quit = PredefinedMenuItem::quit(handle, None)?;
            Menu::with_items(handle, &[&file_submenu, &edit_submenu, &quit])?
        }
    };

    app.set_menu(menu)?;
    Ok(())
}
