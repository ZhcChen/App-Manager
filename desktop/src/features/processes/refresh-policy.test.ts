import {
  AUTO_REFRESH_INTERVAL_MS,
  formatRefreshCadence,
  usesVisibleRefreshState
} from "./refresh-policy";

describe("refresh-policy", () => {
  it("uses a low-frequency desktop refresh interval", () => {
    expect(AUTO_REFRESH_INTERVAL_MS).toBe(15_000);
    expect(formatRefreshCadence()).toBe("15s");
  });

  it("keeps background refresh silent", () => {
    expect(usesVisibleRefreshState("initial")).toBe(true);
    expect(usesVisibleRefreshState("manual")).toBe(true);
    expect(usesVisibleRefreshState("background")).toBe(false);
  });
});
