import { fireEvent, render, screen } from "@testing-library/react";
import { App } from "./App";

describe("App", () => {
  it("renders the shell header", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: "App Manager" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Process workspace" })
    ).toBeInTheDocument();
  });

  it("filters the mock list by search query", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Search running apps"), {
      target: { value: "wechat" }
    });

    expect(screen.getByRole("heading", { name: "WeChat" })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Google Chrome" })
    ).not.toBeInTheDocument();
    expect(screen.getByText("Showing 1 of 5 visible processes")).toBeInTheDocument();
  });

  it("shows a query-specific empty state when nothing matches", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Search running apps"), {
      target: { value: "not-exists" }
    });

    expect(
      screen.getByRole("heading", { level: 3, name: "No matching process" })
    ).toBeInTheDocument();
  });
});
