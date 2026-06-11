use std::collections::HashMap;
use std::net::SocketAddr;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::{Query, State};
use axum::http::{header, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use futures_util::{SinkExt, StreamExt};
use rand::Rng;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::{mpsc, oneshot};
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteServerInfo {
    pub port: u16,
    pub pin: String,
    pub lan_ip: String,
    pub connect_url: String,
    pub dev_mode: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteServerStatus {
    pub running: bool,
    pub port: u16,
    pub pin: String,
    pub lan_ip: String,
    pub connect_url: String,
    pub client_count: usize,
    pub dev_mode: bool,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(tag = "action", rename_all = "kebab-case")]
pub enum RemoteCommandPayload {
    GoSelected,
    Go { cue_id: String },
    HotGo { cue_id: String },
    SelectCue { cue_id: String },
    Panic,
    SetMasterVolume { value: f64 },
    SetActiveCueList { cue_list_id: String },
}

struct RemoteClientMessage {
    msg_type: String,
    pin: Option<String>,
    action: Option<String>,
    cue_id: Option<String>,
    cue_list_id: Option<String>,
    value: Option<f64>,
}

impl<'de> Deserialize<'de> for RemoteClientMessage {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        #[derive(Deserialize)]
        struct Raw {
            #[serde(rename = "type")]
            msg_type: String,
            pin: Option<String>,
            action: Option<String>,
            #[serde(alias = "cueId")]
            cue_id: Option<String>,
            #[serde(alias = "cueListId")]
            cue_list_id: Option<String>,
            value: Option<f64>,
        }
        let raw = Raw::deserialize(deserializer)?;
        Ok(RemoteClientMessage {
            msg_type: raw.msg_type,
            pin: raw.pin,
            action: raw.action,
            cue_id: raw.cue_id,
            cue_list_id: raw.cue_list_id,
            value: raw.value,
        })
    }
}

struct RemoteInner {
    running: bool,
    port: u16,
    pin: String,
    lan_ip: String,
    connect_url: String,
    dev_mode: bool,
    shutdown_tx: Option<oneshot::Sender<()>>,
    clients: HashMap<u64, mpsc::UnboundedSender<String>>,
    next_client_id: u64,
    dist_path: PathBuf,
    app_handle: Option<AppHandle>,
    /// Canonical booth project folder (`.gsc` directory) for serving `assets/` over HTTP.
    project_root: Option<PathBuf>,
    /// Last full snapshot wire message (JSON) for immediate delivery to new clients.
    last_snapshot: Option<String>,
}

pub struct RemoteServerState {
    inner: Arc<Mutex<RemoteInner>>,
}

impl Default for RemoteServerState {
    fn default() -> Self {
        Self {
            inner: Arc::new(Mutex::new(RemoteInner {
                running: false,
                port: 8766,
                pin: String::new(),
                lan_ip: String::new(),
                connect_url: String::new(),
                dev_mode: false,
                shutdown_tx: None,
                clients: HashMap::new(),
                next_client_id: 1,
                dist_path: PathBuf::new(),
                app_handle: None,
                project_root: None,
                last_snapshot: None,
            })),
        }
    }
}

#[derive(Debug, Deserialize)]
struct RemoteAssetQuery {
    path: String,
    pin: String,
}

/// Virtual `/assets/...` path → relative `assets/...` inside the project folder.
fn asset_relative_path(virtual_path: &str) -> Option<String> {
    let mut normalized = virtual_path.trim().replace('\\', "/");
    if normalized.is_empty() {
        return None;
    }
    if !normalized.starts_with('/') {
        normalized = format!("/{normalized}");
    }
    let mut rel = normalized.trim_start_matches('/').to_string();
    if rel == "assets" {
        return None;
    }
    if !rel.starts_with("assets/") {
        rel = format!("assets/{}", rel.trim_start_matches("assets/"));
    }
    if rel.contains("..") {
        return None;
    }
    Some(rel)
}

fn mime_type_for_asset(relative_path: &str) -> &'static str {
    let ext = relative_path
        .rsplit('.')
        .next()
        .unwrap_or("")
        .to_ascii_lowercase();
    match ext.as_str() {
        "wav" => "audio/wav",
        "mp3" => "audio/mpeg",
        "ogg" => "audio/ogg",
        "m4a" => "audio/mp4",
        "aac" => "audio/aac",
        "flac" => "audio/flac",
        "aiff" | "aif" => "audio/aiff",
        "mp4" => "video/mp4",
        "webm" => "video/webm",
        "mov" => "video/quicktime",
        "mkv" => "video/x-matroska",
        "m4v" => "video/x-m4v",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        "svg" => "image/svg+xml",
        "tif" | "tiff" => "image/tiff",
        "heic" => "image/heic",
        _ => "application/octet-stream",
    }
}

struct ResolvedAssetPath {
    relative_path: String,
    disk_path: PathBuf,
}

fn resolve_asset_disk_path(project_root: &Path, virtual_path: &str) -> Option<ResolvedAssetPath> {
    let rel = asset_relative_path(virtual_path)?;
    let joined = project_root.join(&rel);
    let joined = joined.canonicalize().ok()?;
    if joined.starts_with(project_root) {
        Some(ResolvedAssetPath {
            relative_path: rel,
            disk_path: joined,
        })
    } else {
        None
    }
}

async fn remote_asset_handler(
    State(shared): State<ServerShared>,
    Query(query): Query<RemoteAssetQuery>,
) -> impl IntoResponse {
    let (expected_pin, project_root) = {
        let inner = shared.remote.lock().expect("remote lock");
        (inner.pin.clone(), inner.project_root.clone())
    };

    if query.pin != expected_pin || expected_pin.is_empty() {
        return (StatusCode::UNAUTHORIZED, "Invalid PIN").into_response();
    }

    let Some(project_root) = project_root else {
        return (StatusCode::SERVICE_UNAVAILABLE, "No project open on host").into_response();
    };

    let Some(resolved) = resolve_asset_disk_path(&project_root, &query.path) else {
        return (StatusCode::BAD_REQUEST, "Invalid asset path").into_response();
    };

    if !resolved.disk_path.is_file() {
        return (StatusCode::NOT_FOUND, "Asset not found").into_response();
    }

    let bytes = match tokio::fs::read(&resolved.disk_path).await {
        Ok(data) => data,
        Err(_) => return (StatusCode::NOT_FOUND, "Asset not found").into_response(),
    };

    let mime = mime_type_for_asset(&resolved.relative_path);
    let mut response = Response::new(Body::from(bytes));
    *response.status_mut() = StatusCode::OK;
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        header::HeaderValue::from_static(mime),
    );
    response.headers_mut().insert(
        header::CACHE_CONTROL,
        header::HeaderValue::from_static("private, max-age=86400"),
    );
    response
}

fn remote_router(shared: ServerShared, dev_mode: bool, dist_path: PathBuf) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let api = Router::new()
        .route("/ws", get(ws_handler))
        .route("/remote/asset", get(remote_asset_handler))
        .with_state(shared);

    if dev_mode {
        api.layer(cors)
    } else {
        let serve_dir = ServeDir::new(dist_path).append_index_html_on_directories(true);
        Router::new()
            .merge(api)
            .fallback_service(serve_dir)
            .layer(cors)
    }
}

#[derive(Clone)]
struct ServerShared {
    remote: Arc<Mutex<RemoteInner>>,
}

fn generate_pin() -> String {
    let mut rng = rand::thread_rng();
    format!("{:06}", rng.gen_range(0..1_000_000))
}

fn normalize_pin(pin: &str) -> Option<String> {
    let trimmed = pin.trim();
    if trimmed.len() != 6 || !trimmed.chars().all(|c| c.is_ascii_digit()) {
        return None;
    }
    Some(trimmed.to_string())
}

pub fn local_ip_address() -> String {
    local_ip_address::local_ip()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|_| "127.0.0.1".to_string())
}

fn resolve_dist_path(app: &AppHandle) -> PathBuf {
    if let Ok(resource) = app.path().resource_dir() {
        if resource.join("app").join("index.html").exists() {
            return resource;
        }
    }
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../dist")
}

const VITE_DEV_PORT: u16 = 1421;
const VITE_DEV_BASE: &str = "/gsc";

fn build_connect_url(lan_ip: &str, ws_port: u16, pin: &str, dev_mode: bool) -> String {
    if dev_mode {
        return format!(
            "http://{lan_ip}:{vite_port}{base}/app/?mode=remote&pin={pin}&wsPort={ws_port}",
            lan_ip = lan_ip,
            vite_port = VITE_DEV_PORT,
            base = VITE_DEV_BASE,
            pin = pin,
            ws_port = ws_port,
        );
    }
    format!(
        "http://{lan_ip}:{port}/app/?mode=remote&pin={pin}",
        lan_ip = lan_ip,
        port = ws_port,
        pin = pin,
    )
}

fn status_from_inner(inner: &RemoteInner) -> RemoteServerStatus {
    RemoteServerStatus {
        running: inner.running,
        port: inner.port,
        pin: inner.pin.clone(),
        lan_ip: inner.lan_ip.clone(),
        connect_url: inner.connect_url.clone(),
        client_count: inner.clients.len(),
        dev_mode: inner.dev_mode,
    }
}

fn stop_remote_inner(inner: &mut RemoteInner) {
    inner.clients.clear();
    if let Some(tx) = inner.shutdown_tx.take() {
        let _ = tx.send(());
    }
    inner.running = false;
    inner.pin.clear();
    inner.connect_url.clear();
    inner.last_snapshot = None;
    inner.project_root = None;
}

fn send_raw_to_client(shared: &ServerShared, client_id: u64, text: String) {
    let inner = shared.remote.lock().expect("remote lock");
    if let Some(tx) = inner.clients.get(&client_id) {
        let _ = tx.send(text);
    }
}

fn snapshot_wire_has_cues(wire: &str) -> bool {
    wire.contains("\"cues\":[{") || wire.contains("\"cues\": [{")
}

fn send_cached_snapshot_to_client(shared: &ServerShared, client_id: u64) {
    let cached = {
        let inner = shared.remote.lock().expect("remote lock");
        inner.last_snapshot.clone()
    };
    if let Some(text) = cached {
        send_raw_to_client(shared, client_id, text);
    }
}

fn parse_client_command(msg: RemoteClientMessage) -> Option<RemoteCommandPayload> {
    if msg.msg_type != "cmd" {
        return None;
    }
    match msg.action.as_deref()? {
        "go-selected" => Some(RemoteCommandPayload::GoSelected),
        "go" => Some(RemoteCommandPayload::Go {
            cue_id: msg.cue_id?,
        }),
        "hot-go" => Some(RemoteCommandPayload::HotGo {
            cue_id: msg.cue_id?,
        }),
        "select-cue" => Some(RemoteCommandPayload::SelectCue {
            cue_id: msg.cue_id?,
        }),
        "panic" => Some(RemoteCommandPayload::Panic),
        "set-master-volume" => Some(RemoteCommandPayload::SetMasterVolume {
            value: msg.value?,
        }),
        "set-active-cue-list" => Some(RemoteCommandPayload::SetActiveCueList {
            cue_list_id: msg.cue_list_id?,
        }),
        _ => None,
    }
}

async fn handle_socket(socket: WebSocket, shared: ServerShared) {
    let (mut sender, mut receiver) = socket.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();

    let client_id = {
        let mut inner = shared.remote.lock().expect("remote lock");
        let id = inner.next_client_id;
        inner.next_client_id += 1;
        inner.clients.insert(id, tx);
        id
    };

    let mut authenticated = false;
    let expected_pin = {
        let inner = shared.remote.lock().expect("remote lock");
        inner.pin.clone()
    };

    let forward_task = tokio::spawn(async move {
        while let Some(text) = rx.recv().await {
            if sender.send(Message::Text(text.into())).await.is_err() {
                break;
            }
        }
    });

    while let Some(result) = receiver.next().await {
        let msg = match result {
            Ok(Message::Text(text)) => text,
            Ok(Message::Close(_)) | Err(_) => break,
            _ => continue,
        };

        let parsed: RemoteClientMessage = match serde_json::from_str(&msg) {
            Ok(v) => v,
            Err(_) => {
                let _ = send_json(
                    &shared,
                    client_id,
                    serde_json::json!({ "type": "error", "message": "Invalid JSON" }),
                );
                continue;
            }
        };

        if !authenticated {
            if parsed.msg_type != "auth" {
                let _ = send_json(
                    &shared,
                    client_id,
                    serde_json::json!({ "type": "authFail", "reason": "Auth required" }),
                );
                continue;
            }
            if parsed.pin.as_deref() != Some(expected_pin.as_str()) {
                let _ = send_json(
                    &shared,
                    client_id,
                    serde_json::json!({ "type": "authFail", "reason": "Invalid PIN" }),
                );
                continue;
            }
            authenticated = true;
            let _ = send_json(&shared, client_id, serde_json::json!({ "type": "authOk" }));
            send_cached_snapshot_to_client(&shared, client_id);
            if let Some(app) = {
                let inner = shared.remote.lock().expect("remote lock");
                inner.app_handle.clone()
            } {
                let _ = app.emit("remote://client-connected", ());
            }
            continue;
        }

        if parsed.msg_type == "ping" {
            let _ = send_json(&shared, client_id, serde_json::json!({ "type": "pong" }));
            continue;
        }

        if parsed.msg_type == "request-sync" {
            send_cached_snapshot_to_client(&shared, client_id);
            if let Some(app) = {
                let inner = shared.remote.lock().expect("remote lock");
                inner.app_handle.clone()
            } {
                let _ = app.emit("remote://sync-request", ());
            }
            continue;
        }

        if let Some(cmd) = parse_client_command(parsed) {
            let app = {
                let inner = shared.remote.lock().expect("remote lock");
                inner.app_handle.clone()
            };
            if let Some(app) = app {
                let _ = app.emit("remote://command", cmd);
            }
        }
    }

    forward_task.abort();
    let mut inner = shared.remote.lock().expect("remote lock");
    inner.clients.remove(&client_id);
}

fn send_json(
    shared: &ServerShared,
    client_id: u64,
    value: serde_json::Value,
) -> Result<(), ()> {
    let text = value.to_string();
    let inner = shared.remote.lock().expect("remote lock");
    if let Some(tx) = inner.clients.get(&client_id) {
        tx.send(text).map_err(|_| ())
    } else {
        Err(())
    }
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(shared): State<ServerShared>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, shared))
}

#[tauri::command]
pub fn get_local_ip() -> Result<String, String> {
    Ok(local_ip_address())
}

#[tauri::command]
pub fn get_remote_server_status(state: tauri::State<'_, RemoteServerState>) -> RemoteServerStatus {
    let inner = state.inner.lock().expect("remote lock");
    status_from_inner(&inner)
}

#[tauri::command]
pub fn remote_set_project_root(
    state: tauri::State<'_, RemoteServerState>,
    root_dir: Option<String>,
) -> Result<(), String> {
    let mut inner = state.inner.lock().expect("remote lock");
    inner.project_root = root_dir
        .map(|dir| dir.trim().to_string())
        .filter(|dir| !dir.is_empty())
        .map(PathBuf::from)
        .and_then(|dir| dir.canonicalize().ok())
        .filter(|dir| dir.is_dir());
    Ok(())
}

#[tauri::command]
pub fn remote_broadcast(
    state: tauri::State<'_, RemoteServerState>,
    message: String,
) -> Result<(), String> {
    let mut inner = state.inner.lock().expect("remote lock");
    if message.contains("\"type\":\"snapshot\"") && snapshot_wire_has_cues(&message) {
        inner.last_snapshot = Some(message.clone());
    }
    for tx in inner.clients.values() {
        let _ = tx.send(message.clone());
    }
    Ok(())
}

#[tauri::command]
pub async fn stop_remote_server(state: tauri::State<'_, RemoteServerState>) -> Result<(), String> {
    let mut inner = state.inner.lock().expect("remote lock");
    stop_remote_inner(&mut inner);
    Ok(())
}

#[tauri::command]
pub async fn start_remote_server(
    app: AppHandle,
    state: tauri::State<'_, RemoteServerState>,
    port: u16,
    pin: Option<String>,
) -> Result<RemoteServerInfo, String> {
    if port == 0 {
        return Err("Port must be greater than 0".to_string());
    }

    let dev_mode = cfg!(debug_assertions);
    let dist_path = if dev_mode {
        PathBuf::new()
    } else {
        let dist_path = resolve_dist_path(&app);
        if !dist_path.join("app").join("index.html").exists() {
            return Err(
                "Remote UI files not found. Run npm run build once, then restart the desktop app."
                    .to_string(),
            );
        }
        dist_path
    };

    {
        let mut inner = state.inner.lock().expect("remote lock");
        if inner.running {
            stop_remote_inner(&mut inner);
        }
    }

    let pin = match pin {
        Some(raw) => normalize_pin(&raw).ok_or_else(|| "PIN must be 6 digits".to_string())?,
        None => generate_pin(),
    };
    let lan_ip = local_ip_address();
    let connect_url = build_connect_url(&lan_ip, port, &pin, dev_mode);

    let shared = ServerShared {
        remote: Arc::clone(&state.inner),
    };

    let router = remote_router(shared, dev_mode, dist_path.clone());

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .map_err(|e| format!("Could not bind remote server on port {port}: {e}"))?;

    let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();

    {
        let mut inner = state.inner.lock().expect("remote lock");
        inner.running = true;
        inner.port = port;
        inner.pin = pin.clone();
        inner.lan_ip = lan_ip.clone();
        inner.connect_url = connect_url.clone();
        inner.dev_mode = dev_mode;
        inner.shutdown_tx = Some(shutdown_tx);
        inner.clients.clear();
        inner.next_client_id = 1;
        inner.dist_path = dist_path;
        inner.app_handle = Some(app.clone());
    }

    tokio::spawn(async move {
        let _ = axum::serve(listener, router)
            .with_graceful_shutdown(async {
                shutdown_rx.await.ok();
            })
            .await;
    });

    Ok(RemoteServerInfo {
        port,
        pin,
        lan_ip,
        connect_url,
        dev_mode,
    })
}

pub fn shutdown_on_exit(state: &RemoteServerState) {
    let mut inner = state.inner.lock().expect("remote lock");
    stop_remote_inner(&mut inner);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_connect_url_includes_mode_and_pin() {
        let url = build_connect_url("192.168.1.10", 8766, "123456", false);
        assert!(url.contains("mode=remote"));
        assert!(url.contains("pin=123456"));
        assert!(!url.contains("wsPort"));
    }

    #[test]
    fn build_connect_url_dev_uses_vite() {
        let url = build_connect_url("192.168.1.10", 8766, "123456", true);
        assert!(url.contains(":1421/gsc/app/"));
        assert!(url.contains("wsPort=8766"));
    }

    #[test]
    fn normalize_pin_accepts_six_digits_only() {
        assert_eq!(normalize_pin("123456").as_deref(), Some("123456"));
        assert_eq!(normalize_pin(" 654321 ").as_deref(), Some("654321"));
        assert!(normalize_pin("12345").is_none());
        assert!(normalize_pin("1234567").is_none());
        assert!(normalize_pin("12a456").is_none());
    }

    #[test]
    fn parse_client_command_accepts_camel_case_fields() {
        let msg: RemoteClientMessage = serde_json::from_str(
            r#"{"type":"cmd","action":"select-cue","cueId":"abc"}"#,
        )
        .unwrap();
        let cmd = parse_client_command(msg).unwrap();
        assert!(matches!(
            cmd,
            RemoteCommandPayload::SelectCue { cue_id } if cue_id == "abc"
        ));
    }

    #[test]
    fn asset_relative_path_maps_virtual_assets() {
        assert_eq!(
            asset_relative_path("/assets/intro.wav").as_deref(),
            Some("assets/intro.wav")
        );
        assert_eq!(
            asset_relative_path("assets/intro.wav").as_deref(),
            Some("assets/intro.wav")
        );
        assert!(asset_relative_path("/assets/../etc/passwd").is_none());
        assert!(asset_relative_path("").is_none());
    }

    #[test]
    fn snapshot_wire_has_cues_detects_non_empty_lists() {
        assert!(snapshot_wire_has_cues(
            r#"{"type":"snapshot","payload":{"project":{"cueLists":[{"cues":[{"id":"1"}]},{"cues":[]}]}}}"#
        ));
        assert!(!snapshot_wire_has_cues(
            r#"{"type":"snapshot","payload":{"project":{"cueLists":[{"cues":[]}]}}}"#
        ));
    }

    #[test]
    fn parse_client_command_accepts_snake_case_fields() {
        let msg: RemoteClientMessage = serde_json::from_str(
            r#"{"type":"cmd","action":"select-cue","cue_id":"abc"}"#,
        )
        .unwrap();
        let cmd = parse_client_command(msg).unwrap();
        assert!(matches!(
            cmd,
            RemoteCommandPayload::SelectCue { cue_id } if cue_id == "abc"
        ));
    }
}
