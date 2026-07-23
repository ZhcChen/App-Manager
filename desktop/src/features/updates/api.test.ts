import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkForUpdates,
  createNoUpdateResult,
  openUpdateDownload,
  toUpdateApiError
} from "./api";

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

  it("delegates download opening to the desktop bridge", async () => {
    const openUpdateDownloadMock = vi.fn().mockResolvedValue(undefined);

    window.appManagerDesktop = {
      bootstrapState: vi.fn(),
      listProcesses: vi.fn(),
      listPorts: vi.fn(),
      terminateProcess: vi.fn(),
      openUpdateDownload: openUpdateDownloadMock
    };

    await openUpdateDownload("https://example.com/download.dmg");

    expect(openUpdateDownloadMock).toHaveBeenCalledWith(
      "https://example.com/download.dmg"
    );
  });

  it("normalizes download opening errors", async () => {
    window.appManagerDesktop = {
      bootstrapState: vi.fn(),
      listProcesses: vi.fn(),
      listPorts: vi.fn(),
      terminateProcess: vi.fn(),
      openUpdateDownload: vi.fn().mockRejectedValue("open failed")
    };

    await expect(openUpdateDownload("https://example.com/download.dmg")).rejects.toEqual({
      code: "update_failed",
      message: "open failed"
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
