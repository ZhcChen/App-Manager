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
