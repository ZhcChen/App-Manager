import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TransientToast } from "./TransientToast";

describe("TransientToast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders feedback and clears it after the exit animation completes", () => {
    const onClear = vi.fn();

    render(
      <TransientToast
        item={{
          id: 7,
          tone: "success",
          title: "最近动作",
          message: "已结束 Blender（57350）"
        }}
        onClear={onClear}
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent("已结束 Blender（57350）");

    act(() => {
      vi.advanceTimersByTime(2600);
    });

    expect(onClear).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(220);
    });

    expect(onClear).toHaveBeenCalledWith(7);
  });
});
