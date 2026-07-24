use std::collections::HashSet;

use sysinfo::{Pid, Signal, System};

use crate::error::ProcessError;
use crate::model::{
    TerminateProcessEntryResult, TerminateProcessFailure, TerminateProcessResult,
    TerminateProcessesResult,
};

pub fn terminate_process(pid: u32) -> Result<TerminateProcessResult, ProcessError> {
    terminate_one(pid)
}

pub fn terminate_processes(pids: Vec<u32>) -> Result<TerminateProcessesResult, ProcessError> {
    let mut seen = HashSet::new();
    let mut requested = Vec::new();

    for pid in pids {
        if seen.insert(pid) {
            requested.push(pid);
        }
    }

    let mut results = Vec::with_capacity(requested.len());

    for pid in requested {
        match terminate_one(pid) {
            Ok(result) => {
                results.push(TerminateProcessEntryResult {
                    pid: result.pid,
                    name: result.name,
                    ok: true,
                    error: None,
                });
            }
            Err(error) => {
                results.push(TerminateProcessEntryResult {
                    pid,
                    name: lookup_process_name(pid),
                    ok: false,
                    error: Some(TerminateProcessFailure {
                        code: process_error_code_name(&error),
                        message: error.message,
                    }),
                });
            }
        }
    }

    let terminated_count = results.iter().filter(|item| item.ok).count();
    let failed_count = results.len().saturating_sub(terminated_count);

    Ok(TerminateProcessesResult {
        total_requested: results.len(),
        terminated_count,
        failed_count,
        results,
    })
}

fn terminate_one(pid: u32) -> Result<TerminateProcessResult, ProcessError> {
    let current_pid = std::process::id();
    if pid == current_pid {
        return Err(ProcessError::protected(pid));
    }

    let system = System::new_all();
    let process = system
        .process(Pid::from_u32(pid))
        .ok_or_else(|| ProcessError::not_found(pid))?;

    let name = process.name().to_string_lossy().to_string();
    match process.kill_with(Signal::Kill) {
        Some(true) => {}
        Some(false) => {
            return Err(ProcessError::operation_failed(format!(
                "The system refused to end process {name} ({pid})."
            )));
        }
        None => {
            return Err(ProcessError::unsupported(format!(
                "The current platform does not support ending process {name} ({pid}) with this signal."
            )));
        }
    }

    Ok(TerminateProcessResult { pid, name })
}

fn lookup_process_name(pid: u32) -> String {
    let system = System::new_all();
    system
        .process(Pid::from_u32(pid))
        .map(|process| process.name().to_string_lossy().to_string())
        .filter(|name| !name.trim().is_empty())
        .unwrap_or_else(|| format!("PID {pid}"))
}

fn process_error_code_name(error: &ProcessError) -> String {
    match error.code {
        crate::ProcessErrorCode::NotFound => "not_found",
        crate::ProcessErrorCode::Protected => "protected",
        crate::ProcessErrorCode::Unsupported => "unsupported",
        crate::ProcessErrorCode::OperationFailed => "operation_failed",
        crate::ProcessErrorCode::SystemUnavailable => "system_unavailable",
    }
    .to_owned()
}
