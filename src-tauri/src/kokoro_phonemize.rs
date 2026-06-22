//! Native phonemization for Kokoro TTS (avoids pthread WASM hang in WKWebView).

use std::path::{Path, PathBuf};

use espeak_ng::{install_bundled_language, Translator};
use tauri::{AppHandle, Manager};

const ESPEAK_CACHE_DIR: &str = "espeak-ng-data";
const INSTALL_MARKER: &str = ".installed";

fn map_phonemizer_language(language: &str) -> &'static str {
    match language.to_ascii_lowercase().as_str() {
        "en-us" | "en_us" => "en-us",
        "en-gb" | "en_gb" | "en" => "en",
        other if other.starts_with("en") => "en",
        _ => "en-us",
    }
}

fn espeak_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_cache_dir()
        .map_err(|err| err.to_string())
        .map(|dir| dir.join(ESPEAK_CACHE_DIR))
}

fn ensure_espeak_data(app: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = espeak_data_dir(app)?;
    std::fs::create_dir_all(&data_dir).map_err(|err| err.to_string())?;

    let marker = data_dir.join(INSTALL_MARKER);
    if !marker.exists() {
        install_bundled_language(&data_dir, "en").map_err(|err| err.to_string())?;
        std::fs::write(&marker, "en\n").map_err(|err| err.to_string())?;
    }

    Ok(data_dir)
}

fn phonemize_with_data(data_dir: &Path, language: &str, text: &str) -> Result<Vec<String>, String> {
    let voice = map_phonemizer_language(language);
    let translator = Translator::new(voice, Some(data_dir)).map_err(|err| err.to_string())?;
    let ipa = translator.text_to_ipa(text).map_err(|err| err.to_string())?;
    Ok(vec![ipa])
}

/// Match the `phonemizer` npm API shape used by kokoro-js (`string[]` per call).
#[tauri::command]
pub fn kokoro_phonemize(app: AppHandle, text: String, language: String) -> Result<Vec<String>, String> {
    let data_dir = ensure_espeak_data(&app)?;
    phonemize_with_data(&data_dir, &language, &text)
}

#[cfg(test)]
mod tests {
    use super::{map_phonemizer_language, phonemize_with_data};
    use espeak_ng::install_bundled_language;
    use std::path::PathBuf;

    #[test]
    fn maps_kokoro_locales() {
        assert_eq!(map_phonemizer_language("en-us"), "en-us");
        assert_eq!(map_phonemizer_language("en"), "en");
    }

    #[test]
    fn phonemizes_with_bundled_english_data() {
        let data_dir = PathBuf::from(std::env::temp_dir()).join("gsc-espeak-test");
        let _ = std::fs::remove_dir_all(&data_dir);
        std::fs::create_dir_all(&data_dir).unwrap();
        install_bundled_language(&data_dir, "en").unwrap();

        let ipa = phonemize_with_data(&data_dir, "en-us", "hello")
            .expect("phonemize should succeed with bundled data");
        assert_eq!(ipa.len(), 1);
        assert!(!ipa[0].is_empty());

        let _ = std::fs::remove_dir_all(&data_dir);
    }
}
