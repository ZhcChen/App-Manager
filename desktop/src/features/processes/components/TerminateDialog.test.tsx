import { fireEvent, render, screen } from "@testing-library/react";
import { TerminateDialog } from "./TerminateDialog";

const item = {
  title: "结束该进程？",
  description: "将结束 Google Chrome (1824)。如果该进程仍有未保存的工作内容，可能会直接丢失。",
  confirmLabel: "结束进程"
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
