import { ipcMain } from "electron";
import { DESKTOP_CHANNELS } from "./channels.cjs";
import { createBootstrapState } from "./bootstrapState.cjs";
import { commandOk } from "./result.cjs";

export function registerBootstrapHandlers() {
  ipcMain.handle(DESKTOP_CHANNELS.bootstrapState, () => {
    return commandOk(createBootstrapState());
  });
}
