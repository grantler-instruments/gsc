use std::sync::Mutex;

use tauri::{AppHandle, Emitter, Manager};

pub struct PendingOpenPaths(pub Mutex<Vec<String>>);

fn path_strings_from_urls(urls: Vec<tauri::Url>) -> Vec<String> {
    urls.into_iter()
        .filter_map(|url| url.to_file_path().ok())
        .map(|path| path.to_string_lossy().into_owned())
        .collect()
}

#[cfg(any(windows, target_os = "linux"))]
fn path_strings_from_cli_args() -> Vec<String> {
    let mut paths = Vec::new();

    for arg in std::env::args().skip(1) {
        if arg.starts_with('-') {
            continue;
        }

        if let Ok(url) = tauri::Url::parse(&arg) {
            if let Ok(path) = url.to_file_path() {
                paths.push(path.to_string_lossy().into_owned());
                continue;
            }
        }

        paths.push(arg);
    }

    paths
}

fn dispatch_open_paths(app: &AppHandle, paths: Vec<String>) {
    if paths.is_empty() {
        return;
    }

    app.state::<PendingOpenPaths>()
        .0
        .lock()
        .unwrap()
        .extend(paths.clone());

    let _ = app.emit("gsc://open-paths", paths);
}

#[allow(unused_variables)]
pub fn handle_cli_open_files(app: &AppHandle) {
    #[cfg(any(windows, target_os = "linux"))]
    dispatch_open_paths(app, path_strings_from_cli_args());
}

pub fn handle_opened_urls(app: &AppHandle, urls: Vec<tauri::Url>) {
    dispatch_open_paths(app, path_strings_from_urls(urls));
}

#[tauri::command]
pub fn take_pending_open_paths(state: tauri::State<'_, PendingOpenPaths>) -> Vec<String> {
    std::mem::take(&mut *state.0.lock().unwrap())
}
