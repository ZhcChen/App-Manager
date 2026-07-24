import type { ApplicationGroupItem } from "./types";

export const mockApplications: ApplicationGroupItem[] = [
  {
    id: "application:chrome-for-testing",
    name: "Chrome for Testing",
    path: "/Applications/Chrome for Testing.app",
    instanceCount: 2,
    processCount: 5,
    status: "running",
    canTerminate: true,
    instances: [
      {
        id: "instance:chrome-for-testing:1540:1",
        pid: 1540,
        name: "Chrome for Testing",
        path: "/Applications/Chrome for Testing.app/Contents/MacOS/Chrome for Testing",
        userName: "chen",
        kindLabel: "App",
        startTimeSeconds: 1_721_726_000,
        processCount: 3,
        status: "running",
        canTerminate: true,
        children: [
          {
            id: "process:chrome-for-testing:1541:1",
            pid: 1541,
            parentPid: 1540,
            name: "Chrome Helper (Renderer)",
            path: "/Applications/Chrome for Testing.app/Contents/Frameworks/Chrome Helper.app/Contents/MacOS/Chrome Helper",
            userName: "chen",
            kindLabel: "后台",
            startTimeSeconds: 1_721_726_004,
            status: "running",
            canTerminate: true,
            children: []
          },
          {
            id: "process:chrome-for-testing:1542:1",
            pid: 1542,
            parentPid: 1540,
            name: "Chrome Helper (GPU)",
            path: "/Applications/Chrome for Testing.app/Contents/Frameworks/Chrome Helper.app/Contents/MacOS/Chrome Helper",
            userName: "chen",
            kindLabel: "后台",
            startTimeSeconds: 1_721_726_006,
            status: "running",
            canTerminate: true,
            children: []
          }
        ]
      },
      {
        id: "instance:chrome-for-testing:1620:1",
        pid: 1620,
        name: "Chrome for Testing",
        path: "/Applications/Chrome for Testing.app/Contents/MacOS/Chrome for Testing",
        userName: "chen",
        kindLabel: "App",
        startTimeSeconds: 1_721_730_400,
        processCount: 2,
        status: "running",
        canTerminate: true,
        children: [
          {
            id: "process:chrome-for-testing:1621:1",
            pid: 1621,
            parentPid: 1620,
            name: "Chrome Helper (Renderer)",
            path: "/Applications/Chrome for Testing.app/Contents/Frameworks/Chrome Helper.app/Contents/MacOS/Chrome Helper",
            userName: "chen",
            kindLabel: "后台",
            startTimeSeconds: 1_721_730_405,
            status: "running",
            canTerminate: true,
            children: []
          }
        ]
      }
    ]
  },
  {
    id: "application:wechat",
    name: "WeChat",
    path: "/Applications/WeChat.app",
    instanceCount: 1,
    processCount: 2,
    status: "running",
    canTerminate: true,
    instances: [
      {
        id: "instance:wechat:2831:1",
        pid: 2831,
        name: "WeChat",
        path: "/Applications/WeChat.app/Contents/MacOS/WeChat",
        userName: "chen",
        kindLabel: "App",
        startTimeSeconds: 1_721_715_200,
        processCount: 2,
        status: "running",
        canTerminate: true,
        children: [
          {
            id: "process:wechat:2832:1",
            pid: 2832,
            parentPid: 2831,
            name: "WeChat Helper",
            path: "/Applications/WeChat.app/Contents/Frameworks/WeChat Helper.app/Contents/MacOS/WeChat Helper",
            userName: "chen",
            kindLabel: "后台",
            startTimeSeconds: 1_721_715_205,
            status: "running",
            canTerminate: true,
            children: []
          }
        ]
      }
    ]
  },
  {
    id: "application:app-manager",
    name: "App Manager",
    path: "/Applications/App Manager.app",
    instanceCount: 1,
    processCount: 1,
    status: "protected",
    canTerminate: false,
    instances: [
      {
        id: "instance:app-manager:6301:1",
        pid: 6301,
        name: "App Manager",
        path: "/Applications/App Manager.app/Contents/MacOS/App Manager",
        userName: "chen",
        kindLabel: "工具",
        startTimeSeconds: 1_721_740_400,
        processCount: 1,
        status: "protected",
        canTerminate: false,
        children: []
      }
    ]
  }
];
