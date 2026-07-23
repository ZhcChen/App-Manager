import { BrowserWindow, Menu, ipcMain } from "electron";
import { DESKTOP_CHANNELS } from "./channels.cjs";
import { commandOk } from "./result.cjs";
import {
  listPortsFromSidecar,
  listProcessesFromSidecar,
  terminateProcessViaSidecar
} from "../native/processSidecar.cjs";

type ProcessContextMenuPayload = {
  item: { pid: number; name: string; canTerminate: boolean };
  position: {
    x: number;
    y: number;
  };
};

export function registerProcessHandlers() {
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
    DESKTOP_CHANNELS.showProcessContextMenu,
    (event, payload: ProcessContextMenuPayload) => {
      const senderWindow = BrowserWindow.fromWebContents(event.sender);
      const menu = Menu.buildFromTemplate([
        {
          label: `结束“${payload.item.name}”`,
          enabled: payload.item.canTerminate,
          click: () => {
            event.sender.send(DESKTOP_CHANNELS.processContextAction, {
              action: "terminate",
              pid: payload.item.pid
            });
          }
        }
      ]);

      menu.popup({
        window: senderWindow ?? undefined,
        x: Math.round(payload.position.x),
        y: Math.round(payload.position.y)
      });

      return commandOk(null);
    }
  );
}
