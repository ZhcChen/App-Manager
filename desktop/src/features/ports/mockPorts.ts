import type { PortBindingItem } from "./types";

export const mockPorts: PortBindingItem[] = [
  {
    id: "tcp:127.0.0.1:1430:5188",
    pid: 5188,
    name: "App Manager",
    path: "/Applications/App Manager.app",
    userName: "chen",
    localAddress: "127.0.0.1",
    localPort: 1430,
    protocol: "tcp",
    status: "protected",
    canTerminate: false
  },
  {
    id: "tcp:127.0.0.1:3000:9012",
    pid: 9012,
    name: "Visual Studio Code",
    path: "/Applications/Visual Studio Code.app",
    userName: "chen",
    localAddress: "127.0.0.1",
    localPort: 3000,
    protocol: "tcp",
    status: "running",
    canTerminate: true
  },
  {
    id: "tcp:::5173:3321",
    pid: 3321,
    name: "Terminal",
    path: "/System/Applications/Utilities/Terminal.app",
    userName: "chen",
    localAddress: "::",
    localPort: 5173,
    protocol: "tcp",
    status: "running",
    canTerminate: true
  },
  {
    id: "udp:0.0.0.0:13000:2831",
    pid: 2831,
    name: "WeChat",
    path: "/Applications/WeChat.app",
    userName: "chen",
    localAddress: "0.0.0.0",
    localPort: 13000,
    protocol: "udp",
    status: "running",
    canTerminate: true
  },
  {
    id: "tcp:127.0.0.1:9222:1824",
    pid: 1824,
    name: "Google Chrome",
    path: "/Applications/Google Chrome.app",
    userName: "chen",
    localAddress: "127.0.0.1",
    localPort: 9222,
    protocol: "tcp",
    status: "running",
    canTerminate: true
  }
];
