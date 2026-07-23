import { getDesktopBridge, isDesktopBridgeAvailable } from "./desktopBridge";
import packageJson from "../../package.json";

export type DesktopBootstrap = {
  appName: string;
  appVersion: string;
  runtime: "browser" | "electron";
  shell: "desktop";
};

const FALLBACK_STATE: DesktopBootstrap = {
  appName: "App Manager",
  appVersion: packageJson.version,
  runtime: "browser",
  shell: "desktop"
};

export function isElectronRuntime(): boolean {
  return isDesktopBridgeAvailable();
}

export async function loadDesktopBootstrap(): Promise<DesktopBootstrap> {
  const bridge = getDesktopBridge();
  if (!bridge) {
    return FALLBACK_STATE;
  }

  try {
    return await bridge.bootstrapState();
  } catch {
    return {
      ...FALLBACK_STATE,
      runtime: "electron"
    };
  }
}
