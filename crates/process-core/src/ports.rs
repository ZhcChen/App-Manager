use std::collections::HashSet;

use netstat2::{
    get_sockets_info, AddressFamilyFlags, ProtocolFlags, ProtocolSocketInfo, SocketInfo, TcpState,
};
use sysinfo::{Pid, Process, ProcessesToUpdate, System, Users};

use crate::error::ProcessError;
use crate::model::{PortBindingItem, PortProtocol, ProcessStatus};

type SocketBindingMeta = (PortProtocol, String, u16);

pub fn list_ports() -> Result<Vec<PortBindingItem>, ProcessError> {
    let current_pid = std::process::id();
    let users = Users::new_with_refreshed_list();
    let mut system = System::new_all();
    system.refresh_processes(ProcessesToUpdate::All, true);

    let sockets = get_sockets_info(
        AddressFamilyFlags::IPV4 | AddressFamilyFlags::IPV6,
        ProtocolFlags::TCP | ProtocolFlags::UDP,
    )
    .map_err(|error| {
        ProcessError::system_unavailable(format!(
            "Failed to read listening ports from the operating system: {error}"
        ))
    })?;

    let mut items = Vec::new();
    let mut seen_ids = HashSet::new();

    for socket in sockets {
        let Some((protocol, local_address, local_port)) = extract_socket_binding(&socket) else {
            continue;
        };

        for pid in socket.associated_pids {
            let item = build_port_binding_item(
                current_pid,
                system.process(Pid::from_u32(pid)),
                &users,
                pid,
                protocol.clone(),
                local_address.as_str(),
                local_port,
            );

            if seen_ids.insert(item.id.clone()) {
                items.push(item);
            }
        }
    }

    items.sort_by(|left, right| {
        left.local_port
            .cmp(&right.local_port)
            .then(protocol_sort_key(&left.protocol).cmp(&protocol_sort_key(&right.protocol)))
            .then(left.local_address.cmp(&right.local_address))
            .then(left.name.to_lowercase().cmp(&right.name.to_lowercase()))
            .then(left.pid.cmp(&right.pid))
    });

    Ok(items)
}

fn extract_socket_binding(socket: &SocketInfo) -> Option<SocketBindingMeta> {
    if socket.associated_pids.is_empty() {
        return None;
    }

    match &socket.protocol_socket_info {
        ProtocolSocketInfo::Tcp(tcp_socket) => {
            if tcp_socket.state != TcpState::Listen || tcp_socket.local_port == 0 {
                return None;
            }

            Some((
                PortProtocol::Tcp,
                tcp_socket.local_addr.to_string(),
                tcp_socket.local_port,
            ))
        }
        ProtocolSocketInfo::Udp(udp_socket) => {
            if udp_socket.local_port == 0 {
                return None;
            }

            Some((
                PortProtocol::Udp,
                udp_socket.local_addr.to_string(),
                udp_socket.local_port,
            ))
        }
    }
}

fn build_port_binding_item(
    current_pid: u32,
    process: Option<&Process>,
    users: &Users,
    pid: u32,
    protocol: PortProtocol,
    local_address: &str,
    local_port: u16,
) -> PortBindingItem {
    let is_self = pid == current_pid;
    let name = process
        .map(|entry| entry.name().to_string_lossy().trim().to_owned())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| format!("PID {pid}"));
    let path = process
        .and_then(|entry| entry.exe())
        .map(|value| value.display().to_string())
        .unwrap_or_default();
    let user_name = process
        .and_then(|entry| entry.user_id())
        .and_then(|user_id| users.get_user_by_id(user_id))
        .map(|user| user.name().to_owned())
        .unwrap_or_else(|| "—".to_owned());

    PortBindingItem {
        id: format!(
            "{}:{local_address}:{local_port}:{pid}",
            match protocol {
                PortProtocol::Tcp => "tcp",
                PortProtocol::Udp => "udp",
            }
        ),
        pid,
        name,
        path,
        user_name,
        local_address: local_address.to_owned(),
        local_port,
        protocol,
        status: if is_self {
            ProcessStatus::Protected
        } else {
            ProcessStatus::Running
        },
        can_terminate: !is_self,
    }
}

fn protocol_sort_key(protocol: &PortProtocol) -> u8 {
    match protocol {
        PortProtocol::Tcp => 0,
        PortProtocol::Udp => 1,
    }
}
