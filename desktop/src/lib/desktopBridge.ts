import type {
  ProcessItem,
  TerminateProcessResult
} from "@/features/processes/types";
import type { PortBindingItem } from "@/features/ports/types";
import type { UpdateCheckResult } from "@/features/updates/types";
import type { DesktopBootstrap } from "./desktopRuntime";

export type DesktopContextMenuPosition = {
  x: number;
  y: number;
};

export type DesktopContextMenuItem = {
  pid: number;
  name: string;
  canTerminate: boolean;
};

export type ProcessContextAction = {
  action: "terminate";
  pid: number;
};

export type DesktopBridge = {
  bootstrapState(): Promise<DesktopBootstrap>;
  listProcesses(): Promise<ProcessItem[]>;
  listPorts(): Promise<PortBindingItem[]>;
  terminateProcess(pid: number): Promise<TerminateProcessResult>;
  checkForUpdates?(): Promise<UpdateCheckResult>;
  openUpdateDownload?(url: string): Promise<void>;
  showProcessContextMenu?(
    item: DesktopContextMenuItem,
    position: DesktopContextMenuPosition
  ): Promise<void>;
  onProcessContextAction?(
    listener: (action: ProcessContextAction) => void
  ): () => void;
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
