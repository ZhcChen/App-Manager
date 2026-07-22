import { ipcMain } from "electron";
import { DESKTOP_CHANNELS } from "./channels.cjs";
import {
  listProcessesFromSidecar,
  terminateProcessViaSidecar
} from "../native/processSidecar.cjs";

export function registerProcessHandlers() {
  ipcMain.handle(DESKTOP_CHANNELS.listProcesses, async () => {
    return listProcessesFromSidecar();
  });

  ipcMain.handle(
    DESKTOP_CHANNELS.terminateProcess,
    async (_event, pid: number) => {
      return terminateProcessViaSidecar(pid);
    }
  );
}
