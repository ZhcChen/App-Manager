use std::{
    net::{TcpListener, UdpSocket},
    thread,
    time::Duration,
};

use process_core::{list_ports, PortProtocol, ProcessStatus};

fn wait_for_binding(
    protocol: PortProtocol,
    port: u16,
    pid: u32,
) -> process_core::PortBindingItem {
    for _ in 0..20 {
        let ports = list_ports().expect("port listing should succeed");
        if let Some(item) = ports
            .into_iter()
            .find(|item| item.protocol == protocol && item.local_port == port && item.pid == pid)
        {
            return item;
        }

        thread::sleep(Duration::from_millis(50));
    }

    panic!("expected port binding {protocol:?}:{port} for pid {pid} to appear");
}

#[test]
fn list_ports_includes_current_process_tcp_listener() {
    let listener = TcpListener::bind(("127.0.0.1", 0)).expect("tcp listener should bind");
    let port = listener
        .local_addr()
        .expect("listener address should exist")
        .port();
    let current_pid = std::process::id();

    let item = wait_for_binding(PortProtocol::Tcp, port, current_pid);

    assert_eq!(item.status, ProcessStatus::Protected);
    assert!(!item.can_terminate);
    assert!(!item.name.is_empty());
    assert_eq!(item.local_port, port);

    drop(listener);
}

#[test]
fn list_ports_includes_current_process_udp_socket() {
    let socket = UdpSocket::bind(("127.0.0.1", 0)).expect("udp socket should bind");
    let port = socket
        .local_addr()
        .expect("socket address should exist")
        .port();
    let current_pid = std::process::id();

    let item = wait_for_binding(PortProtocol::Udp, port, current_pid);

    assert_eq!(item.status, ProcessStatus::Protected);
    assert!(!item.can_terminate);
    assert!(!item.name.is_empty());
    assert_eq!(item.local_port, port);

    drop(socket);
}
