import { app } from "electron";

export type ElectronBootstrapState = {
  appName: string;
  appVersion: string;
  runtime: "electron";
  shell: "desktop";
};

export function createBootstrapState(): ElectronBootstrapState {
  return {
    appName: app.getName(),
    appVersion: app.getVersion(),
    runtime: "electron",
    shell: "desktop"
  };
}
