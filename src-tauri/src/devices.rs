use cpal::traits::{DeviceTrait, HostTrait};
use serde::Serialize;

#[derive(Clone, Serialize)]
pub struct DeviceInfo {
    pub id: String,
    pub label: String,
}

#[tauri::command]
pub fn list_audio_output_devices() -> Vec<DeviceInfo> {
    let host = cpal::default_host();
    let Ok(devices) = host.output_devices() else {
        return Vec::new();
    };

    let mut out = Vec::new();
    for device in devices {
        let Ok(name) = device.name() else {
            continue;
        };
        let label = name.trim().to_string();
        if label.is_empty() {
            continue;
        }
        out.push(DeviceInfo {
            id: label.clone(),
            label,
        });
    }
    out.sort_by(|a, b| a.label.cmp(&b.label));
    out
}

#[tauri::command]
pub fn list_midi_ports() -> Vec<DeviceInfo> {
    let Ok(midi) = midir::MidiOutput::new("gsc-device-list") else {
        return Vec::new();
    };

    let ports = midi.ports();
    let mut out = Vec::with_capacity(ports.len());
    for (index, port) in ports.iter().enumerate() {
        let name = midi
            .port_name(port)
            .unwrap_or_else(|_| format!("MIDI {}", index + 1));
        let label = name.trim().to_string();
        out.push(DeviceInfo {
            id: index.to_string(),
            label: if label.is_empty() {
                format!("MIDI {}", index + 1)
            } else {
                label
            },
        });
    }
    out
}
