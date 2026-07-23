import { beforeEach, describe, expect, it, vi } from "vitest";
import { listPorts, resetPreviewPorts } from "./api";
import { mockPorts } from "./mockPorts";

describe("ports api", () => {
  beforeEach(() => {
    delete window.appManagerDesktop;
    resetPreviewPorts();
  });

  it("returns preview ports when the desktop bridge is unavailable", async () => {
    await expect(listPorts()).resolves.toEqual(mockPorts);
  });

  it("delegates to the desktop bridge when available", async () => {
    const listPortsMock = vi.fn().mockResolvedValue(mockPorts.slice(0, 2));

    window.appManagerDesktop = {
      bootstrapState: vi.fn(),
      listProcesses: vi.fn(),
      listPorts: listPortsMock,
      terminateProcess: vi.fn()
    };

    await expect(listPorts()).resolves.toEqual(mockPorts.slice(0, 2));
    expect(listPortsMock).toHaveBeenCalledTimes(1);
  });
});
