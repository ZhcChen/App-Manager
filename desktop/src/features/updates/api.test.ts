import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkForUpdates,
  createNoUpdateResult,
  getUpdateInstallState,
  startUpdateInstall,
  subscribeToUpdateInstallState,
  toUpdateApiError
} from "./api";
import { createIdleUpdateInstallState } from "./types";

describe("updates api", () => {
  beforeEach(() => {
    delete window.appManagerDesktop;
  });

  it("returns a no-update result when the desktop bridge is unavailable", async () => {
    await expect(checkForUpdates("0.1.10")).resolves.toMatchObject({
      currentVersion: "0.1.10",
      latestVersion: "0.1.10",
      hasUpdate: false
    });
  });

  it("delegates update checks to the desktop bridge", async () => {
    const expected = createNoUpdateResult("0.1.10");
    const checkForUpdatesMock = vi.fn().mockResolvedValue(expected);

    window.appManagerDesktop = {
      bootstrapState: vi.fn(),
      listProcesses: vi.fn(),
      listPorts: vi.fn(),
      terminateProcess: vi.fn(),
      checkForUpdates: checkForUpdatesMock
    };

    await expect(checkForUpdates("0.1.10")).resolves.toEqual(expected);
    expect(checkForUpdatesMock).toHaveBeenCalledTimes(1);
  });

  it("normalizes desktop bridge update errors", async () => {
    window.appManagerDesktop = {
      bootstrapState: vi.fn(),
      listProcesses: vi.fn(),
      listPorts: vi.fn(),
      terminateProcess: vi.fn(),
      checkForUpdates: vi.fn().mockRejectedValue({
        code: "update_check_failed",
        message: "GitHub release API returned 500."
      })
    };

    await expect(checkForUpdates("0.1.10")).rejects.toEqual({
      code: "update_check_failed",
      message: "GitHub release API returned 500."
    });
  });

  it("returns idle install state when the desktop bridge is unavailable", async () => {
    await expect(getUpdateInstallState()).resolves.toEqual(
      createIdleUpdateInstallState()
    );
  });

  it("delegates install state reads and start requests to the desktop bridge", async () => {
    const state = {
      phase: "downloading" as const,
      version: "0.1.11",
      progressPercent: 48,
      transferredBytes: 480,
      totalBytes: 1_000,
      bytesPerSecond: 64,
      message: "正在下载更新..."
    };
    const getUpdateInstallStateMock = vi.fn().mockResolvedValue(state);
    const startUpdateInstallMock = vi.fn().mockResolvedValue(undefined);
    const unsubscribe = vi.fn();
    const onUpdateInstallStateMock = vi
      .fn()
      .mockImplementation((listener: (next: typeof state) => void) => {
        listener(state);
        return unsubscribe;
      });

    window.appManagerDesktop = {
      bootstrapState: vi.fn(),
      listProcesses: vi.fn(),
      listPorts: vi.fn(),
      terminateProcess: vi.fn(),
      getUpdateInstallState: getUpdateInstallStateMock,
      startUpdateInstall: startUpdateInstallMock,
      onUpdateInstallState: onUpdateInstallStateMock
    };

    await expect(getUpdateInstallState()).resolves.toEqual(state);
    await expect(startUpdateInstall()).resolves.toBeUndefined();

    const listener = vi.fn();
    const dispose = subscribeToUpdateInstallState(listener);

    expect(getUpdateInstallStateMock).toHaveBeenCalledTimes(1);
    expect(startUpdateInstallMock).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(state);

    dispose();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("normalizes install start errors", async () => {
    window.appManagerDesktop = {
      bootstrapState: vi.fn(),
      listProcesses: vi.fn(),
      listPorts: vi.fn(),
      terminateProcess: vi.fn(),
      startUpdateInstall: vi.fn().mockRejectedValue("install failed")
    };

    await expect(startUpdateInstall()).rejects.toEqual({
      code: "update_failed",
      message: "install failed"
    });
  });

  it("converts unknown errors into a displayable update error", () => {
    expect(toUpdateApiError({ code: "x", message: "from bridge" })).toEqual({
      code: "x",
      message: "from bridge"
    });
    expect(toUpdateApiError(new Error("native error"))).toEqual({
      code: "update_failed",
      message: "native error"
    });
  });
});
