use process_core::{
    build_application_groups, ProcessSnapshot, ProcessStatus,
};

#[test]
fn groups_multi_instance_bundle_processes_under_one_application() {
    let groups = build_application_groups(vec![
        snapshot(
            100,
            None,
            "Chrome for Testing",
            "/Applications/Chrome for Testing.app/Contents/MacOS/Chrome for Testing",
            100,
        ),
        snapshot(
            101,
            Some(100),
            "Chrome for Testing Helper (Renderer)",
            "/Applications/Chrome for Testing.app/Contents/Frameworks/Chrome Helper.app/Contents/MacOS/Chrome Helper",
            101,
        ),
        snapshot(
            102,
            Some(100),
            "Chrome for Testing Helper (GPU)",
            "/Applications/Chrome for Testing.app/Contents/Frameworks/Chrome Helper.app/Contents/MacOS/Chrome Helper",
            102,
        ),
        snapshot(
            200,
            None,
            "Chrome for Testing",
            "/Applications/Chrome for Testing.app/Contents/MacOS/Chrome for Testing",
            200,
        ),
        snapshot(
            201,
            Some(200),
            "Chrome for Testing Helper (Renderer)",
            "/Applications/Chrome for Testing.app/Contents/Frameworks/Chrome Helper.app/Contents/MacOS/Chrome Helper",
            201,
        ),
        snapshot(
            300,
            None,
            "WeChat",
            "/Applications/WeChat.app/Contents/MacOS/WeChat",
            300,
        ),
    ]);

    let chrome = groups
        .iter()
        .find(|group| group.name == "Chrome for Testing")
        .expect("chrome group should exist");

    assert_eq!(chrome.instance_count, 2);
    assert_eq!(chrome.process_count, 5);
    assert_eq!(chrome.instances.len(), 2);
    assert_eq!(chrome.instances[0].children.len(), 2);
    assert_eq!(chrome.instances[1].children.len(), 1);
}

#[test]
fn falls_back_to_name_grouping_without_paths_and_promotes_orphans_to_instance_roots() {
    let groups = build_application_groups(vec![
        snapshot(10, None, "Code", "", 10),
        snapshot(11, Some(10), "Code Helper (Renderer)", "", 11),
        snapshot(12, Some(999), "Code", "", 12),
        snapshot(20, None, "WeChat", "", 20),
    ]);

    let code = groups
        .iter()
        .find(|group| group.name == "Code")
        .expect("code group should exist");

    assert_eq!(code.instance_count, 2);
    assert_eq!(code.process_count, 3);
    assert_eq!(code.instances[0].children.len(), 1);
    assert_eq!(code.instances[1].children.len(), 0);
}

fn snapshot(
    pid: u32,
    parent_pid: Option<u32>,
    name: &str,
    path: &str,
    start_time_seconds: u64,
) -> ProcessSnapshot {
    ProcessSnapshot {
        pid,
        parent_pid,
        name: name.to_owned(),
        path: path.to_owned(),
        user_name: "tester".to_owned(),
        kind_label: "App".to_owned(),
        cpu_usage_percent: 0.0,
        memory_bytes: 0,
        virtual_memory_bytes: 0,
        run_time_seconds: 0,
        start_time_seconds,
        disk_read_bytes: 0,
        disk_written_bytes: 0,
        status: ProcessStatus::Running,
        can_terminate: true,
    }
}
