import {
  AUTO_REFRESH_INTERVAL_MS,
  AUTO_REFRESH_INTERVAL_OPTIONS_MS,
  formatRefreshCadence,
  isAutoRefreshIntervalMs,
  usesVisibleRefreshState
} from "./refresh-policy";

describe("refresh-policy", () => {
  it("uses a 3 second desktop refresh interval by default", () => {
    expect(AUTO_REFRESH_INTERVAL_MS).toBe(3_000);
    expect(AUTO_REFRESH_INTERVAL_OPTIONS_MS).toEqual([1_000, 3_000, 5_000, 10_000]);
    expect(formatRefreshCadence()).toBe("3s");
    expect(isAutoRefreshIntervalMs(5_000)).toBe(true);
    expect(isAutoRefreshIntervalMs(7_000)).toBe(false);
  });

  it("keeps background refresh silent", () => {
    expect(usesVisibleRefreshState("initial")).toBe(true);
    expect(usesVisibleRefreshState("manual")).toBe(true);
    expect(usesVisibleRefreshState("background")).toBe(false);
  });
});
