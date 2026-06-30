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
    use std::net::UdpSocket;
    use std::thread;
    use std::time::Duration;

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

    #[test]
    fn builds_artdmx_packet_with_protocol_fields() {
        let packet = build_artdmx_packet(5, &[1, 2, 3]);
        assert_eq!(&packet[0..8], b"Art-Net\0");
        assert_eq!(u16::from_le_bytes([packet[8], packet[9]]), 0x5000);
        assert_eq!(u16::from_be_bytes([packet[10], packet[11]]), 14);
        assert_eq!(packet[12], 0);
        assert_eq!(packet[13], 0);
        assert_eq!(u16::from_le_bytes([packet[14], packet[15]]), 5);
        assert_eq!(u16::from_be_bytes([packet[16], packet[17]]), 3);
        assert_eq!(&packet[18..21], &[1, 2, 3]);
    }

    #[test]
    fn truncates_data_to_512_channels() {
        let data: Vec<u8> = (0..600).map(|i| (i % 256) as u8).collect();
        let packet = build_artdmx_packet(0, &data);
        assert_eq!(packet.len(), 18 + 512);
        assert_eq!(u16::from_be_bytes([packet[16], packet[17]]), 512);
        assert_eq!(&packet[18..530], &data[..512]);
    }

    #[test]
    fn send_dmx_rejects_empty_host() {
        let err = send_dmx("  ".to_string(), 6454, 0, vec![]).unwrap_err();
        assert_eq!(err, "Art-Net host is required");
    }

    #[test]
    fn send_dmx_rejects_zero_port() {
        let err = send_dmx("127.0.0.1".to_string(), 0, 0, vec![]).unwrap_err();
        assert_eq!(err, "Art-Net port must be greater than 0");
    }

    #[test]
    fn send_dmx_delivers_artdmx_packet_over_udp() {
        let receiver = UdpSocket::bind("127.0.0.1:0").expect("bind receiver");
        let port = receiver.local_addr().expect("local addr").port();
        receiver
            .set_read_timeout(Some(Duration::from_secs(2)))
            .expect("timeout");

        let handle = thread::spawn(move || {
            let mut buf = [0u8; 1024];
            let (size, _) = receiver.recv_from(&mut buf).expect("recv");
            buf[..size].to_vec()
        });

        send_dmx("127.0.0.1".to_string(), port, 2, vec![255, 128, 0]).expect("send");

        let packet = handle.join().expect("join");
        let expected = build_artdmx_packet(2, &[255, 128, 0]);
        assert_eq!(packet, expected);
    }
}
