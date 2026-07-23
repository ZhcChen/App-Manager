type TerminableItem = {
  status: "running" | "protected";
  canTerminate: boolean;
  pid: number;
};

export function isProtectedProcess(item: TerminableItem): boolean {
  return item.status === "protected" || !item.canTerminate;
}

export function canTerminateProcess(item: TerminableItem): boolean {
  return !isProtectedProcess(item);
}

export function getTerminateActionLabel(
  item: TerminableItem,
  terminatingPid: number | null
): string {
  if (terminatingPid === item.pid) {
    return "Ending...";
  }

  return canTerminateProcess(item) ? "End" : "Locked";
}
