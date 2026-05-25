use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NdiSourceInfo {
    pub name: String,
    pub url_address: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NdiOutputStatus {
    pub running: bool,
    pub available: bool,
    pub source_name: String,
    pub width: u32,
    pub height: u32,
    pub fps: u32,
    pub frames_sent: u64,
    pub connection_count: u32,
    pub last_error: Option<String>,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NdiOutputConfig {
    pub source_name: String,
    pub window_title: Option<String>,
    pub width: u32,
    pub height: u32,
    pub fps: u32,
}

const UNAVAILABLE: &str = "NDI support was not compiled in. Rebuild with --features ndi and install the NDI SDK.";

#[derive(Default)]
pub struct NdiState;

pub fn ndi_is_available() -> bool {
    false
}

pub fn list_ndi_sources(_state: &mut NdiState, _timeout_ms: u64) -> Result<Vec<NdiSourceInfo>, String> {
    Err(UNAVAILABLE.to_string())
}

pub fn start_ndi_output(_state: &mut NdiState, _config: NdiOutputConfig) -> Result<(), String> {
    Err(UNAVAILABLE.to_string())
}

pub fn stop_ndi_output(_state: &mut NdiState) -> Result<(), String> {
    Ok(())
}

pub fn get_ndi_output_status(_state: &NdiState) -> NdiOutputStatus {
    NdiOutputStatus {
        running: false,
        available: false,
        source_name: String::new(),
        width: 0,
        height: 0,
        fps: 0,
        frames_sent: 0,
        connection_count: 0,
        last_error: Some(UNAVAILABLE.to_string()),
    }
}

pub fn push_ndi_frame(
    _state: &NdiState,
    _width: u32,
    _height: u32,
    _data: Vec<u8>,
) -> Result<(), String> {
    Err(UNAVAILABLE.to_string())
}
