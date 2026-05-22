use rosc::{OscMessage, OscPacket, OscType};
use serde::Deserialize;
use std::net::UdpSocket;

#[derive(Debug, Deserialize)]
pub(crate) struct OscArgInput {
    #[serde(rename = "type")]
    kind: String,
    value: serde_json::Value,
}

fn value_as_i32(value: &serde_json::Value) -> Option<i32> {
    if let Some(v) = value.as_i64() {
        return i32::try_from(v).ok();
    }
    if let Some(v) = value.as_f64() {
        if v.fract() == 0.0 {
            return i32::try_from(v as i64).ok();
        }
    }
    if let Some(v) = value.as_str() {
        return v.parse().ok();
    }
    None
}

fn value_as_f32(value: &serde_json::Value) -> Option<f32> {
    if let Some(v) = value.as_f64() {
        return Some(v as f32);
    }
    if let Some(v) = value.as_str() {
        return v.parse().ok();
    }
    None
}

fn value_as_string(value: &serde_json::Value) -> Option<String> {
    match value {
        serde_json::Value::String(s) => Some(s.clone()),
        serde_json::Value::Number(n) => Some(n.to_string()),
        serde_json::Value::Bool(b) => Some(b.to_string()),
        _ => None,
    }
}

fn osc_type_from_arg(arg: OscArgInput) -> Result<OscType, String> {
    match arg.kind.as_str() {
        "int" => value_as_i32(&arg.value)
            .map(OscType::Int)
            .ok_or_else(|| format!("invalid int arg: {}", arg.value)),
        "float" => value_as_f32(&arg.value)
            .map(OscType::Float)
            .ok_or_else(|| format!("invalid float arg: {}", arg.value)),
        "string" => value_as_string(&arg.value)
            .map(OscType::String)
            .ok_or_else(|| format!("invalid string arg: {}", arg.value)),
        "bool" => arg
            .value
            .as_bool()
            .map(OscType::Bool)
            .ok_or_else(|| format!("invalid bool arg: {}", arg.value)),
        other => Err(format!("unsupported OSC arg type: {other}")),
    }
}

#[tauri::command]
pub fn send_osc(
    host: String,
    port: u16,
    address: String,
    args: Vec<OscArgInput>,
) -> Result<(), String> {
    if address.is_empty() || !address.starts_with('/') {
        return Err("OSC address must start with /".to_string());
    }
    let host = host.trim();
    if host.is_empty() {
        return Err("OSC host is required".to_string());
    }
    if port == 0 {
        return Err("OSC port must be greater than 0".to_string());
    }

    let osc_args: Vec<OscType> = args
        .into_iter()
        .map(osc_type_from_arg)
        .collect::<Result<Vec<_>, _>>()?;
    let msg = OscMessage {
        addr: address,
        args: osc_args,
    };
    let packet = OscPacket::Message(msg);
    let encoded = rosc::encoder::encode(&packet).map_err(|e| e.to_string())?;

    let socket = UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
    let dest = format!("{host}:{port}");
    socket.send_to(&encoded, &dest).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deserializes_int_and_string_args() {
        let int_json = r#"{"type":"int","value":1}"#;
        let int_arg: OscArgInput = serde_json::from_str(int_json).unwrap();
        assert!(matches!(
            osc_type_from_arg(int_arg).unwrap(),
            OscType::Int(1)
        ));

        let string_json = r#"{"type":"string","value":"hello"}"#;
        let string_arg: OscArgInput = serde_json::from_str(string_json).unwrap();
        assert!(matches!(
            osc_type_from_arg(string_arg).unwrap(),
            OscType::String(s) if s == "hello"
        ));
    }

    #[test]
    fn encodes_int_and_string_in_osc_packet() {
        let msg = OscMessage {
            addr: "/test".to_string(),
            args: vec![
                OscType::Int(1),
                OscType::String("hello".to_string()),
            ],
        };
        let encoded = rosc::encoder::encode(&OscPacket::Message(msg)).unwrap();
        assert!(!encoded.is_empty());
    }
}
