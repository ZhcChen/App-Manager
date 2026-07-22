import { fireEvent, render, screen } from "@testing-library/react";
import { ProcessList } from "./ProcessList";
import type { ProcessItem } from "../types";

const items: ProcessItem[] = [
  {
    pid: 1824,
    name: "Google Chrome",
    path: "/Applications/Google Chrome.app",
    status: "running",
    canTerminate: true
  },
  {
    pid: 5188,
    name: "App Manager",
    path: "/Applications/App Manager.app",
    status: "protected",
    canTerminate: false
  }
];

describe("ProcessList", () => {
  it("renders an empty error state when no data is available", () => {
    render(
      <ProcessList
        items={[]}
        error={{ code: "operation_failed", message: "load failed" }}
        isLoading={false}
        terminatingPid={null}
        onTerminate={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", { level: 3, name: "Failed to load processes" })
    ).toBeInTheDocument();
    expect(screen.getByText("load failed")).toBeInTheDocument();
  });

  it("disables protected rows and emits terminate for runnable rows", () => {
    const onTerminate = vi.fn();

    render(
      <ProcessList
        items={items}
        error={null}
        isLoading={false}
        terminatingPid={null}
        onTerminate={onTerminate}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "End" }));

    expect(onTerminate).toHaveBeenCalledWith(items[0]);
    expect(screen.getByRole("button", { name: "Locked" })).toBeDisabled();
  });
});
