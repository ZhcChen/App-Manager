mod commands;

use serde::Serialize;

use crate::commands::processes::{list_processes, terminate_process};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BootstrapState {
    app_name: &'static str,
    runtime: &'static str,
    shell: &'static str,
}

#[tauri::command]
fn bootstrap_state() -> BootstrapState {
    BootstrapState {
        app_name: "App Manager",
        runtime: "tauri",
        shell: "desktop",
    }
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            bootstrap_state,
            list_processes,
            terminate_process
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
