import type { ProcessItem } from "./types";

export const mockProcesses: ProcessItem[] = [
  {
    pid: 1824,
    name: "Google Chrome",
    path: "/Applications/Google Chrome.app",
    status: "running",
    canTerminate: true
  },
  {
    pid: 2831,
    name: "WeChat",
    path: "/Applications/WeChat.app",
    status: "running",
    canTerminate: true
  },
  {
    pid: 3321,
    name: "Terminal",
    path: "/System/Applications/Utilities/Terminal.app",
    status: "running",
    canTerminate: true
  },
  {
    pid: 5188,
    name: "App Manager",
    path: "/Applications/App Manager.app",
    status: "protected",
    canTerminate: false
  },
  {
    pid: 9012,
    name: "Visual Studio Code",
    path: "/Applications/Visual Studio Code.app",
    status: "running",
    canTerminate: true
  }
];
