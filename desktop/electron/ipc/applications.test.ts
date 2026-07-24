import { describe, expect, it, vi } from "vitest";
import {
  buildApplicationContextAction,
  buildApplicationContextMenuTemplate,
  getApplicationContextMenuLabel
} from "./processes.cjs";

describe("application IPC helpers", () => {
  it("renders the expected application context menu labels", () => {
    expect(
      getApplicationContextMenuLabel({
        kind: "application",
        id: "application:chrome",
        name: "Chrome for Testing",
        canTerminate: true,
        pids: [1, 2, 3]
      })
    ).toBe("结束“Chrome for Testing”全部实例");

    expect(
      getApplicationContextMenuLabel({
        kind: "instance",
        id: "instance:chrome",
        name: "Chrome for Testing",
        canTerminate: true,
        pids: [1, 2]
      })
    ).toBe("结束“Chrome for Testing”实例");

    expect(
      getApplicationContextMenuLabel({
        kind: "process",
        id: "process:chrome",
        name: "Chrome Helper",
        canTerminate: true,
        pids: [2]
      })
    ).toBe("结束“Chrome Helper”进程");
  });

  it("builds a batch terminate action from the selected node", () => {
    expect(
      buildApplicationContextAction({
        kind: "instance",
        id: "instance:chrome:1",
        name: "Chrome for Testing",
        canTerminate: true,
        pids: [100, 101, 102]
      })
    ).toEqual({
      action: "terminateMany",
      id: "instance:chrome:1",
      targetKind: "instance",
      name: "Chrome for Testing",
      pids: [100, 101, 102]
    });
  });

  it("disables the menu action when the node cannot be terminated", () => {
    const sender = {
      send: vi.fn()
    };

    const template = buildApplicationContextMenuTemplate(sender as never, {
      kind: "application",
      id: "application:self",
      name: "App Manager",
      canTerminate: false,
      pids: [1]
    });

    expect(template).toHaveLength(1);
    expect(template[0]?.enabled).toBe(false);
    expect(sender.send).not.toHaveBeenCalled();
  });
});
