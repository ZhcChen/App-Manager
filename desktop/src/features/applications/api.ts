import { getDesktopBridge } from "@/lib/desktopBridge";
import { toProcessApiError } from "@/features/processes/api";
import type { ProcessApiError } from "@/features/processes/types";
import { mockApplications } from "./mockApplications";
import {
  buildApplicationProcessIndex,
  removeApplicationPids
} from "./tree";
import type {
  ApplicationGroupItem,
  TerminateProcessesResult
} from "./types";

let previewApplications = cloneApplicationGroups(mockApplications);

export async function listApplications(): Promise<ApplicationGroupItem[]> {
  const bridge = getDesktopBridge();
  if (!bridge?.listApplications) {
    return cloneApplicationGroups(previewApplications);
  }

  return bridge.listApplications();
}

export async function terminateProcesses(
  pids: number[]
): Promise<TerminateProcessesResult> {
  const bridge = getDesktopBridge();
  if (!bridge?.terminateProcesses) {
    return terminatePreviewProcesses(pids);
  }

  try {
    return await bridge.terminateProcesses(pids);
  } catch (error) {
    throw toApplicationApiError(error);
  }
}

export function resetPreviewApplications() {
  previewApplications = cloneApplicationGroups(mockApplications);
}

export function toApplicationApiError(error: unknown): ProcessApiError {
  return toProcessApiError(error);
}

function terminatePreviewProcesses(pids: number[]): TerminateProcessesResult {
  const index = buildApplicationProcessIndex(previewApplications);
  const uniquePids = [...new Set(pids)];
  const removablePids: number[] = [];
  const results = uniquePids.map((pid) => {
    const target = index.get(pid);
    if (!target) {
      return {
        pid,
        name: `PID ${pid}`,
        ok: false,
        error: {
          code: "not_found",
          message: `Process ${pid} no longer exists.`
        }
      };
    }

    if (!target.canTerminate) {
      return {
        pid,
        name: target.name,
        ok: false,
        error: {
          code: "protected",
          message: `Process ${pid} is protected and cannot be ended.`
        }
      };
    }

    removablePids.push(pid);
    return {
      pid,
      name: target.name,
      ok: true,
      error: null
    };
  });

  previewApplications = removeApplicationPids(previewApplications, removablePids);

  const terminatedCount = results.filter((item) => item.ok).length;

  return {
    totalRequested: results.length,
    terminatedCount,
    failedCount: results.length - terminatedCount,
    results
  };
}

function cloneApplicationGroups(groups: ApplicationGroupItem[]): ApplicationGroupItem[] {
  return structuredClone(groups);
}
