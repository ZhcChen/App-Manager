import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockProcesses } from "./mockProcesses";
import { useProcesses } from "./useProcesses";
import type { AutoRefreshIntervalMs } from "./refresh-policy";

function UseProcessesHarness(props: { intervalMs: AutoRefreshIntervalMs }) {
  useProcesses(props.intervalMs);
  return null;
}

describe("useProcesses", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete window.appManagerDesktop;
  });

  it("polls using the configured refresh interval", async () => {
    const listProcesses = vi.fn().mockResolvedValue(mockProcesses);

    window.appManagerDesktop = {
      bootstrapState: vi.fn(),
      listProcesses,
      listPorts: vi.fn(),
      terminateProcess: vi.fn()
    };

    const view = render(<UseProcessesHarness intervalMs={3_000} />);

    expect(listProcesses).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2_999);
    });

    expect(listProcesses).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });

    expect(listProcesses).toHaveBeenCalledTimes(1);

    view.rerender(<UseProcessesHarness intervalMs={10_000} />);

    act(() => {
      vi.advanceTimersByTime(9_999);
    });

    expect(listProcesses).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });

    expect(listProcesses).toHaveBeenCalledTimes(2);
  });
});
