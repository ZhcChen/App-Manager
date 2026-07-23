import { app } from "electron";

export type ElectronBootstrapState = {
  appName: string;
  runtime: "electron";
  shell: "desktop";
};

export function createBootstrapState(): ElectronBootstrapState {
  return {
    appName: app.getName(),
    runtime: "electron",
    shell: "desktop"
  };
}
