use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ProcessStatus {
    Running,
    Protected,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProcessItem {
    pub pid: u32,
    pub name: String,
    pub path: String,
    pub status: ProcessStatus,
    pub can_terminate: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TerminateProcessResult {
    pub pid: u32,
    pub name: String,
}
