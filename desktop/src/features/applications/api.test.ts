import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockApplications } from "./mockApplications";

async function loadApiModule() {
  vi.resetModules();
  return import("./api");
}

describe("applications api", () => {
  beforeEach(() => {
    delete window.appManagerDesktop;
  });

  it("lists preview applications when the desktop bridge is unavailable", async () => {
    const api = await loadApiModule();
    api.resetPreviewApplications();

    await expect(api.listApplications()).resolves.toEqual(mockApplications);
  });

  it("delegates application listing to the desktop bridge when available", async () => {
    const expected = [mockApplications[0]];
    window.appManagerDesktop = {
      bootstrapState: vi.fn(),
      listApplications: vi.fn().mockResolvedValue(expected),
      listProcesses: vi.fn(),
      listPorts: vi.fn(),
      terminateProcess: vi.fn(),
      terminateProcesses: vi.fn()
    };

    const api = await loadApiModule();

    await expect(api.listApplications()).resolves.toEqual(expected);
    expect(window.appManagerDesktop?.listApplications).toHaveBeenCalledTimes(1);
  });

  it("converts batch terminate bridge errors into application API errors", async () => {
    window.appManagerDesktop = {
      bootstrapState: vi.fn(),
      listApplications: vi.fn(),
      listProcesses: vi.fn(),
      listPorts: vi.fn(),
      terminateProcess: vi.fn(),
      terminateProcesses: vi.fn().mockRejectedValue({
        code: "protected",
        message: "Process 1 is protected."
      })
    };

    const api = await loadApiModule();

    await expect(api.terminateProcesses([1])).rejects.toEqual({
      code: "protected",
      message: "Process 1 is protected."
    });
  });
});
