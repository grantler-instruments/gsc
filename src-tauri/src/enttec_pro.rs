use serde::Deserialize;
use serialport::{DataBits, FlowControl, Parity, StopBits};
use std::io::Write;
use std::sync::Mutex;
use std::time::Duration;
use tauri::State;

use crate::devices::DeviceInfo;

const ENTTEC_PRO_BAUD_RATE: u32 = 57600;
const DMX_PRO_HEADER_SIZE: usize = 4;
const DMX_PRO_START_MSG: u8 = 0x7E;
const DMX_START_CODE: u8 = 0;
const DMX_START_CODE_SIZE: usize = 1;
const DMX_PRO_SEND_PACKET: u8 = 0x06;
const DMX_PRO_SEND_PACKET2: u8 = 0xA9;
const DMX_PRO_END_MSG: u8 = 0xE7;
const DMX_PRO_END_SIZE: usize = 1;
const ENTTEC_PRO_MAX_CHANNELS: usize = 512;

pub struct EnttecProState(pub Mutex<Option<Box<dyn serialport::SerialPort>>>);

#[derive(Debug, Deserialize)]
pub struct EnttecProFrameInput {
    universe: u16,
    data: Vec<u8>,
}

fn enttec_pro_packet_label(universe: u16) -> Option<u8> {
    match universe {
        1 => Some(DMX_PRO_SEND_PACKET),
        2 => Some(DMX_PRO_SEND_PACKET2),
        _ => None,
    }
}

fn build_enttec_pro_packet(universe: u16, data: &[u8]) -> Option<Vec<u8>> {
    let label = enttec_pro_packet_label(universe)?;
    let channel_count = data.len().min(ENTTEC_PRO_MAX_CHANNELS);
    let data_size = channel_count + DMX_START_CODE_SIZE;
    let packet_size = DMX_PRO_HEADER_SIZE + data_size + DMX_PRO_END_SIZE;
    let mut packet = vec![0u8; packet_size];

    packet[0] = DMX_PRO_START_MSG;
    packet[1] = label;
    packet[2] = (data_size & 0xff) as u8;
    packet[3] = ((data_size >> 8) & 0xff) as u8;
    packet[4] = DMX_START_CODE;
    packet[5..5 + channel_count].copy_from_slice(&data[..channel_count]);
    packet[packet_size - 1] = DMX_PRO_END_MSG;

    Some(packet)
}

#[tauri::command]
pub fn list_serial_ports() -> Vec<DeviceInfo> {
    let Ok(ports) = serialport::available_ports() else {
        return Vec::new();
    };

    let mut out = Vec::with_capacity(ports.len());
    for port in ports {
        let label = match &port.port_type {
            serialport::SerialPortType::UsbPort(info) => {
                format!(
                    "{} ({:04X}:{:04X})",
                    port.port_name, info.vid, info.pid
                )
            }
            _ => port.port_name.clone(),
        };
        out.push(DeviceInfo {
            id: port.port_name,
            label,
        });
    }
    out.sort_by(|a, b| a.label.cmp(&b.label));
    out
}

#[tauri::command]
pub fn connect_enttec_pro(
    state: State<'_, EnttecProState>,
    port_id: String,
) -> Result<(), String> {
    let port_id = port_id.trim();
    if port_id.is_empty() {
        return Err("Serial port is required".to_string());
    }

    let port = serialport::new(port_id, ENTTEC_PRO_BAUD_RATE)
        .timeout(Duration::from_millis(100))
        .data_bits(DataBits::Eight)
        .parity(Parity::None)
        .stop_bits(StopBits::One)
        .flow_control(FlowControl::None)
        .open()
        .map_err(|e| e.to_string())?;

    *state.0.lock().map_err(|e| e.to_string())? = Some(port);
    Ok(())
}

#[tauri::command]
pub fn disconnect_enttec_pro(state: State<'_, EnttecProState>) -> Result<(), String> {
    *state.0.lock().map_err(|e| e.to_string())? = None;
    Ok(())
}

#[tauri::command]
pub fn is_enttec_pro_connected(state: State<'_, EnttecProState>) -> Result<bool, String> {
    Ok(state.0.lock().map_err(|e| e.to_string())?.is_some())
}

#[tauri::command]
pub fn send_enttec_pro_dmx(
    state: State<'_, EnttecProState>,
    frames: Vec<EnttecProFrameInput>,
) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    let port = guard
        .as_mut()
        .ok_or_else(|| "Enttec Pro is not connected".to_string())?;

    for frame in frames {
        let Some(packet) = build_enttec_pro_packet(frame.universe, &frame.data) else {
            continue;
        };
        port.write_all(&packet).map_err(|e| e.to_string())?;
    }
    port.flush().map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_universe_one_packet() {
        let packet = build_enttec_pro_packet(1, &[255, 128]).expect("packet");
        assert_eq!(packet[0], 0x7E);
        assert_eq!(packet[1], 0x06);
        assert_eq!(packet[2], 3);
        assert_eq!(packet[4], 0);
        assert_eq!(packet[5], 255);
        assert_eq!(packet[6], 128);
        assert_eq!(*packet.last().expect("end"), 0xE7);
    }
}
