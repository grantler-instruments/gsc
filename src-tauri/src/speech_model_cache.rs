use std::fs;
use std::io::Write;
use std::path::{Component, Path, PathBuf};

use tauri::{AppHandle, Manager};

const CACHE_DIR_NAME: &str = "speech-model-cache";

fn cache_root(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_cache_dir()
        .map_err(|e| e.to_string())
        .map(|dir| dir.join(CACHE_DIR_NAME))
}

fn resolve_cache_path(app: &AppHandle, relative_path: &str) -> Result<PathBuf, String> {
    if relative_path.is_empty() {
        return Err("cache path must not be empty".into());
    }

    let rel = Path::new(relative_path);
    if rel.is_absolute() {
        return Err("cache path must be relative".into());
    }

    for component in rel.components() {
        match component {
            Component::Normal(_) => {}
            Component::CurDir => {}
            _ => return Err("invalid cache path".into()),
        }
    }

    Ok(cache_root(app)?.join(rel))
}

#[tauri::command]
pub fn speech_model_cache_write(
    app: AppHandle,
    relative_path: String,
    data: Vec<u8>,
) -> Result<(), String> {
    let path = resolve_cache_path(&app, &relative_path)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(path, data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn speech_model_cache_append(
    app: AppHandle,
    relative_path: String,
    data: Vec<u8>,
) -> Result<(), String> {
    let path = resolve_cache_path(&app, &relative_path)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .map_err(|e| e.to_string())?;
    file.write_all(&data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn speech_model_cache_resolve_path(app: AppHandle, relative_path: String) -> Result<String, String> {
    let path = resolve_cache_path(&app, &relative_path)?;
    if !path.is_file() {
        return Err("cache file not found".into());
    }
    path.to_str()
        .ok_or_else(|| "cache path is not valid UTF-8".into())
        .map(String::from)
}
#[tauri::command]
pub fn speech_model_cache_read(app: AppHandle, relative_path: String) -> Result<Vec<u8>, String> {
    let path = resolve_cache_path(&app, &relative_path)?;
    fs::read(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn speech_model_cache_exists(app: AppHandle, relative_path: String) -> Result<bool, String> {
    let path = resolve_cache_path(&app, &relative_path)?;
    Ok(path.exists())
}

#[tauri::command]
pub fn speech_model_cache_mkdir(app: AppHandle, relative_path: String) -> Result<(), String> {
    let path = resolve_cache_path(&app, &relative_path)?;
    fs::create_dir_all(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn speech_model_cache_list_dir(
    app: AppHandle,
    relative_path: String,
) -> Result<Vec<String>, String> {
    let path = resolve_cache_path(&app, &relative_path)?;
    let mut names = Vec::new();
    for entry in fs::read_dir(path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if let Some(name) = entry.file_name().to_str() {
            names.push(name.to_string());
        }
    }
    Ok(names)
}

#[tauri::command]
pub fn speech_model_cache_remove_all(app: AppHandle) -> Result<(), String> {
    let path = cache_root(&app)?;
    if path.exists() {
        fs::remove_dir_all(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}
