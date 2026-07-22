export type ElectronBootstrapState = {
  appName: string;
  runtime: "electron";
  shell: "desktop";
};

export function createBootstrapState(): ElectronBootstrapState {
  return {
    appName: "App Manager",
    runtime: "electron",
    shell: "desktop"
  };
}
