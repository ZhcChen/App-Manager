use process_core::{
    list_processes as list_processes_impl, terminate_process as terminate_process_impl, ProcessError,
    ProcessItem, TerminateProcessResult,
};

#[tauri::command]
pub fn list_processes() -> Result<Vec<ProcessItem>, ProcessError> {
    list_processes_impl()
}

#[tauri::command]
pub fn terminate_process(pid: u32) -> Result<TerminateProcessResult, ProcessError> {
    terminate_process_impl(pid)
}

#[cfg(test)]
mod tests {
    use process_core::ProcessErrorCode;

    use super::{list_processes, terminate_process};

    #[test]
    fn list_processes_exposes_current_process() {
        let current_pid = std::process::id();
        let processes = list_processes().expect("command should list processes");

        assert!(
            processes.iter().any(|item| item.pid == current_pid),
            "current process should be visible through the tauri command layer"
        );
    }

    #[test]
    fn terminate_process_rejects_self() {
        let error =
            terminate_process(std::process::id()).expect_err("self terminate should fail");

        assert_eq!(error.code, ProcessErrorCode::Protected);
    }
}
