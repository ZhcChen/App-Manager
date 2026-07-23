import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockPorts } from "./mockPorts";
import { usePorts } from "./usePorts";
import type { AutoRefreshIntervalMs } from "@/features/processes/refresh-policy";

function UsePortsHarness(props: { intervalMs: AutoRefreshIntervalMs }) {
  usePorts(props.intervalMs);
  return null;
}

describe("usePorts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete window.appManagerDesktop;
  });

  it("polls using the configured refresh interval", async () => {
    const listPorts = vi.fn().mockResolvedValue(mockPorts);

    window.appManagerDesktop = {
      bootstrapState: vi.fn(),
      listProcesses: vi.fn(),
      listPorts,
      terminateProcess: vi.fn()
    };

    const view = render(<UsePortsHarness intervalMs={3_000} />);

    expect(listPorts).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2_999);
    });

    expect(listPorts).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });

    expect(listPorts).toHaveBeenCalledTimes(1);

    view.rerender(<UsePortsHarness intervalMs={10_000} />);

    act(() => {
      vi.advanceTimersByTime(9_999);
    });

    expect(listPorts).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });

    expect(listPorts).toHaveBeenCalledTimes(2);
  });
});
