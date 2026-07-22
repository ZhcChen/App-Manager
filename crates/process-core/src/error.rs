use serde::Serialize;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ProcessErrorCode {
    NotFound,
    Protected,
    Unsupported,
    OperationFailed,
    SystemUnavailable,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessError {
    pub code: ProcessErrorCode,
    pub message: String,
}

impl ProcessError {
    pub fn not_found(pid: u32) -> Self {
      Self {
          code: ProcessErrorCode::NotFound,
          message: format!("Process {pid} no longer exists."),
      }
    }

    pub fn protected(pid: u32) -> Self {
        Self {
            code: ProcessErrorCode::Protected,
            message: format!("Process {pid} is protected and cannot be ended."),
        }
    }

    pub fn unsupported(message: impl Into<String>) -> Self {
        Self {
            code: ProcessErrorCode::Unsupported,
            message: message.into(),
        }
    }

    pub fn operation_failed(message: impl Into<String>) -> Self {
        Self {
            code: ProcessErrorCode::OperationFailed,
            message: message.into(),
        }
    }

    pub fn system_unavailable(message: impl Into<String>) -> Self {
        Self {
            code: ProcessErrorCode::SystemUnavailable,
            message: message.into(),
        }
    }
}
