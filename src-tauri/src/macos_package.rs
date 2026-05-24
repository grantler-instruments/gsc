#[cfg(target_os = "macos")]
pub fn mark_directory_as_package(path: &str) -> Result<(), String> {
    use std::path::Path;
    use std::process::Command;

    let path = Path::new(path);
    if !path.is_dir() {
        return Err(format!("Not a directory: {path:?}"));
    }

    let Some(path_str) = path.to_str() else {
        return Err("Invalid UTF-8 path".into());
    };

    // FinderInfo byte 8 = 0x24 marks the folder as a package in Finder.
    let finder_info = "00 00 00 00 00 00 00 00 24 00 00 00 00 00 00 00 \
                       00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00";

    let status = Command::new("/usr/bin/xattr")
        .args(["-wx", "com.apple.FinderInfo", finder_info, path_str])
        .status()
        .map_err(|err| format!("Could not run xattr: {err}"))?;

    if status.success() {
        Ok(())
    } else {
        Err("xattr failed to mark directory as package".into())
    }
}

#[cfg(not(target_os = "macos"))]
pub fn mark_directory_as_package(_path: &str) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub fn mark_gsc_project_package(path: String) -> Result<(), String> {
    mark_directory_as_package(&path)
}
