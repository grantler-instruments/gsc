use midir::{MidiInput, MidiInputConnection};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

pub struct MidiInputState(pub Mutex<Option<MidiInputConnection<()>>>);

#[tauri::command]
pub fn list_midi_input_ports() -> Vec<super::devices::DeviceInfo> {
    let Ok(midi) = MidiInput::new("gsc-midi-in-list") else {
        return Vec::new();
    };

    let ports = midi.ports();
    let mut out = Vec::with_capacity(ports.len());
    for (index, port) in ports.iter().enumerate() {
        let name = midi
            .port_name(port)
            .unwrap_or_else(|_| format!("MIDI In {}", index + 1));
        let label = name.trim().to_string();
        out.push(super::devices::DeviceInfo {
            id: index.to_string(),
            label: if label.is_empty() {
                format!("MIDI In {}", index + 1)
            } else {
                label
            },
        });
    }
    out
}

#[tauri::command]
pub fn start_midi_input(
    app: AppHandle,
    state: State<'_, MidiInputState>,
    port_id: String,
) -> Result<(), String> {
    stop_midi_input_inner(&state)?;

    let index: usize = port_id
        .parse()
        .map_err(|_| format!("invalid MIDI port id: {port_id}"))?;

    let midi_in = MidiInput::new("gsc-midi-in").map_err(|e| e.to_string())?;
    let ports = midi_in.ports();
    let port = ports
        .get(index)
        .ok_or_else(|| format!("MIDI input port not found: {port_id}"))?;

    let app_handle = app.clone();
    let conn = midi_in
        .connect(
            port,
            "gsc-midi-listen",
            move |_timestamp, message, _| {
                let _ = app_handle.emit("midi://message", message.to_vec());
            },
            (),
        )
        .map_err(|e| e.to_string())?;

    *state.0.lock().map_err(|e| e.to_string())? = Some(conn);
    Ok(())
}

fn stop_midi_input_inner(state: &State<'_, MidiInputState>) -> Result<(), String> {
    *state.0.lock().map_err(|e| e.to_string())? = None;
    Ok(())
}

#[tauri::command]
pub fn stop_midi_input(state: State<'_, MidiInputState>) -> Result<(), String> {
    stop_midi_input_inner(&state)
}
