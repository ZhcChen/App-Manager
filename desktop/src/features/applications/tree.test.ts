import { describe, expect, it } from "vitest";
import { mockApplications } from "./mockApplications";
import {
  buildApplicationContextMenuTarget,
  buildApplicationViewTree,
  filterApplicationViewTree
} from "./tree";

describe("application tree helpers", () => {
  it("keeps ancestor nodes when the query matches a child process", () => {
    const items = buildApplicationViewTree(mockApplications);
    const result = filterApplicationViewTree(items, "1541");

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.name).toBe("Chrome for Testing");
    expect(result.items[0]?.children).toHaveLength(1);
    expect(result.items[0]?.children[0]?.children[0]?.pid).toBe(1541);
    expect(result.expandedIds.has("application:chrome-for-testing")).toBe(true);
  });

  it("builds post-order pid lists for application and instance actions", () => {
    const items = buildApplicationViewTree(mockApplications);
    const applicationNode = items[0]!;
    const instanceNode = applicationNode.children[0]!;
    const processNode = instanceNode.children[0]!;

    expect(buildApplicationContextMenuTarget(applicationNode)).toEqual({
      kind: "application",
      id: "application:chrome-for-testing",
      name: "Chrome for Testing",
      canTerminate: true,
      pids: [1541, 1542, 1540, 1621, 1620]
    });

    expect(buildApplicationContextMenuTarget(instanceNode)).toEqual({
      kind: "instance",
      id: "instance:chrome-for-testing:1540:1",
      name: "Chrome for Testing",
      canTerminate: true,
      pids: [1541, 1542, 1540]
    });

    expect(buildApplicationContextMenuTarget(processNode)).toEqual({
      kind: "process",
      id: "process:chrome-for-testing:1541:1",
      name: "Chrome Helper (Renderer)",
      canTerminate: true,
      pids: [1541]
    });
  });
});
