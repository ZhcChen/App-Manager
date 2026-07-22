import type {
  ProcessItem,
  TerminateProcessResult
} from "@/features/processes/types";
import type { DesktopBootstrap } from "./desktopRuntime";

export type DesktopBridge = {
  bootstrapState(): Promise<DesktopBootstrap>;
  listProcesses(): Promise<ProcessItem[]>;
  terminateProcess(pid: number): Promise<TerminateProcessResult>;
};

declare global {
  interface Window {
    appManagerDesktop?: DesktopBridge;
  }
}

export function getDesktopBridge(): DesktopBridge | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.appManagerDesktop ?? null;
}

export function isDesktopBridgeAvailable() {
  return getDesktopBridge() !== null;
}
