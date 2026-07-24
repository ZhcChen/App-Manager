mod protocol;

use std::env;

use process_core::{
    list_applications, list_ports, list_processes, terminate_process, terminate_processes,
    ProcessError,
};
use protocol::SidecarResponse;
use serde::Serialize;

fn main() {
    let output = match parse_command(env::args().skip(1).collect()) {
        Ok(Command::List) => serialize_result(list_processes()),
        Ok(Command::ListApplications) => serialize_result(list_applications()),
        Ok(Command::ListPorts) => serialize_result(list_ports()),
        Ok(Command::TerminateMany(pids)) => serialize_result(terminate_processes(pids)),
        Ok(Command::Terminate(pid)) => serialize_result(terminate_process(pid)),
        Err(error) => serialize_response(SidecarResponse::<()>::error(error)),
    };

    println!("{output}");
}

fn serialize_result<T: Serialize>(result: Result<T, ProcessError>) -> String {
    match result {
        Ok(data) => serialize_response(SidecarResponse::success(data)),
        Err(error) => serialize_response(SidecarResponse::<T>::error(error)),
    }
}

fn serialize_response<T: Serialize>(response: SidecarResponse<T>) -> String {
    match serde_json::to_string(&response) {
        Ok(output) => output,
        Err(error) => {
            let fallback = SidecarResponse::<()>::error(ProcessError::operation_failed(
                format!("Failed to serialize sidecar response: {error}"),
            ));

            serde_json::to_string(&fallback)
                .expect("fallback sidecar response should be serializable")
        }
    }
}

#[derive(Debug, PartialEq, Eq)]
enum Command {
    List,
    ListApplications,
    ListPorts,
    TerminateMany(Vec<u32>),
    Terminate(u32),
}

fn parse_command(args: Vec<String>) -> Result<Command, ProcessError> {
    match args.as_slice() {
        [command] if command == "list" => Ok(Command::List),
        [command] if command == "list-applications" => Ok(Command::ListApplications),
        [command] if command == "list-ports" => Ok(Command::ListPorts),
        [command, rest @ ..] if command == "terminate-many" && !rest.is_empty() => {
            let mut pids = Vec::with_capacity(rest.len());

            for raw_pid in rest {
                let pid = raw_pid.parse::<u32>().map_err(|_| {
                    ProcessError::operation_failed(format!("Invalid pid: {raw_pid}"))
                })?;
                pids.push(pid);
            }

            Ok(Command::TerminateMany(pids))
        }
        [command, pid] if command == "terminate" => pid
            .parse::<u32>()
            .map(Command::Terminate)
            .map_err(|_| ProcessError::operation_failed(format!("Invalid pid: {pid}"))),
        _ => Err(ProcessError::operation_failed(
            "Usage: process-sidecar <list|list-applications|list-ports|terminate <pid>|terminate-many <pid>...>",
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::{parse_command, Command};

    #[test]
    fn parses_list_command() {
        assert_eq!(parse_command(vec!["list".into()]).unwrap(), Command::List);
    }

    #[test]
    fn parses_terminate_command() {
        assert_eq!(
            parse_command(vec!["terminate".into(), "42".into()]).unwrap(),
            Command::Terminate(42)
        );
    }

    #[test]
    fn parses_list_applications_command() {
        assert_eq!(
            parse_command(vec!["list-applications".into()]).unwrap(),
            Command::ListApplications
        );
    }

    #[test]
    fn parses_list_ports_command() {
        assert_eq!(
            parse_command(vec!["list-ports".into()]).unwrap(),
            Command::ListPorts
        );
    }

    #[test]
    fn parses_terminate_many_command() {
        assert_eq!(
            parse_command(vec![
                "terminate-many".into(),
                "42".into(),
                "108".into(),
                "256".into()
            ])
            .unwrap(),
            Command::TerminateMany(vec![42, 108, 256])
        );
    }

    #[test]
    fn rejects_invalid_pid() {
        let error = parse_command(vec!["terminate".into(), "abc".into()]).unwrap_err();
        assert_eq!(error.message, "Invalid pid: abc");
    }

    #[test]
    fn rejects_invalid_pid_in_terminate_many() {
        let error = parse_command(vec![
            "terminate-many".into(),
            "42".into(),
            "abc".into(),
        ])
        .unwrap_err();
        assert_eq!(error.message, "Invalid pid: abc");
    }
}
