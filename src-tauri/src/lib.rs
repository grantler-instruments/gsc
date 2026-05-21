use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::Emitter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .setup(setup_app_menu)
        .on_menu_event(|app, event| {
            if event.id().as_ref() == "new_project" {
                let _ = app.emit("gsc://new-project", ());
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn setup_app_menu(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        return Ok(());
    }

    let handle = app.handle();

    let new_project =
        MenuItem::with_id(handle, "new_project", "New Project", true, Some("CmdOrCtrl+N"))?;
    let file_submenu = Submenu::with_items(handle, "File", true, &[&new_project])?;

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
            let app_submenu =
                Submenu::with_items(handle, &app_name, true, &[&about, &quit])?;
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
