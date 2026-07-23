export type RefreshMode = "initial" | "manual" | "background";

export const AUTO_REFRESH_INTERVAL_MS = 3_000;
export const AUTO_REFRESH_INTERVAL_OPTIONS_MS = [
  1_000,
  AUTO_REFRESH_INTERVAL_MS,
  5_000,
  10_000
] as const;

export type AutoRefreshIntervalMs =
  (typeof AUTO_REFRESH_INTERVAL_OPTIONS_MS)[number];

export function isAutoRefreshIntervalMs(
  value: number
): value is AutoRefreshIntervalMs {
  return AUTO_REFRESH_INTERVAL_OPTIONS_MS.includes(value as AutoRefreshIntervalMs);
}

export function usesVisibleRefreshState(mode: RefreshMode): boolean {
  return mode !== "background";
}

export function formatRefreshCadence(
  intervalMs = AUTO_REFRESH_INTERVAL_MS
): string {
  return `${Math.floor(intervalMs / 1000)}s`;
}
