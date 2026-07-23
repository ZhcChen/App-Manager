import { contextBridge, ipcRenderer } from "electron";
import type { ElectronBootstrapState } from "./ipc/bootstrapState.cjs";
import { DESKTOP_CHANNELS } from "./ipc/channels.cjs";
import type { DesktopCommandResult } from "./ipc/result.cjs";

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

type TerminateProcessResult = {
  pid: number;
  name: string;
};

type ProcessContextMenuPosition = {
  x: number;
  y: number;
};

type ProcessContextAction = {
  action: "terminate";
  pid: number;
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
  listProcesses() {
    return invokeDesktopChannel<ProcessItem[]>(DESKTOP_CHANNELS.listProcesses);
  },
  terminateProcess(pid: number) {
    return invokeDesktopChannel<TerminateProcessResult>(
      DESKTOP_CHANNELS.terminateProcess,
      pid
    );
  },
  showProcessContextMenu(
    item: ProcessItem,
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
