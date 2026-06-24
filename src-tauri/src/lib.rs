mod kokoro_phonemize;
mod devices;
mod dmx;
mod enttec_pro;
mod macos_package;
mod midi_input;
mod ndi;
mod osc;
mod project_open;
mod remote;
mod speech_model_cache;

use std::sync::Mutex;

use kokoro_phonemize::kokoro_phonemize;
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
use ndi::NdiService;
use osc::send_osc;
use project_open::{
    handle_cli_open_files, handle_opened_urls, take_pending_open_paths, PendingOpenPaths,
};
use remote::{
    get_local_ip, get_remote_server_status, remote_broadcast, remote_set_project_root,
    start_remote_server, stop_remote_server, RemoteServerState,
};
use speech_model_cache::{
    speech_model_cache_append, speech_model_cache_exists, speech_model_cache_list_dir,
    speech_model_cache_mkdir, speech_model_cache_read, speech_model_cache_remove_all,
    speech_model_cache_resolve_path, speech_model_cache_write,
};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{Emitter, Manager, RunEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .manage(MidiInputState(Mutex::new(None)))
        .manage(EnttecProState(Mutex::new(None)))
        .manage(NdiService::default())
        .manage(PendingOpenPaths(Mutex::new(Vec::new())))
        .manage(RemoteServerState::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_keepawake::init())
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
            ndi::ndi_is_available_cmd,
            ndi::list_ndi_sources,
            ndi::start_ndi_output,
            ndi::stop_ndi_output,
            ndi::get_ndi_output_status,
            ndi::push_ndi_frame,
            get_local_ip,
            get_remote_server_status,
            start_remote_server,
            stop_remote_server,
            remote_broadcast,
            remote_set_project_root,
            speech_model_cache_write,
            speech_model_cache_append,
            speech_model_cache_read,
            speech_model_cache_resolve_path,
            speech_model_cache_exists,
            speech_model_cache_mkdir,
            speech_model_cache_list_dir,
            speech_model_cache_remove_all,
            kokoro_phonemize,
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
                "undo" => {
                    let _ = app.emit("gsc://undo", ());
                }
                "redo" => {
                    let _ = app.emit("gsc://redo", ());
                }
                _ => {}
            }
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    app.run(|app, event| {
        if let RunEvent::Exit = event {
            if let Some(ndi) = app.try_state::<NdiService>() {
                if let Ok(mut guard) = ndi.0.lock() {
                    let _ = ndi::shutdown_output(&mut guard);
                }
            }
            if let Some(remote) = app.try_state::<RemoteServerState>() {
                remote::shutdown_on_exit(remote.inner());
            }
        }
        #[cfg(any(target_os = "macos", target_os = "ios"))]
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

    let undo = MenuItem::with_id(handle, "undo", "Undo", true, Some("CmdOrCtrl+Z"))?;
    let redo = MenuItem::with_id(handle, "redo", "Redo", true, Some("CmdOrCtrl+Shift+Z"))?;
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
