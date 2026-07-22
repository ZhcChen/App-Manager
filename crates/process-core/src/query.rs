use sysinfo::{Process, System};

use crate::error::ProcessError;
use crate::model::{ProcessItem, ProcessStatus};

pub fn list_processes() -> Result<Vec<ProcessItem>, ProcessError> {
    let current_pid = std::process::id();
    let system = System::new_all();

    let mut items = system
        .processes()
        .values()
        .filter_map(|process| build_process_item(current_pid, process))
        .collect::<Vec<_>>();

    items.sort_by(|left, right| {
        left.name
            .to_lowercase()
            .cmp(&right.name.to_lowercase())
            .then(left.pid.cmp(&right.pid))
    });

    Ok(items)
}

fn build_process_item(current_pid: u32, process: &Process) -> Option<ProcessItem> {
    let pid = process.pid().as_u32();
    let name = process.name().to_string_lossy().trim().to_owned();
    if name.is_empty() {
        return None;
    }

    let path = process
        .exe()
        .map(|value| value.display().to_string())
        .unwrap_or_default();
    let is_self = pid == current_pid;

    Some(ProcessItem {
        pid,
        name,
        path,
        status: if is_self {
            ProcessStatus::Protected
        } else {
            ProcessStatus::Running
        },
        can_terminate: !is_self,
    })
}
