#[cfg(feature = "ndi")]
mod imp;

#[cfg(not(feature = "ndi"))]
mod stub;

#[cfg(feature = "ndi")]
pub use imp::{NdiOutputConfig, NdiOutputStatus, NdiSourceInfo, NdiState};

#[cfg(not(feature = "ndi"))]
pub use stub::{NdiOutputConfig, NdiOutputStatus, NdiSourceInfo, NdiState};

use std::sync::Mutex;

use tauri::State;

pub struct NdiService(pub Mutex<NdiState>);

impl Default for NdiService {
    fn default() -> Self {
        Self(Mutex::new(NdiState::default()))
    }
}

pub fn shutdown_output(state: &mut NdiState) -> Result<(), String> {
    #[cfg(feature = "ndi")]
    {
        return imp::stop_ndi_output(state);
    }
    #[cfg(not(feature = "ndi"))]
    {
        stub::stop_ndi_output(state)
    }
}

#[tauri::command(rename = "ndi_is_available")]
pub fn ndi_is_available_cmd() -> bool {
    #[cfg(feature = "ndi")]
    {
        return imp::ndi_is_available();
    }
    #[cfg(not(feature = "ndi"))]
    {
        stub::ndi_is_available()
    }
}

#[tauri::command]
pub fn list_ndi_sources(
    state: State<'_, NdiService>,
    timeout_ms: Option<u64>,
) -> Result<Vec<NdiSourceInfo>, String> {
    let timeout = timeout_ms.unwrap_or(2000);
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    #[cfg(feature = "ndi")]
    {
        return imp::list_ndi_sources(&mut guard, timeout);
    }
    #[cfg(not(feature = "ndi"))]
    {
        stub::list_ndi_sources(&mut guard, timeout)
    }
}

#[tauri::command]
pub fn start_ndi_output(state: State<'_, NdiService>, config: NdiOutputConfig) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    #[cfg(feature = "ndi")]
    {
        return imp::start_ndi_output(&mut guard, config);
    }
    #[cfg(not(feature = "ndi"))]
    {
        stub::start_ndi_output(&mut guard, config)
    }
}

#[tauri::command]
pub fn stop_ndi_output(state: State<'_, NdiService>) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    #[cfg(feature = "ndi")]
    {
        return imp::stop_ndi_output(&mut guard);
    }
    #[cfg(not(feature = "ndi"))]
    {
        stub::stop_ndi_output(&mut guard)
    }
}

#[tauri::command]
pub fn get_ndi_output_status(state: State<'_, NdiService>) -> NdiOutputStatus {
    let guard = state.0.lock().expect("ndi state lock poisoned");
    #[cfg(feature = "ndi")]
    {
        return imp::get_ndi_output_status(&guard);
    }
    #[cfg(not(feature = "ndi"))]
    {
        stub::get_ndi_output_status(&guard)
    }
}

#[tauri::command]
pub fn push_ndi_frame(
    state: State<'_, NdiService>,
    width: u32,
    height: u32,
    data: Vec<u8>,
) -> Result<(), String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    #[cfg(feature = "ndi")]
    {
        return imp::push_ndi_frame(&guard, width, height, data);
    }
    #[cfg(not(feature = "ndi"))]
    {
        stub::push_ndi_frame(&guard, width, height, data)
    }
}
