import { beforeEach, describe, expect, it, vi } from "vitest";
import packageJson from "../../package.json";
import { isElectronRuntime, loadDesktopBootstrap } from "./desktopRuntime";

describe("desktopRuntime", () => {
  beforeEach(() => {
    delete window.appManagerDesktop;
  });

  it("falls back to browser mode when the desktop bridge is unavailable", async () => {
    expect(isElectronRuntime()).toBe(false);
    await expect(loadDesktopBootstrap()).resolves.toEqual({
      appName: "App Manager",
      appVersion: packageJson.version,
      runtime: "browser",
      shell: "desktop"
    });
  });

  it("loads the bootstrap payload from the desktop bridge", async () => {
    window.appManagerDesktop = {
      bootstrapState: vi.fn().mockResolvedValue({
        appName: "App Manager",
        appVersion: "0.1.10",
        runtime: "electron",
        shell: "desktop"
      }),
      listProcesses: vi.fn(),
      listPorts: vi.fn(),
      terminateProcess: vi.fn()
    };

    expect(isElectronRuntime()).toBe(true);
    await expect(loadDesktopBootstrap()).resolves.toEqual({
      appName: "App Manager",
      appVersion: "0.1.10",
      runtime: "electron",
      shell: "desktop"
    });
  });

  it("keeps the runtime in electron mode when bootstrap loading fails", async () => {
    window.appManagerDesktop = {
      bootstrapState: vi.fn().mockRejectedValue(new Error("bootstrap failed")),
      listProcesses: vi.fn(),
      listPorts: vi.fn(),
      terminateProcess: vi.fn()
    };

    await expect(loadDesktopBootstrap()).resolves.toEqual({
      appName: "App Manager",
      appVersion: packageJson.version,
      runtime: "electron",
      shell: "desktop"
    });
  });
});
