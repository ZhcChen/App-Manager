use process_core::ProcessError;
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SuccessResponse<T> {
    pub ok: bool,
    pub data: T,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ErrorResponse {
    pub ok: bool,
    pub error: ProcessError,
}

#[derive(Debug, Serialize)]
#[serde(untagged)]
pub enum SidecarResponse<T> {
    Success(SuccessResponse<T>),
    Error(ErrorResponse),
}

impl<T> SidecarResponse<T> {
    pub fn success(data: T) -> Self {
        Self::Success(SuccessResponse { ok: true, data })
    }

    pub fn error(error: ProcessError) -> Self {
        Self::Error(ErrorResponse { ok: false, error })
    }
}
