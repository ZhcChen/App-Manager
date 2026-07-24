use process_core::{
    list_applications, list_processes, terminate_process, terminate_processes, ProcessErrorCode,
};

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
fn list_applications_includes_current_process_group() {
    let current_pid = std::process::id();
    let groups = list_applications().expect("application listing should succeed");

    let group = groups
        .iter()
        .find(|item| item.instances.iter().any(|instance| instance.pid == current_pid))
        .expect("current process group should appear in the list");

    assert_eq!(group.status, process_core::ProcessStatus::Protected);
    assert!(!group.instances.is_empty());
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

#[test]
fn terminate_processes_reports_individual_failures() {
    let result = terminate_processes(vec![std::process::id(), u32::MAX])
        .expect("batch terminate should return a result summary");

    assert_eq!(result.total_requested, 2);
    assert_eq!(result.terminated_count, 0);
    assert_eq!(result.failed_count, 2);
    assert_eq!(
        result.results[0]
            .error
            .as_ref()
            .expect("protected pid should include error")
            .code,
        "protected"
    );
    assert_eq!(
        result.results[1]
            .error
            .as_ref()
            .expect("missing pid should include error")
            .code,
        "not_found"
    );
}
