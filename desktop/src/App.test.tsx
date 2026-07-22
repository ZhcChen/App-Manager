import { fireEvent, render, screen, within } from "@testing-library/react";
import { App } from "./App";

describe("App", () => {
  it("renders the shell header", () => {
    render(<App />);
    const tabs = screen.getByRole("navigation", { name: "监视视图" });

    expect(screen.getByAltText("App Manager 标志")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "App Manager" })
    ).toBeInTheDocument();
    expect(within(tabs).getByRole("button", { name: "CPU" })).toBeInTheDocument();
    expect(within(tabs).getByRole("button", { name: "内存" })).toBeInTheDocument();
  });

  it("filters the mock list by search query", () => {
    render(<App />);
    const table = screen.getByRole("table", { name: "进程列表" });

    fireEvent.change(screen.getByLabelText("搜索进程"), {
      target: { value: "wechat" }
    });

    expect(within(table).getByText("WeChat")).toBeInTheDocument();
    expect(within(table).queryByText("Google Chrome")).not.toBeInTheDocument();
    expect(screen.getByText("显示 1 / 5 个进程")).toBeInTheDocument();
  });

  it("shows a query-specific empty state when nothing matches", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("搜索进程"), {
      target: { value: "not-exists" }
    });

    expect(
      screen.getByRole("heading", { level: 3, name: "没有匹配的进程" })
    ).toBeInTheDocument();
  });
});
