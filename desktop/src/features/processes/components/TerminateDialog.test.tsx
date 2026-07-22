import { fireEvent, render, screen } from "@testing-library/react";
import { TerminateDialog } from "./TerminateDialog";
import type { ProcessItem } from "../types";

const item: ProcessItem = {
  pid: 1824,
  name: "Google Chrome",
  path: "/Applications/Google Chrome.app",
  userName: "chen",
  kindLabel: "App",
  cpuUsagePercent: 12.3,
  memoryBytes: 932_184_064,
  virtualMemoryBytes: 5_812_314_112,
  runTimeSeconds: 16_422,
  startTimeSeconds: 1_721_726_000,
  diskReadBytes: 314_572_800,
  diskWrittenBytes: 125_829_120,
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
      screen.getByRole("heading", { level: 2, name: "结束该进程？" })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    fireEvent.click(screen.getByRole("button", { name: "结束进程" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
