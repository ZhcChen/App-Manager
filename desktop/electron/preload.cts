import { contextBridge, ipcRenderer } from "electron";
import type { ElectronBootstrapState } from "./ipc/bootstrapState.cjs";
import { DESKTOP_CHANNELS } from "./ipc/channels.cjs";
import type { DesktopCommandResult } from "./ipc/result.cjs";
import type { UpdateCheckResult } from "./ipc/updates.cjs";

type ProcessItem = {
  pid: number;
  name: string;
  path: string;
  userName: string;
  kindLabel: string;
  cpuUsagePercent: number;
  memoryBytes: number;
  virtualMemoryBytes: number;
  runTimeSeconds: number;
  startTimeSeconds: number;
  diskReadBytes: number;
  diskWrittenBytes: number;
  status: "running" | "protected";
  canTerminate: boolean;
};

type ApplicationProcessNode = {
  id: string;
  pid: number;
  parentPid: number | null;
  name: string;
  path: string;
  userName: string;
  kindLabel: string;
  startTimeSeconds: number;
  status: "running" | "protected";
  canTerminate: boolean;
  children: ApplicationProcessNode[];
};

type ApplicationInstanceItem = {
  id: string;
  pid: number;
  name: string;
  path: string;
  userName: string;
  kindLabel: string;
  startTimeSeconds: number;
  processCount: number;
  status: "running" | "protected";
  canTerminate: boolean;
  children: ApplicationProcessNode[];
};

type ApplicationGroupItem = {
  id: string;
  name: string;
  path: string;
  instanceCount: number;
  processCount: number;
  status: "running" | "protected";
  canTerminate: boolean;
  instances: ApplicationInstanceItem[];
};

type PortBindingItem = {
  id: string;
  pid: number;
  name: string;
  path: string;
  userName: string;
  localAddress: string;
  localPort: number;
  protocol: "tcp" | "udp";
  status: "running" | "protected";
  canTerminate: boolean;
};

type TerminateProcessResult = {
  pid: number;
  name: string;
};

type TerminateProcessFailure = {
  code: string;
  message: string;
};

type TerminateProcessEntryResult = {
  pid: number;
  name: string;
  ok: boolean;
  error: TerminateProcessFailure | null;
};

type TerminateProcessesResult = {
  totalRequested: number;
  terminatedCount: number;
  failedCount: number;
  results: TerminateProcessEntryResult[];
};

type ProcessContextMenuPosition = {
  x: number;
  y: number;
};

type ProcessContextMenuItem = {
  pid: number;
  name: string;
  canTerminate: boolean;
};

type ApplicationContextMenuItem = {
  kind: "application" | "instance" | "process";
  id: string;
  name: string;
  canTerminate: boolean;
  pids: number[];
};

type ProcessContextAction =
  | {
      action: "terminate";
      pid: number;
    }
  | {
      action: "terminateMany";
      id: string;
      targetKind: "application" | "instance" | "process";
      name: string;
      pids: number[];
    };

async function invokeDesktopChannel<T>(
  channel: string,
  ...args: unknown[]
): Promise<T> {
  const result = (await ipcRenderer.invoke(
    channel,
    ...args
  )) as DesktopCommandResult<T>;

  if (!result.ok) {
    return Promise.reject(result.error);
  }

  return result.data;
}

contextBridge.exposeInMainWorld("appManagerDesktop", {
  bootstrapState() {
    return invokeDesktopChannel<ElectronBootstrapState>(
      DESKTOP_CHANNELS.bootstrapState
    );
  },
  listApplications() {
    return invokeDesktopChannel<ApplicationGroupItem[]>(
      DESKTOP_CHANNELS.listApplications
    );
  },
  listProcesses() {
    return invokeDesktopChannel<ProcessItem[]>(DESKTOP_CHANNELS.listProcesses);
  },
  listPorts() {
    return invokeDesktopChannel<PortBindingItem[]>(DESKTOP_CHANNELS.listPorts);
  },
  terminateProcess(pid: number) {
    return invokeDesktopChannel<TerminateProcessResult>(
      DESKTOP_CHANNELS.terminateProcess,
      pid
    );
  },
  terminateProcesses(pids: number[]) {
    return invokeDesktopChannel<TerminateProcessesResult>(
      DESKTOP_CHANNELS.terminateProcesses,
      pids
    );
  },
  checkForUpdates() {
    return invokeDesktopChannel<UpdateCheckResult>(
      DESKTOP_CHANNELS.checkForUpdates
    );
  },
  openUpdateDownload(url: string) {
    return invokeDesktopChannel<null>(
      DESKTOP_CHANNELS.openUpdateDownload,
      url
    ).then(() => undefined);
  },
  showProcessContextMenu(
    item: ProcessContextMenuItem,
    position: ProcessContextMenuPosition
  ) {
    return invokeDesktopChannel<null>(
      DESKTOP_CHANNELS.showProcessContextMenu,
      {
        item,
        position
      }
    ).then(() => undefined);
  },
  showApplicationContextMenu(
    item: ApplicationContextMenuItem,
    position: ProcessContextMenuPosition
  ) {
    return invokeDesktopChannel<null>(
      DESKTOP_CHANNELS.showApplicationContextMenu,
      {
        item,
        position
      }
    ).then(() => undefined);
  },
  onProcessContextAction(listener: (action: ProcessContextAction) => void) {
    const handleAction = (
      _event: unknown,
      action: ProcessContextAction
    ) => {
      listener(action);
    };

    ipcRenderer.on(DESKTOP_CHANNELS.processContextAction, handleAction);

    return () => {
      ipcRenderer.off(DESKTOP_CHANNELS.processContextAction, handleAction);
    };
  }
});
