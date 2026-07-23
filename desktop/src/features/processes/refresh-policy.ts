export type RefreshMode = "initial" | "manual" | "background";

export const AUTO_REFRESH_INTERVAL_MS = 1_000;

export function usesVisibleRefreshState(mode: RefreshMode): boolean {
  return mode !== "background";
}

export function formatRefreshCadence(
  intervalMs = AUTO_REFRESH_INTERVAL_MS
): string {
  return `${Math.floor(intervalMs / 1000)}s`;
}
