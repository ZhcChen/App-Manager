import { mockProcesses } from "./mockProcesses";
import type {
  ProcessApiError,
  ProcessItem,
  TerminateProcessResult
} from "./types";
import { getDesktopBridge } from "@/lib/desktopBridge";

let previewProcesses = [...mockProcesses];

export async function listProcesses(): Promise<ProcessItem[]> {
  const bridge = getDesktopBridge();
  if (!bridge) {
    return [...previewProcesses];
  }

  return bridge.listProcesses();
}

export async function terminateProcess(
  pid: number
): Promise<TerminateProcessResult> {
  const bridge = getDesktopBridge();
  if (!bridge) {
    const target = previewProcesses.find((item) => item.pid === pid);

    if (!target) {
      throw toProcessApiError({
        code: "not_found",
        message: `Process ${pid} no longer exists.`
      });
    }

    if (!target.canTerminate) {
      throw toProcessApiError({
        code: "protected",
        message: `Process ${pid} is protected and cannot be ended.`
      });
    }

    previewProcesses = previewProcesses.filter((item) => item.pid !== pid);
    return { pid, name: target.name };
  }

  try {
    return await bridge.terminateProcess(pid);
  } catch (error) {
    throw toProcessApiError(error);
  }
}

export function resetPreviewProcesses() {
  previewProcesses = [...mockProcesses];
}

export function toProcessApiError(error: unknown): ProcessApiError {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error
  ) {
    return {
      code: String((error as { code: unknown }).code),
      message: String((error as { message: unknown }).message)
    };
  }

  if (typeof error === "string") {
    return {
      code: "operation_failed",
      message: error
    };
  }

  return {
    code: "operation_failed",
    message: "The process operation failed."
  };
}
