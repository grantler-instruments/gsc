use serde::Deserialize;
use std::net::UdpSocket;

#[derive(Debug, Deserialize)]
pub(crate) struct DmxUniverseInput {
    host: String,
    port: u16,
    universe: u16,
    data: Vec<u8>,
}

fn build_artdmx_packet(universe: u16, data: &[u8]) -> Vec<u8> {
    let length = data.len().min(512);
    let mut packet = Vec::with_capacity(18 + length);
    packet.extend_from_slice(b"Art-Net\0");
    packet.extend_from_slice(&0x5000u16.to_le_bytes());
    packet.extend_from_slice(&14u16.to_be_bytes());
    packet.push(0);
    packet.push(0);
    packet.extend_from_slice(&universe.to_le_bytes());
    packet.extend_from_slice(&(length as u16).to_be_bytes());
    packet.extend_from_slice(&data[..length]);
    packet
}

#[tauri::command]
pub fn send_dmx(host: String, port: u16, universe: u16, data: Vec<u8>) -> Result<(), String> {
    let host = host.trim();
    if host.is_empty() {
        return Err("Art-Net host is required".to_string());
    }
    if port == 0 {
        return Err("Art-Net port must be greater than 0".to_string());
    }

    let packet = build_artdmx_packet(universe, &data);
    let socket = UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
    let dest = format!("{host}:{port}");
    socket
        .send_to(&packet, &dest)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_artdmx_header() {
        let packet = build_artdmx_packet(0, &[255, 128]);
        assert_eq!(&packet[0..8], b"Art-Net\0");
        assert_eq!(packet[8], 0x00);
        assert_eq!(packet[9], 0x50);
        assert_eq!(packet.len(), 18 + 2);
        assert_eq!(packet[18], 255);
        assert_eq!(packet[19], 128);
    }
}
