use std::sync::{Mutex, OnceLock};

use sysinfo::{Process, ProcessesToUpdate, System, Users, MINIMUM_CPU_UPDATE_INTERVAL};

use crate::error::ProcessError;
use crate::model::{ProcessItem, ProcessSnapshot, ProcessStatus};

static SYSTEM: OnceLock<Mutex<System>> = OnceLock::new();

pub fn list_processes() -> Result<Vec<ProcessItem>, ProcessError> {
    let snapshots = collect_process_snapshots()?;
    Ok(snapshots
        .into_iter()
        .map(process_item_from_snapshot)
        .collect::<Vec<_>>())
}

pub fn collect_process_snapshots() -> Result<Vec<ProcessSnapshot>, ProcessError> {
    let current_pid = std::process::id();
    let users = Users::new_with_refreshed_list();
    let system = SYSTEM.get_or_init(|| {
        let mut system = System::new_all();

        // Seed CPU usage once so the first visible refresh has real percentages.
        std::thread::sleep(MINIMUM_CPU_UPDATE_INTERVAL);
        system.refresh_processes(ProcessesToUpdate::All, true);

        Mutex::new(system)
    });
    let mut system = system.lock().map_err(|_| {
        ProcessError::system_unavailable("Failed to acquire process monitor state.")
    })?;
    system.refresh_processes(ProcessesToUpdate::All, true);

    let mut items = system
        .processes()
        .values()
        .filter_map(|process| build_process_snapshot(current_pid, process, &users))
        .collect::<Vec<_>>();

    items.sort_by(|left, right| {
        left.name
            .to_lowercase()
            .cmp(&right.name.to_lowercase())
            .then(left.pid.cmp(&right.pid))
    });

    Ok(items)
}

fn build_process_snapshot(
    current_pid: u32,
    process: &Process,
    users: &Users,
) -> Option<ProcessSnapshot> {
    let pid = process.pid().as_u32();
    let name = process.name().to_string_lossy().trim().to_owned();
    if name.is_empty() {
        return None;
    }

    let disk_usage = process.disk_usage();
    let path = process
        .exe()
        .map(|value| value.display().to_string())
        .unwrap_or_default();
    let is_self = pid == current_pid;
    let user_name = process
        .user_id()
        .and_then(|user_id| users.get_user_by_id(user_id))
        .map(|user| user.name().to_owned())
        .unwrap_or_else(|| "—".to_owned());
    let kind_label = infer_kind_label(&path, is_self);

    Some(ProcessSnapshot {
        pid,
        parent_pid: process.parent().map(|value| value.as_u32()),
        name,
        path,
        user_name,
        kind_label,
        cpu_usage_percent: process.cpu_usage(),
        memory_bytes: process.memory(),
        virtual_memory_bytes: process.virtual_memory(),
        run_time_seconds: process.run_time(),
        start_time_seconds: process.start_time(),
        disk_read_bytes: disk_usage.total_read_bytes,
        disk_written_bytes: disk_usage.total_written_bytes,
        status: if is_self {
            ProcessStatus::Protected
        } else {
            ProcessStatus::Running
        },
        can_terminate: !is_self,
    })
}

fn process_item_from_snapshot(snapshot: ProcessSnapshot) -> ProcessItem {
    ProcessItem {
        pid: snapshot.pid,
        name: snapshot.name,
        path: snapshot.path,
        user_name: snapshot.user_name,
        kind_label: snapshot.kind_label,
        cpu_usage_percent: snapshot.cpu_usage_percent,
        memory_bytes: snapshot.memory_bytes,
        virtual_memory_bytes: snapshot.virtual_memory_bytes,
        run_time_seconds: snapshot.run_time_seconds,
        start_time_seconds: snapshot.start_time_seconds,
        disk_read_bytes: snapshot.disk_read_bytes,
        disk_written_bytes: snapshot.disk_written_bytes,
        status: snapshot.status,
        can_terminate: snapshot.can_terminate,
    }
}

pub(crate) fn infer_kind_label(path: &str, is_self: bool) -> String {
    if is_self {
        return "工具".to_owned();
    }

    if path.ends_with(".app") {
        return "App".to_owned();
    }

    if path.starts_with("/System/") {
        return "系统".to_owned();
    }

    "后台".to_owned()
}
