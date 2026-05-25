use std::sync::atomic::{AtomicBool, AtomicU32, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};

use grafton_ndi::{Finder, FinderOptions, NDI, PixelFormat, Sender, SenderOptions, VideoFrame};
use image::{imageops::FilterType, RgbaImage};
use serde::Serialize;
use xcap::Window;

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

struct PushedFrame {
    width: u32,
    height: u32,
    data: Vec<u8>,
}

pub struct NdiState {
    runtime: Option<Arc<NDI>>,
    stop: Arc<AtomicBool>,
    thread: Option<JoinHandle<()>>,
    config: Option<NdiOutputConfig>,
    pushed_frame: Arc<Mutex<Option<PushedFrame>>>,
    frames_sent: Arc<AtomicU64>,
    connection_count: Arc<AtomicU32>,
    last_error: Arc<Mutex<Option<String>>>,
    capture_width: Arc<AtomicU32>,
    capture_height: Arc<AtomicU32>,
}

impl Default for NdiState {
    fn default() -> Self {
        Self {
            runtime: None,
            stop: Arc::new(AtomicBool::new(true)),
            thread: None,
            config: None,
            pushed_frame: Arc::new(Mutex::new(None)),
            frames_sent: Arc::new(AtomicU64::new(0)),
            connection_count: Arc::new(AtomicU32::new(0)),
            last_error: Arc::new(Mutex::new(None)),
            capture_width: Arc::new(AtomicU32::new(0)),
            capture_height: Arc::new(AtomicU32::new(0)),
        }
    }
}

impl NdiState {
    fn runtime(&mut self) -> Result<Arc<NDI>, String> {
        if let Some(rt) = &self.runtime {
            return Ok(Arc::clone(rt));
        }
        let rt = NDI::new().map_err(|e| format!("NDI runtime init failed: {e}"))?;
        let rt = Arc::new(rt);
        self.runtime = Some(Arc::clone(&rt));
        Ok(rt)
    }

    fn set_error(&self, message: Option<String>) {
        if let Ok(mut err) = self.last_error.lock() {
            *err = message;
        }
    }
}

pub fn ndi_is_available() -> bool {
    NDI::new().is_ok()
}

pub fn list_ndi_sources(state: &mut NdiState, timeout_ms: u64) -> Result<Vec<NdiSourceInfo>, String> {
    let ndi = state.runtime()?;
    let finder = Finder::new(
        ndi.as_ref(),
        &FinderOptions::builder().show_local_sources(true).build(),
    )
    .map_err(|e| format!("NDI finder failed: {e}"))?;

    let timeout = Duration::from_millis(timeout_ms.max(100));
    let sources = finder
        .find_sources(timeout)
        .map_err(|e| format!("NDI source discovery failed: {e}"))?;

    Ok(sources
        .into_iter()
        .map(|source| NdiSourceInfo {
            name: source.name,
            url_address: source
                .address
                .as_str()
                .unwrap_or_default()
                .to_string(),
        })
        .collect())
}

pub fn start_ndi_output(state: &mut NdiState, config: NdiOutputConfig) -> Result<(), String> {
    stop_ndi_output(state)?;

    if config.source_name.trim().is_empty() {
        return Err("NDI source name is required".to_string());
    }

    let fps = config.fps.clamp(1, 60);
    let target_width = if config.width == 0 { 1280 } else { config.width };
    let target_height = if config.height == 0 { 720 } else { config.height };
    let window_title = config
        .window_title
        .clone()
        .filter(|t| !t.trim().is_empty())
        .unwrap_or_else(|| "GSC Output".to_string());

    let ndi = state.runtime()?;
    let sender_options = SenderOptions::builder(config.source_name.trim())
        .clock_video(true)
        .build();
    let sender = Sender::new(ndi.as_ref(), &sender_options)
        .map_err(|e| format!("NDI sender failed: {e}"))?;

    state.stop.store(false, Ordering::Release);
    state.frames_sent.store(0, Ordering::Release);
    state.connection_count.store(0, Ordering::Release);
    state.capture_width.store(target_width, Ordering::Release);
    state.capture_height.store(target_height, Ordering::Release);
    state.set_error(None);

    let stop = Arc::clone(&state.stop);
    let pushed_frame = Arc::clone(&state.pushed_frame);
    let frames_sent = Arc::clone(&state.frames_sent);
    let connection_count = Arc::clone(&state.connection_count);
    let last_error = Arc::clone(&state.last_error);
    let frame_interval = Duration::from_secs_f64(1.0 / f64::from(fps));

    let handle = thread::Builder::new()
        .name("gsc-ndi-send".into())
        .spawn(move || {
            run_sender_loop(
                sender,
                stop,
                pushed_frame,
                frames_sent,
                connection_count,
                last_error,
                window_title,
                target_width,
                target_height,
                fps,
                frame_interval,
            );
        })
        .map_err(|e| format!("Failed to start NDI thread: {e}"))?;

    state.config = Some(config);
    state.thread = Some(handle);
    Ok(())
}

pub fn stop_ndi_output(state: &mut NdiState) -> Result<(), String> {
    state.stop.store(true, Ordering::Release);
    if let Some(handle) = state.thread.take() {
        let _ = handle.join();
    }
    state.config = None;
    if let Ok(mut frame) = state.pushed_frame.lock() {
        *frame = None;
    }
    Ok(())
}

pub fn get_ndi_output_status(state: &NdiState) -> NdiOutputStatus {
    let config = state.config.as_ref();
    NdiOutputStatus {
        running: state.thread.is_some() && !state.stop.load(Ordering::Acquire),
        available: true,
        source_name: config
            .map(|c| c.source_name.clone())
            .unwrap_or_default(),
        width: state.capture_width.load(Ordering::Acquire),
        height: state.capture_height.load(Ordering::Acquire),
        fps: config.map(|c| c.fps).unwrap_or(0),
        frames_sent: state.frames_sent.load(Ordering::Acquire),
        connection_count: state.connection_count.load(Ordering::Acquire),
        last_error: state.last_error.lock().ok().and_then(|e| e.clone()),
    }
}

pub fn push_ndi_frame(
    state: &NdiState,
    width: u32,
    height: u32,
    data: Vec<u8>,
) -> Result<(), String> {
    if width == 0 || height == 0 {
        return Err("Frame width and height must be greater than 0".to_string());
    }
    let expected = (width as usize)
        .checked_mul(height as usize)
        .and_then(|px| px.checked_mul(4))
        .ok_or_else(|| "Frame dimensions overflow".to_string())?;
    if data.len() != expected {
        return Err(format!(
            "Expected {} bytes of BGRA data, got {}",
            expected,
            data.len()
        ));
    }
    if !state.running() {
        return Err("NDI output is not running".to_string());
    }
    state.capture_width.store(width, Ordering::Release);
    state.capture_height.store(height, Ordering::Release);
    if let Ok(mut frame) = state.pushed_frame.lock() {
        *frame = Some(PushedFrame {
            width,
            height,
            data,
        });
    }
    Ok(())
}

impl NdiState {
    fn running(&self) -> bool {
        self.thread.is_some() && !self.stop.load(Ordering::Acquire)
    }
}

fn run_sender_loop(
    sender: Sender,
    stop: Arc<AtomicBool>,
    pushed_frame: Arc<Mutex<Option<PushedFrame>>>,
    frames_sent: Arc<AtomicU64>,
    connection_count: Arc<AtomicU32>,
    last_error: Arc<Mutex<Option<String>>>,
    window_title: String,
    target_width: u32,
    target_height: u32,
    fps: u32,
    frame_interval: Duration,
) {
    let mut video_frame = match VideoFrame::builder()
        .resolution(target_width, target_height)
        .pixel_format(PixelFormat::BGRA)
        .frame_rate(fps, 1)
        .build()
    {
        Ok(frame) => frame,
        Err(e) => {
            if let Ok(mut err) = last_error.lock() {
                *err = Some(format!("NDI video frame init failed: {e}"));
            }
            return;
        }
    };

    let mut next_tick = Instant::now();
    while !stop.load(Ordering::Acquire) {
        next_tick += frame_interval;
        let bgra = match take_pushed_frame(&pushed_frame).or_else(|| {
            capture_window_frame(&window_title, target_width, target_height)
        }) {
            Some(frame) => frame,
            None => {
                sleep_until(next_tick);
                continue;
            }
        };

        if let Err(e) = copy_into_video_frame(&mut video_frame, &bgra, fps) {
            if let Ok(mut err) = last_error.lock() {
                *err = Some(e);
            }
            sleep_until(next_tick);
            continue;
        }

        sender.send_video(&video_frame);
        frames_sent.fetch_add(1, Ordering::Release);

        if let Ok(count) = sender.connection_count(Duration::from_millis(0)) {
            connection_count.store(count, Ordering::Release);
        }

        if let Ok(mut err) = last_error.lock() {
            *err = None;
        }

        sleep_until(next_tick);
    }
}

fn take_pushed_frame(pushed_frame: &Arc<Mutex<Option<PushedFrame>>>) -> Option<(u32, u32, Vec<u8>)> {
    let mut guard = pushed_frame.lock().ok()?;
    guard.take().map(|frame| (frame.width, frame.height, frame.data))
}

fn capture_window_frame(
    window_title: &str,
    target_width: u32,
    target_height: u32,
) -> Option<(u32, u32, Vec<u8>)> {
    let windows = Window::all().ok()?;
    let needle = window_title.to_lowercase();
    let window = windows.into_iter().find(|window| {
        window
            .title()
            .map(|title| {
                let lower = title.to_lowercase();
                lower == needle || lower.contains(&needle)
            })
            .unwrap_or(false)
    })?;

    let image = window.capture_image().ok()?;
    let rgba = resize_rgba(image, target_width, target_height);
    let width = rgba.width();
    let height = rgba.height();
    Some((width, height, rgba_to_bgra(rgba)))
}

fn resize_rgba(image: RgbaImage, target_width: u32, target_height: u32) -> RgbaImage {
    if image.width() == target_width && image.height() == target_height {
        return image;
    }
    image::imageops::resize(&image, target_width, target_height, FilterType::Triangle)
}

fn rgba_to_bgra(image: RgbaImage) -> Vec<u8> {
    let mut out = image.into_raw();
    for chunk in out.chunks_exact_mut(4) {
        chunk.swap(0, 2);
    }
    out
}

fn copy_into_video_frame(
    frame: &mut VideoFrame,
    bgra: &(u32, u32, Vec<u8>),
    fps: u32,
) -> Result<(), String> {
    let (width, height, data) = bgra;
    if frame.width() != *width || frame.height() != *height {
        *frame = VideoFrame::builder()
            .resolution(*width, *height)
            .pixel_format(PixelFormat::BGRA)
            .frame_rate(fps, 1)
            .build()
            .map_err(|e| format!("NDI frame resize failed: {e}"))?;
    }
    let dest = frame.data_mut();
    if dest.len() != data.len() {
        return Err(format!(
            "NDI buffer size mismatch: expected {}, got {}",
            dest.len(),
            data.len()
        ));
    }
    dest.copy_from_slice(data);
    Ok(())
}

fn sleep_until(deadline: Instant) {
    let now = Instant::now();
    if deadline > now {
        thread::sleep(deadline - now);
    }
}
