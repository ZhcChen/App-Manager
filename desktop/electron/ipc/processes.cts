import { BrowserWindow, Menu, ipcMain, type WebContents } from "electron";
import { DESKTOP_CHANNELS } from "./channels.cjs";
import { commandOk } from "./result.cjs";
import {
  listApplicationsFromSidecar,
  listPortsFromSidecar,
  listProcessesFromSidecar,
  terminateProcessesViaSidecar,
  terminateProcessViaSidecar
} from "../native/processSidecar.cjs";

type ProcessContextMenuPayload = {
  item: { pid: number; name: string; canTerminate: boolean };
  position: {
    x: number;
    y: number;
  };
};

type ApplicationContextMenuPayload = {
  item: {
    kind: "application" | "instance" | "process";
    id: string;
    name: string;
    canTerminate: boolean;
    pids: number[];
  };
  position: {
    x: number;
    y: number;
  };
};

type ContextMenuAction =
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

type ContextMenuSender = Pick<WebContents, "send">;

export function registerProcessHandlers() {
  ipcMain.handle(DESKTOP_CHANNELS.listApplications, async () => {
    return listApplicationsFromSidecar();
  });

  ipcMain.handle(DESKTOP_CHANNELS.listProcesses, async () => {
    return listProcessesFromSidecar();
  });

  ipcMain.handle(DESKTOP_CHANNELS.listPorts, async () => {
    return listPortsFromSidecar();
  });

  ipcMain.handle(
    DESKTOP_CHANNELS.terminateProcess,
    async (_event, pid: number) => {
      return terminateProcessViaSidecar(pid);
    }
  );

  ipcMain.handle(
    DESKTOP_CHANNELS.terminateProcesses,
    async (_event, pids: number[]) => {
      return terminateProcessesViaSidecar(pids);
    }
  );

  ipcMain.handle(
    DESKTOP_CHANNELS.showProcessContextMenu,
    (event, payload: ProcessContextMenuPayload) => {
      const senderWindow = BrowserWindow.fromWebContents(event.sender);
      const menu = Menu.buildFromTemplate(
        buildProcessContextMenuTemplate(event.sender, payload.item)
      );

      menu.popup({
        window: senderWindow ?? undefined,
        x: Math.round(payload.position.x),
        y: Math.round(payload.position.y)
      });

      return commandOk(null);
    }
  );

  ipcMain.handle(
    DESKTOP_CHANNELS.showApplicationContextMenu,
    (event, payload: ApplicationContextMenuPayload) => {
      const senderWindow = BrowserWindow.fromWebContents(event.sender);
      const menu = Menu.buildFromTemplate(
        buildApplicationContextMenuTemplate(event.sender, payload.item)
      );

      menu.popup({
        window: senderWindow ?? undefined,
        x: Math.round(payload.position.x),
        y: Math.round(payload.position.y)
      });

      return commandOk(null);
    }
  );
}

function buildProcessContextMenuTemplate(
  sender: ContextMenuSender,
  item: ProcessContextMenuPayload["item"]
) {
  return [
    {
      label: `结束“${item.name}”`,
      enabled: item.canTerminate,
      click: () => {
        sender.send(
          DESKTOP_CHANNELS.processContextAction,
          buildProcessContextAction(item.pid)
        );
      }
    }
  ];
}

export function buildApplicationContextMenuTemplate(
  sender: ContextMenuSender,
  item: ApplicationContextMenuPayload["item"]
) {
  const action = buildApplicationContextAction(item);

  return [
    {
      label: getApplicationContextMenuLabel(item),
      enabled: item.canTerminate && action.pids.length > 0,
      click: () => {
        sender.send(DESKTOP_CHANNELS.processContextAction, action);
      }
    }
  ];
}

function buildProcessContextAction(pid: number): ContextMenuAction {
  return {
    action: "terminate",
    pid
  };
}

export function buildApplicationContextAction(
  item: ApplicationContextMenuPayload["item"]
): ContextMenuAction & { action: "terminateMany" } {
  return {
    action: "terminateMany",
    id: item.id,
    targetKind: item.kind,
    name: item.name,
    pids: item.pids
  };
}

export function getApplicationContextMenuLabel(
  item: ApplicationContextMenuPayload["item"]
) {
  switch (item.kind) {
    case "application":
      return `结束“${item.name}”全部实例`;
    case "instance":
      return `结束“${item.name}”实例`;
    case "process":
      return `结束“${item.name}”进程`;
  }
}
