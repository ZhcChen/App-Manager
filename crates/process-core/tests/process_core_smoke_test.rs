use process_core::{list_processes, terminate_process, ProcessErrorCode};

#[test]
fn list_processes_includes_current_process() {
    let current_pid = std::process::id();
    let processes = list_processes().expect("process listing should succeed");
    let current = processes
        .iter()
        .find(|item| item.pid == current_pid)
        .expect("current process should appear in the list");

    assert_eq!(current.status, process_core::ProcessStatus::Protected);
    assert!(!current.can_terminate);
    assert!(!current.name.is_empty());
    assert!(!current.user_name.is_empty());
}

#[test]
fn terminate_process_rejects_current_process() {
    let error = terminate_process(std::process::id()).expect_err("self terminate should fail");
    assert_eq!(error.code, ProcessErrorCode::Protected);
}

#[test]
fn terminate_process_reports_missing_pid() {
    let error = terminate_process(u32::MAX).expect_err("missing pid should fail");
    assert_eq!(error.code, ProcessErrorCode::NotFound);
}
