import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockProcesses } from "./mockProcesses";

async function loadApiModule() {
  vi.resetModules();
  return import("./api");
}

describe("processes api", () => {
  beforeEach(() => {
    delete window.appManagerDesktop;
  });

  it("lists preview processes when the desktop bridge is unavailable", async () => {
    const api = await loadApiModule();
    api.resetPreviewProcesses();

    await expect(api.listProcesses()).resolves.toEqual(mockProcesses);
  });

  it("delegates process listing to the desktop bridge when available", async () => {
    const expected = [mockProcesses[0]];
    window.appManagerDesktop = {
      bootstrapState: vi.fn(),
      listProcesses: vi.fn().mockResolvedValue(expected),
      terminateProcess: vi.fn()
    };

    const api = await loadApiModule();

    await expect(api.listProcesses()).resolves.toEqual(expected);
    expect(window.appManagerDesktop.listProcesses).toHaveBeenCalledTimes(1);
  });

  it("converts bridge terminate errors into process API errors", async () => {
    window.appManagerDesktop = {
      bootstrapState: vi.fn(),
      listProcesses: vi.fn(),
      terminateProcess: vi.fn().mockRejectedValue({
        code: "protected",
        message: "Process 1 is protected."
      })
    };

    const api = await loadApiModule();

    await expect(api.terminateProcess(1)).rejects.toEqual({
      code: "protected",
      message: "Process 1 is protected."
    });
  });
});
