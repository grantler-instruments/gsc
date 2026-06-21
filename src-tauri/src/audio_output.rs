use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{SampleFormat, StreamConfig};
use std::sync::mpsc::{self, Receiver, Sender};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};

enum AudioOutputCommand {
    SetDevice {
        device_name: Option<String>,
        sample_rate: u32,
        reply: mpsc::Sender<Result<u32, String>>,
    },
    ResetPlaybackBuffer {
        reply: mpsc::Sender<Result<(), String>>,
    },
    AppendPlaybackPcm(Vec<f32>),
    StartPlayback {
        reply: mpsc::Sender<Result<(), String>>,
    },
    StopOutput {
        reply: mpsc::Sender<Result<(), String>>,
    },
    Shutdown,
}

struct PlaybackBuffer {
    samples: Mutex<Vec<f32>>,
    read_index: Mutex<usize>,
}

impl PlaybackBuffer {
    fn new() -> Self {
        Self {
            samples: Mutex::new(Vec::new()),
            read_index: Mutex::new(0),
        }
    }

    fn clear(&self) {
        self.samples.lock().expect("playback buffer lock").clear();
        *self.read_index.lock().expect("playback index lock") = 0;
    }

    fn append(&self, samples: &[f32]) {
        self.samples
            .lock()
            .expect("playback buffer lock")
            .extend_from_slice(samples);
    }

    fn fill_output(&self, data: &mut [f32]) {
        let samples = self.samples.lock().expect("playback buffer lock");
        let mut index = self.read_index.lock().expect("playback index lock");
        for out in data.iter_mut() {
            *out = samples.get(*index).copied().unwrap_or(0.0);
            if *index < samples.len() {
                *index += 1;
            }
        }
    }
}

struct AudioOutputThread {
    command_rx: Receiver<AudioOutputCommand>,
    buffer: Arc<PlaybackBuffer>,
    pending_device: Option<(String, u32)>,
    stream: Option<cpal::Stream>,
}

impl AudioOutputThread {
    fn run(mut self) {
        while let Ok(command) = self.command_rx.recv() {
            match command {
                AudioOutputCommand::SetDevice {
                    device_name,
                    sample_rate,
                    reply,
                } => {
                    self.stream = None;
                    self.buffer.clear();
                    match device_name {
                        Some(name) => match resolve_output_sample_rate(&name, sample_rate) {
                            Ok(resolved) => {
                                self.pending_device = Some((name, resolved));
                                let _ = reply.send(Ok(resolved));
                            }
                            Err(err) => {
                                self.pending_device = None;
                                let _ = reply.send(Err(err));
                            }
                        },
                        None => {
                            self.pending_device = None;
                            let _ = reply.send(Ok(sample_rate));
                        }
                    }
                }
                AudioOutputCommand::ResetPlaybackBuffer { reply } => {
                    self.buffer.clear();
                    let _ = reply.send(Ok(()));
                }
                AudioOutputCommand::AppendPlaybackPcm(samples) => {
                    self.buffer.append(&samples);
                }
                AudioOutputCommand::StartPlayback { reply } => {
                    // Always reopen so read_index stays aligned with a fresh buffer.
                    self.stream = None;
                    let result = self.ensure_stream_playing();
                    let _ = reply.send(result);
                }
                AudioOutputCommand::StopOutput { reply } => {
                    self.stream = None;
                    self.pending_device = None;
                    self.buffer.clear();
                    let _ = reply.send(Ok(()));
                }
                AudioOutputCommand::Shutdown => break,
            }
        }

        drop(self.stream);
    }

    fn ensure_stream_playing(&mut self) -> Result<(), String> {
        if self.stream.is_some() {
            return Ok(());
        }
        let Some((device_name, sample_rate)) = self.pending_device.clone() else {
            return Ok(());
        };
        self.stream = Some(open_output_stream(
            Arc::clone(&self.buffer),
            &device_name,
            sample_rate,
        )?);
        Ok(())
    }
}

pub struct AudioOutputState {
    command_tx: Mutex<Sender<AudioOutputCommand>>,
    thread: Mutex<Option<JoinHandle<()>>>,
}

impl Default for AudioOutputState {
    fn default() -> Self {
        let (command_tx, command_rx) = mpsc::channel();
        let buffer = Arc::new(PlaybackBuffer::new());
        let buffer_for_thread = Arc::clone(&buffer);

        let thread = thread::Builder::new()
            .name("gsc-audio-output".into())
            .spawn(move || {
                let worker = AudioOutputThread {
                    command_rx,
                    buffer: buffer_for_thread,
                    pending_device: None,
                    stream: None,
                };
                worker.run();
            })
            .expect("failed to spawn audio output thread");

        Self {
            command_tx: Mutex::new(command_tx),
            thread: Mutex::new(Some(thread)),
        }
    }
}

impl Drop for AudioOutputState {
    fn drop(&mut self) {
        if let Ok(tx) = self.command_tx.lock() {
            let _ = tx.send(AudioOutputCommand::Shutdown);
        }
        if let Ok(mut thread) = self.thread.lock() {
            if let Some(handle) = thread.take() {
                let _ = handle.join();
            }
        }
    }
}

fn find_output_device(host: &cpal::Host, name: &str) -> Option<cpal::Device> {
    let needle = name.trim().to_lowercase();
    host.output_devices().ok()?.find(|device| {
        device
            .name()
            .map(|device_name| device_name.trim().to_lowercase() == needle)
            .unwrap_or(false)
    })
}

fn pick_stream_config(device: &cpal::Device, sample_rate: u32) -> Result<StreamConfig, String> {
    const OUTPUT_CHANNELS: u16 = 2;
    let supported: Vec<_> = device
        .supported_output_configs()
        .map_err(|e| e.to_string())?
        .filter(|range| {
            range.sample_format() == SampleFormat::F32 && range.channels() >= OUTPUT_CHANNELS
        })
        .collect();

    let mut config = if !supported.is_empty() {
        let range = supported
            .iter()
            .find(|range| {
                range.min_sample_rate().0 <= sample_rate && sample_rate <= range.max_sample_rate().0
            })
            .or_else(|| supported.first())
            .expect("supported outputs checked above");
        if range.min_sample_rate().0 <= sample_rate && sample_rate <= range.max_sample_rate().0 {
            range.with_sample_rate(cpal::SampleRate(sample_rate)).config()
        } else {
            range.with_max_sample_rate().config()
        }
    } else {
        device
            .default_output_config()
            .map_err(|e| e.to_string())?
            .config()
    };

    config.channels = OUTPUT_CHANNELS;
    Ok(config)
}

fn open_output_stream(
    buffer: Arc<PlaybackBuffer>,
    device_name: &str,
    sample_rate: u32,
) -> Result<cpal::Stream, String> {
    let host = cpal::default_host();
    let device = find_output_device(&host, device_name)
        .ok_or_else(|| format!("Audio output device not found: {device_name}"))?;
    let config = pick_stream_config(&device, sample_rate)?;
    let resolved_name = device.name().unwrap_or_else(|_| device_name.to_string());
    eprintln!(
        "[audio] Native output stream opened: {} @ {} Hz ({} channels)",
        resolved_name,
        config.sample_rate.0,
        config.channels
    );
    let buffer_for_callback = Arc::clone(&buffer);

    let stream = device
        .build_output_stream(
            &config,
            move |data: &mut [f32], _: &cpal::OutputCallbackInfo| {
                buffer_for_callback.fill_output(data);
            },
            |err| eprintln!("[audio] cpal stream error: {err}"),
            None,
        )
        .map_err(|e| e.to_string())?;

    stream.play().map_err(|e| e.to_string())?;
    Ok(stream)
}

fn send_command(state: &AudioOutputState, command: AudioOutputCommand) -> Result<(), String> {
    let tx = state.command_tx.lock().map_err(|e| e.to_string())?;
    tx.send(command).map_err(|e| e.to_string())
}

fn send_command_with_reply(
    state: &AudioOutputState,
    build: impl FnOnce(mpsc::Sender<Result<(), String>>) -> AudioOutputCommand,
) -> Result<(), String> {
    let (reply_tx, reply_rx) = mpsc::channel();
    send_command(state, build(reply_tx))?;
    reply_rx.recv().map_err(|e| e.to_string())?
}

fn send_command_with_u32_reply(
    state: &AudioOutputState,
    build: impl FnOnce(mpsc::Sender<Result<u32, String>>) -> AudioOutputCommand,
) -> Result<u32, String> {
    let (reply_tx, reply_rx) = mpsc::channel();
    send_command(state, build(reply_tx))?;
    reply_rx.recv().map_err(|e| e.to_string())?
}

fn resolve_output_sample_rate(device_name: &str, sample_rate: u32) -> Result<u32, String> {
    let host = cpal::default_host();
    let device = find_output_device(&host, device_name)
        .ok_or_else(|| format!("Audio output device not found: {device_name}"))?;
    let config = pick_stream_config(&device, sample_rate)?;
    Ok(config.sample_rate.0)
}

#[tauri::command]
pub fn set_audio_output_device(
    state: tauri::State<'_, AudioOutputState>,
    device_name: Option<String>,
    sample_rate: Option<u32>,
) -> Result<u32, String> {
    let rate = sample_rate.unwrap_or(48_000).max(8_000);
    send_command_with_u32_reply(&state, |reply| AudioOutputCommand::SetDevice {
        device_name,
        sample_rate: rate,
        reply,
    })
}

#[tauri::command]
pub fn get_default_audio_output_device() -> Option<String> {
    let host = cpal::default_host();
    host.default_output_device()
        .and_then(|device| device.name().ok())
        .map(|name| name.trim().to_string())
        .filter(|name| !name.is_empty())
}

#[tauri::command]
pub fn reset_native_playback_buffer(state: tauri::State<'_, AudioOutputState>) -> Result<(), String> {
    send_command_with_reply(&state, |reply| AudioOutputCommand::ResetPlaybackBuffer { reply })
}

#[tauri::command]
pub fn append_native_playback_pcm(
    state: tauri::State<'_, AudioOutputState>,
    samples: Vec<f32>,
) -> Result<(), String> {
    if samples.is_empty() {
        return Ok(());
    }
    send_command(&state, AudioOutputCommand::AppendPlaybackPcm(samples))
}

#[tauri::command]
pub fn load_native_playback_pcm_file(
    state: tauri::State<'_, AudioOutputState>,
    path: String,
) -> Result<usize, String> {
    let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    let _ = std::fs::remove_file(&path);
    if bytes.is_empty() {
        return Ok(0);
    }
    if bytes.len() % 4 != 0 {
        return Err("PCM byte length must be a multiple of 4".to_string());
    }
    let mut floats = Vec::with_capacity(bytes.len() / 4);
    for chunk in bytes.chunks_exact(4) {
        floats.push(f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]));
    }
    let sample_count = floats.len();
    send_command(
        &state,
        AudioOutputCommand::AppendPlaybackPcm(floats),
    )?;
    Ok(sample_count)
}

#[tauri::command]
pub fn append_native_playback_pcm_bytes(
    state: tauri::State<'_, AudioOutputState>,
    samples: Vec<u8>,
) -> Result<(), String> {
    if samples.is_empty() {
        return Ok(());
    }
    if samples.len() % 4 != 0 {
        return Err("PCM byte length must be a multiple of 4".to_string());
    }
    let mut floats = Vec::with_capacity(samples.len() / 4);
    for chunk in samples.chunks_exact(4) {
        floats.push(f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]));
    }
    send_command(&state, AudioOutputCommand::AppendPlaybackPcm(floats))
}

#[tauri::command]
pub fn start_native_playback(state: tauri::State<'_, AudioOutputState>) -> Result<(), String> {
    send_command_with_reply(&state, |reply| AudioOutputCommand::StartPlayback { reply })
}

#[tauri::command]
pub fn stop_native_playback(state: tauri::State<'_, AudioOutputState>) -> Result<(), String> {
    send_command_with_reply(&state, |reply| AudioOutputCommand::StopOutput { reply })
}
