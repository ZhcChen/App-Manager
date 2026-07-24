import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockApplications } from "./mockApplications";
import { useApplications } from "./useApplications";
import type { AutoRefreshIntervalMs } from "@/features/processes/refresh-policy";

function UseApplicationsHarness(props: { intervalMs: AutoRefreshIntervalMs }) {
  useApplications(props.intervalMs);
  return null;
}

describe("useApplications", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete window.appManagerDesktop;
  });

  it("polls using the configured refresh interval", async () => {
    const listApplications = vi.fn().mockResolvedValue(mockApplications);

    window.appManagerDesktop = {
      bootstrapState: vi.fn(),
      listApplications,
      listProcesses: vi.fn(),
      listPorts: vi.fn(),
      terminateProcess: vi.fn(),
      terminateProcesses: vi.fn()
    };

    const view = render(<UseApplicationsHarness intervalMs={3_000} />);

    expect(listApplications).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2_999);
    });

    expect(listApplications).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });

    expect(listApplications).toHaveBeenCalledTimes(1);

    view.rerender(<UseApplicationsHarness intervalMs={10_000} />);

    act(() => {
      vi.advanceTimersByTime(9_999);
    });

    expect(listApplications).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });

    expect(listApplications).toHaveBeenCalledTimes(2);
  });
});
