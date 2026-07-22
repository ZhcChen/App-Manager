import type { ProcessItem } from "./types";

export function isProtectedProcess(item: ProcessItem): boolean {
  return item.status === "protected" || !item.canTerminate;
}

export function canTerminateProcess(item: ProcessItem): boolean {
  return !isProtectedProcess(item);
}

export function getTerminateActionLabel(
  item: ProcessItem,
  terminatingPid: number | null
): string {
  if (terminatingPid === item.pid) {
    return "Ending...";
  }

  return canTerminateProcess(item) ? "End" : "Locked";
}
