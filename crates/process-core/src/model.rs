use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ProcessStatus {
    Running,
    Protected,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PortProtocol {
    Tcp,
    Udp,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ProcessSnapshot {
    pub pid: u32,
    pub parent_pid: Option<u32>,
    pub name: String,
    pub path: String,
    pub user_name: String,
    pub kind_label: String,
    pub cpu_usage_percent: f32,
    pub memory_bytes: u64,
    pub virtual_memory_bytes: u64,
    pub run_time_seconds: u64,
    pub start_time_seconds: u64,
    pub disk_read_bytes: u64,
    pub disk_written_bytes: u64,
    pub status: ProcessStatus,
    pub can_terminate: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProcessItem {
    pub pid: u32,
    pub name: String,
    pub path: String,
    pub user_name: String,
    pub kind_label: String,
    pub cpu_usage_percent: f32,
    pub memory_bytes: u64,
    pub virtual_memory_bytes: u64,
    pub run_time_seconds: u64,
    pub start_time_seconds: u64,
    pub disk_read_bytes: u64,
    pub disk_written_bytes: u64,
    pub status: ProcessStatus,
    pub can_terminate: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ApplicationProcessNode {
    pub id: String,
    pub pid: u32,
    pub parent_pid: Option<u32>,
    pub name: String,
    pub path: String,
    pub user_name: String,
    pub kind_label: String,
    pub start_time_seconds: u64,
    pub status: ProcessStatus,
    pub can_terminate: bool,
    pub children: Vec<ApplicationProcessNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ApplicationInstanceItem {
    pub id: String,
    pub pid: u32,
    pub name: String,
    pub path: String,
    pub user_name: String,
    pub kind_label: String,
    pub start_time_seconds: u64,
    pub process_count: usize,
    pub status: ProcessStatus,
    pub can_terminate: bool,
    pub children: Vec<ApplicationProcessNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ApplicationGroupItem {
    pub id: String,
    pub name: String,
    pub path: String,
    pub instance_count: usize,
    pub process_count: usize,
    pub status: ProcessStatus,
    pub can_terminate: bool,
    pub instances: Vec<ApplicationInstanceItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PortBindingItem {
    pub id: String,
    pub pid: u32,
    pub name: String,
    pub path: String,
    pub user_name: String,
    pub local_address: String,
    pub local_port: u16,
    pub protocol: PortProtocol,
    pub status: ProcessStatus,
    pub can_terminate: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TerminateProcessResult {
    pub pid: u32,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TerminateProcessFailure {
    pub code: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TerminateProcessEntryResult {
    pub pid: u32,
    pub name: String,
    pub ok: bool,
    pub error: Option<TerminateProcessFailure>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TerminateProcessesResult {
    pub total_requested: usize,
    pub terminated_count: usize,
    pub failed_count: usize,
    pub results: Vec<TerminateProcessEntryResult>,
}
