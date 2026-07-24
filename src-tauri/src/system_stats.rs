use std::sync::Mutex;

use serde::Serialize;
use sysinfo::{Pid, ProcessesToUpdate, System};
use tauri::State;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessStats {
    pub cpu_percent: f32,
    pub memory_mb: f32,
}

pub struct SystemStatsState {
    system: Mutex<System>,
    /// First CPU sample is usually 0 until a second refresh; prime once.
    primed: Mutex<bool>,
}

impl Default for SystemStatsState {
    fn default() -> Self {
        Self {
            system: Mutex::new(System::new()),
            primed: Mutex::new(false),
        }
    }
}

#[tauri::command]
pub fn get_process_stats(state: State<'_, SystemStatsState>) -> Result<ProcessStats, String> {
    let pid = Pid::from_u32(std::process::id());
    let mut system = state.system.lock().map_err(|e| e.to_string())?;

    system.refresh_processes(ProcessesToUpdate::Some(&[pid]), true);

    let mut primed = state.primed.lock().map_err(|e| e.to_string())?;
    if !*primed {
        std::thread::sleep(std::time::Duration::from_millis(200));
        system.refresh_processes(ProcessesToUpdate::Some(&[pid]), true);
        *primed = true;
    }

    let process = system
        .process(pid)
        .ok_or_else(|| "Current process not found in system stats".to_string())?;

    Ok(ProcessStats {
        cpu_percent: process.cpu_usage(),
        memory_mb: process.memory() as f32 / (1024.0 * 1024.0),
    })
}
