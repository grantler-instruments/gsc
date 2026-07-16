//! Supertonic 3 TTS (desktop). Models download into the app cache on first use.

mod helper;

use std::collections::HashMap;
use std::fs;
use std::io::{Cursor, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use helper::{
    is_valid_lang, load_text_to_speech, load_voice_style, Style, TextToSpeech, AVAILABLE_LANGS,
};
use hound::{SampleFormat, WavSpec, WavWriter};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};

const CACHE_DIR_NAME: &str = "speech-model-cache";
const SUPERTONIC_DIR: &str = "supertonic";
const HF_BASE: &str = "https://huggingface.co/Supertone/supertonic-3/resolve/main";
const INSTALL_MARKER: &str = ".installed";
const DEFAULT_TOTAL_STEP: usize = 8;
const DEFAULT_SILENCE_SECS: f32 = 0.3;

const ASSET_FILES: &[&str] = &[
    "onnx/duration_predictor.onnx",
    "onnx/text_encoder.onnx",
    "onnx/vector_estimator.onnx",
    "onnx/vocoder.onnx",
    "onnx/tts.json",
    "onnx/unicode_indexer.json",
    "voice_styles/M1.json",
    "voice_styles/M2.json",
    "voice_styles/M3.json",
    "voice_styles/M4.json",
    "voice_styles/M5.json",
    "voice_styles/F1.json",
    "voice_styles/F2.json",
    "voice_styles/F3.json",
    "voice_styles/F4.json",
    "voice_styles/F5.json",
];

pub const SUPERTONIC_VOICES: &[&str] = &[
    "M1", "M2", "M3", "M4", "M5", "F1", "F2", "F3", "F4", "F5",
];

pub struct SupertonicState {
    inner: Mutex<SupertonicInner>,
    download_in_progress: AtomicBool,
}

struct SupertonicInner {
    tts: Option<TextToSpeech>,
    styles: HashMap<String, Style>,
}

impl Default for SupertonicState {
    fn default() -> Self {
        Self {
            inner: Mutex::new(SupertonicInner {
                tts: None,
                styles: HashMap::new(),
            }),
            download_in_progress: AtomicBool::new(false),
        }
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DownloadProgress {
    file: String,
    index: usize,
    count: usize,
}

fn cache_root(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_cache_dir()
        .map_err(|e| e.to_string())
        .map(|dir| dir.join(CACHE_DIR_NAME).join(SUPERTONIC_DIR))
}

fn assets_ready(root: &Path) -> bool {
    root.join(INSTALL_MARKER).is_file()
        && ASSET_FILES.iter().all(|rel| root.join(rel).is_file())
}

fn download_file(url: &str, dest: &Path) -> Result<(), String> {
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let tmp = dest.with_extension("download");
    let response = ureq::get(url)
        .set("User-Agent", "gsc-supertonic/1.0")
        .call()
        .map_err(|e| format!("download failed ({url}): {e}"))?;
    let mut reader = response.into_reader();
    let mut file = fs::File::create(&tmp).map_err(|e| e.to_string())?;
    std::io::copy(&mut reader, &mut file).map_err(|e| e.to_string())?;
    file.flush().map_err(|e| e.to_string())?;
    fs::rename(&tmp, dest).map_err(|e| e.to_string())?;
    Ok(())
}

fn encode_wav_bytes(audio_data: &[f32], sample_rate: i32) -> Result<Vec<u8>, String> {
    let spec = WavSpec {
        channels: 1,
        sample_rate: sample_rate as u32,
        bits_per_sample: 16,
        sample_format: SampleFormat::Int,
    };
    let mut cursor = Cursor::new(Vec::new());
    {
        let mut writer = WavWriter::new(&mut cursor, spec).map_err(|e| e.to_string())?;
        for &sample in audio_data {
            let clamped = sample.clamp(-1.0, 1.0);
            let val = (clamped * 32767.0) as i16;
            writer.write_sample(val).map_err(|e| e.to_string())?;
        }
        writer.finalize().map_err(|e| e.to_string())?;
    }
    Ok(cursor.into_inner())
}

fn require_assets(app: &AppHandle) -> Result<PathBuf, String> {
    let root = cache_root(app)?;
    if assets_ready(&root) {
        return Ok(root);
    }
    Err(
        "Speech model is not installed. Download it in Settings → Speech first.".into(),
    )
}

async fn download_assets_async(app: &AppHandle) -> Result<PathBuf, String> {
    let root = cache_root(app)?;
    if assets_ready(&root) {
        return Ok(root);
    }

    fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    let count = ASSET_FILES.len();
    for (index, rel) in ASSET_FILES.iter().enumerate() {
        let dest = root.join(rel);
        let _ = app.emit(
            "supertonic-download-progress",
            DownloadProgress {
                file: (*rel).to_string(),
                index: index + 1,
                count,
            },
        );

        if !dest.is_file() {
            let url = format!("{HF_BASE}/{rel}");
            let dest_for_task = dest.clone();
            // Keep ureq/IO off the async runtime so the UI stays responsive.
            tokio::task::spawn_blocking(move || download_file(&url, &dest_for_task))
                .await
                .map_err(|e| format!("download task failed: {e}"))??;
        }

        tokio::task::yield_now().await;
    }
    fs::write(root.join(INSTALL_MARKER), b"ok").map_err(|e| e.to_string())?;
    Ok(root)
}

fn load_engine(root: &Path, state: &SupertonicState) -> Result<(), String> {
    let mut guard = state.inner.lock().map_err(|_| "supertonic lock poisoned")?;
    if guard.tts.is_some() {
        return Ok(());
    }
    let onnx_dir = root.join("onnx");
    let onnx_dir = onnx_dir
        .to_str()
        .ok_or_else(|| "onnx path is not valid UTF-8".to_string())?;
    let tts = load_text_to_speech(onnx_dir, false).map_err(|e| e.to_string())?;
    guard.tts = Some(tts);
    Ok(())
}

fn resolve_voice_style(root: &Path, voice: &str) -> Result<PathBuf, String> {
    if !SUPERTONIC_VOICES.contains(&voice) {
        return Err(format!(
            "unknown voice '{voice}'. expected one of: {}",
            SUPERTONIC_VOICES.join(", ")
        ));
    }
    let path = root.join("voice_styles").join(format!("{voice}.json"));
    if !path.is_file() {
        return Err(format!("voice style missing: {}", path.display()));
    }
    Ok(path)
}

#[tauri::command]
pub fn supertonic_assets_ready(app: AppHandle) -> Result<bool, String> {
    Ok(assets_ready(&cache_root(&app)?))
}

/// Download Supertonic assets into the app cache. Only Settings should call this.
/// Runs file IO on a blocking pool so the app UI does not freeze.
#[tauri::command]
pub async fn supertonic_ensure_assets(
    app: AppHandle,
    state: State<'_, SupertonicState>,
) -> Result<(), String> {
    if state
        .download_in_progress
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        return Err("Speech model download is already in progress.".into());
    }

    let result = download_assets_async(&app).await;
    state.download_in_progress.store(false, Ordering::SeqCst);
    result.map(|_| ())
}

#[tauri::command]
pub fn supertonic_clear_assets(app: AppHandle, state: State<'_, SupertonicState>) -> Result<(), String> {
    {
        let mut guard = state.inner.lock().map_err(|_| "supertonic lock poisoned")?;
        guard.tts = None;
        guard.styles.clear();
    }
    let root = cache_root(&app)?;
    if root.exists() {
        fs::remove_dir_all(&root).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn supertonic_load(
    app: AppHandle,
    state: State<'_, SupertonicState>,
) -> Result<(), String> {
    let root = require_assets(&app)?;
    {
        let guard = state.inner.lock().map_err(|_| "supertonic lock poisoned")?;
        if guard.tts.is_some() {
            return Ok(());
        }
    }

    let onnx_dir = root.join("onnx");
    let onnx_dir = onnx_dir
        .to_str()
        .ok_or_else(|| "onnx path is not valid UTF-8".to_string())?
        .to_string();

    let tts = tokio::task::spawn_blocking(move || load_text_to_speech(&onnx_dir, false))
        .await
        .map_err(|e| format!("load task failed: {e}"))?
        .map_err(|e| e.to_string())?;

    let mut guard = state.inner.lock().map_err(|_| "supertonic lock poisoned")?;
    if guard.tts.is_none() {
        guard.tts = Some(tts);
    }
    Ok(())
}

#[tauri::command]
pub fn supertonic_unload(state: State<'_, SupertonicState>) -> Result<(), String> {
    let mut guard = state.inner.lock().map_err(|_| "supertonic lock poisoned")?;
    guard.tts = None;
    guard.styles.clear();
    Ok(())
}

#[tauri::command]
pub fn supertonic_list_langs() -> Vec<&'static str> {
    AVAILABLE_LANGS.to_vec()
}

#[tauri::command]
pub fn tts_synthesize(
    app: AppHandle,
    state: State<'_, SupertonicState>,
    text: String,
    lang: String,
    voice: String,
    speed: f32,
) -> Result<Vec<u8>, String> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return Err("text must not be empty".into());
    }
    if !is_valid_lang(&lang) {
        return Err(format!(
            "unsupported language '{lang}'. expected one of: {}",
            AVAILABLE_LANGS.join(", ")
        ));
    }
    let speed = speed.clamp(0.5, 2.0);

    let root = require_assets(&app)?;
    load_engine(&root, &state)?;

    let style_path = resolve_voice_style(&root, &voice)?;
    let style_key = voice;

    let mut guard = state.inner.lock().map_err(|_| "supertonic lock poisoned")?;
    if !guard.styles.contains_key(&style_key) {
        let path_str = style_path
            .to_str()
            .ok_or_else(|| "voice path is not valid UTF-8".to_string())?
            .to_string();
        let style = load_voice_style(&[path_str], false).map_err(|e| e.to_string())?;
        guard.styles.insert(style_key.clone(), style);
    }

    let SupertonicInner { tts, styles } = &mut *guard;
    let style = styles
        .get(&style_key)
        .ok_or_else(|| "voice style missing after load".to_string())?;
    let engine = tts
        .as_mut()
        .ok_or_else(|| "speech engine not loaded".to_string())?;
    let sample_rate = engine.sample_rate;
    let (samples, _duration) = engine
        .call(
            trimmed,
            &lang,
            style,
            DEFAULT_TOTAL_STEP,
            speed,
            DEFAULT_SILENCE_SECS,
        )
        .map_err(|e| e.to_string())?;

    encode_wav_bytes(&samples, sample_rate)
}

#[cfg(test)]
mod tests {
    use super::{
        encode_wav_bytes, is_valid_lang, resolve_voice_style, assets_ready, SUPERTONIC_VOICES,
        AVAILABLE_LANGS, INSTALL_MARKER, ASSET_FILES,
    };
    use hound::WavReader;
    use std::fs;
    use std::io::Cursor;
    use std::path::PathBuf;

    #[test]
    fn accepts_known_langs_and_rejects_unknown() {
        assert!(is_valid_lang("en"));
        assert!(is_valid_lang("de"));
        assert!(is_valid_lang("na"));
        assert!(is_valid_lang("ko"));
        assert!(!is_valid_lang("zz"));
        assert!(!is_valid_lang(""));
        assert!(AVAILABLE_LANGS.contains(&"ja"));
    }

    #[test]
    fn maps_voice_ids_to_style_json_paths() {
        let root = PathBuf::from(std::env::temp_dir()).join("gsc-supertonic-voice-test");
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(root.join("voice_styles")).unwrap();
        fs::write(root.join("voice_styles/M1.json"), b"{}").unwrap();
        fs::write(root.join("voice_styles/F3.json"), b"{}").unwrap();

        assert_eq!(
            resolve_voice_style(&root, "M1").unwrap(),
            root.join("voice_styles/M1.json")
        );
        assert_eq!(
            resolve_voice_style(&root, "F3").unwrap(),
            root.join("voice_styles/F3.json")
        );
        assert!(resolve_voice_style(&root, "af_heart").is_err());
        assert!(resolve_voice_style(&root, "M2").is_err()); // known id, missing file
        assert!(SUPERTONIC_VOICES.contains(&"M1"));

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn encode_wav_bytes_roundtrips_mono_pcm16() {
        let samples = [0.0_f32, 0.5, -0.5, 1.0, -1.0];
        let bytes = encode_wav_bytes(&samples, 44_100).expect("encode wav");
        assert!(bytes.len() > 44); // header + frames

        let mut reader = WavReader::new(Cursor::new(bytes)).expect("read wav");
        assert_eq!(reader.spec().channels, 1);
        assert_eq!(reader.spec().sample_rate, 44_100);
        assert_eq!(reader.spec().bits_per_sample, 16);

        let decoded: Vec<i16> = reader.samples::<i16>().map(|s| s.unwrap()).collect();
        assert_eq!(decoded.len(), samples.len());
        assert_eq!(decoded[0], 0);
        assert_eq!(decoded[3], 32767);
        assert_eq!(decoded[4], -32767);
    }

    #[test]
    fn assets_ready_requires_marker_and_all_files() {
        let root = PathBuf::from(std::env::temp_dir()).join("gsc-supertonic-ready-test");
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        assert!(!assets_ready(&root));

        for rel in ASSET_FILES {
            let path = root.join(rel);
            if let Some(parent) = path.parent() {
                fs::create_dir_all(parent).unwrap();
            }
            fs::write(&path, b"x").unwrap();
        }
        assert!(!assets_ready(&root));
        fs::write(root.join(INSTALL_MARKER), b"ok").unwrap();
        assert!(assets_ready(&root));

        let _ = fs::remove_dir_all(&root);
    }
}
