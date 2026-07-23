import { getDesktopBridge } from "@/lib/desktopBridge";
import { mockPorts } from "./mockPorts";
import type { PortBindingItem } from "./types";

let previewPorts = [...mockPorts];

export async function listPorts(): Promise<PortBindingItem[]> {
  const bridge = getDesktopBridge();
  if (!bridge) {
    return [...previewPorts];
  }

  return bridge.listPorts();
}

export function resetPreviewPorts() {
  previewPorts = [...mockPorts];
}
