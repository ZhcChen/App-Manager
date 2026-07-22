use sysinfo::{Pid, Signal, System};

use crate::error::ProcessError;
use crate::model::TerminateProcessResult;

pub fn terminate_process(pid: u32) -> Result<TerminateProcessResult, ProcessError> {
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
