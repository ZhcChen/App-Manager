import { StrictMode } from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUpdateCheck } from "./useUpdateCheck";
import { createNoUpdateResult } from "./api";

function UseUpdateCheckHarness() {
  useUpdateCheck("0.1.10");
  return null;
}

function UseUpdateCheckStateHarness() {
  const updates = useUpdateCheck("0.1.10");
  return (
    <div>
      <span data-testid="update-error">{updates.error ?? ""}</span>
      <span data-testid="update-checking">
        {updates.isChecking ? "checking" : "idle"}
      </span>
    </div>
  );
}

function createDeferred<T>(_sample?: T) {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return {
    promise,
    resolve,
    reject
  };
}

describe("useUpdateCheck", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete window.appManagerDesktop;
  });

  it("checks on mount, every minute, and on focus", async () => {
    const checkForUpdates = vi
      .fn()
      .mockResolvedValue(createNoUpdateResult("0.1.10"));

    window.appManagerDesktop = {
      bootstrapState: vi.fn(),
      listProcesses: vi.fn(),
      listPorts: vi.fn(),
      terminateProcess: vi.fn(),
      checkForUpdates
    };

    render(<UseUpdateCheckHarness />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(checkForUpdates).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(60_000);
      await Promise.resolve();
    });

    expect(checkForUpdates).toHaveBeenCalledTimes(2);

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      await Promise.resolve();
    });

    expect(checkForUpdates).toHaveBeenCalledTimes(2);

    await act(async () => {
      vi.advanceTimersByTime(30_000);
      window.dispatchEvent(new Event("focus"));
      await Promise.resolve();
    });

    expect(checkForUpdates).toHaveBeenCalledTimes(3);
  });

  it("keeps the bridge error message visible", async () => {
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

    render(<UseUpdateCheckStateHarness />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("update-error")).toHaveTextContent(
      "GitHub release API returned 500."
    );
  });

  it("updates state after the StrictMode effect replay", async () => {
    const checkForUpdates = vi
      .fn()
      .mockResolvedValue(createNoUpdateResult("0.1.10"));

    window.appManagerDesktop = {
      bootstrapState: vi.fn(),
      listProcesses: vi.fn(),
      listPorts: vi.fn(),
      terminateProcess: vi.fn(),
      checkForUpdates
    };

    render(
      <StrictMode>
        <UseUpdateCheckStateHarness />
      </StrictMode>
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("update-checking")).toHaveTextContent("idle");
    expect(checkForUpdates).toHaveBeenCalledTimes(1);
  });

  it("does not start overlapping automatic checks while one is pending", async () => {
    const deferred = createDeferred(createNoUpdateResult("0.1.10"));
    const checkForUpdates = vi.fn().mockReturnValue(deferred.promise);

    window.appManagerDesktop = {
      bootstrapState: vi.fn(),
      listProcesses: vi.fn(),
      listPorts: vi.fn(),
      terminateProcess: vi.fn(),
      checkForUpdates
    };

    render(<UseUpdateCheckStateHarness />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(checkForUpdates).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("update-checking")).toHaveTextContent("checking");

    await act(async () => {
      vi.advanceTimersByTime(60_000);
      window.dispatchEvent(new Event("focus"));
      await Promise.resolve();
    });

    expect(checkForUpdates).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferred.resolve(createNoUpdateResult("0.1.10"));
      await Promise.resolve();
    });

    expect(screen.getByTestId("update-checking")).toHaveTextContent("idle");
  });
});
