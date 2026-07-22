import {
  canTerminateProcess,
  getTerminateActionLabel,
  isProtectedProcess
} from "./guards";
import type { ProcessItem } from "./types";

const runningItem: ProcessItem = {
  pid: 1824,
  name: "Google Chrome",
  path: "/Applications/Google Chrome.app",
  userName: "chen",
  kindLabel: "App",
  cpuUsagePercent: 12.3,
  memoryBytes: 932_184_064,
  virtualMemoryBytes: 5_812_314_112,
  runTimeSeconds: 16_422,
  startTimeSeconds: 1_721_726_000,
  diskReadBytes: 314_572_800,
  diskWrittenBytes: 125_829_120,
  status: "running",
  canTerminate: true
};

describe("process guards", () => {
  it("flags protected rows consistently", () => {
    expect(isProtectedProcess(runningItem)).toBe(false);
    expect(
      isProtectedProcess({
        ...runningItem,
        status: "protected",
        canTerminate: false
      })
    ).toBe(true);
  });

  it("derives terminate affordance from the guard state", () => {
    expect(canTerminateProcess(runningItem)).toBe(true);
    expect(getTerminateActionLabel(runningItem, null)).toBe("End");
    expect(getTerminateActionLabel(runningItem, runningItem.pid)).toBe(
      "Ending..."
    );
    expect(
      getTerminateActionLabel(
        {
          ...runningItem,
          status: "protected",
          canTerminate: false
        },
        null
      )
    ).toBe("Locked");
  });
});
