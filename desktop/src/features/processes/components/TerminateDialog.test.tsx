import { fireEvent, render, screen } from "@testing-library/react";
import { TerminateDialog } from "./TerminateDialog";
import type { ProcessItem } from "../types";

const item: ProcessItem = {
  pid: 1824,
  name: "Google Chrome",
  path: "/Applications/Google Chrome.app",
  status: "running",
  canTerminate: true
};

describe("TerminateDialog", () => {
  it("stays hidden without an active target", () => {
    render(
      <TerminateDialog item={null} onCancel={vi.fn()} onConfirm={vi.fn()} />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the confirmation copy and actions", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    render(
      <TerminateDialog item={item} onCancel={onCancel} onConfirm={onConfirm} />
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "End process?" })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "End app" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
