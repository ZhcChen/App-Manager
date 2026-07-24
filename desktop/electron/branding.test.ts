import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  BRAND_ICON_RESOURCE_DIR,
  DEV_DOCK_ICON_NAME,
  RELEASE_DOCK_ICON_NAME,
  resolveDockIconName,
  resolvePngBrandIconPath,
  shouldApplyRuntimeDockIcon
} from "./branding.cjs";

describe("desktop branding helpers", () => {
  it("selects distinct dock icons for development and release", () => {
    expect(resolveDockIconName(true)).toBe(DEV_DOCK_ICON_NAME);
    expect(resolveDockIconName(false)).toBe(RELEASE_DOCK_ICON_NAME);
  });

  it("resolves source icons while running from the development build output", () => {
    const moduleDir = path.resolve("/repo/desktop/dist-electron");

    expect(
      resolvePngBrandIconPath({
        isDevRuntime: true,
        isPackaged: false,
        moduleDir,
        resourcesPath: "/unused"
      })
    ).toBe(path.resolve("/repo/packages/brand/logo", DEV_DOCK_ICON_NAME));
  });

  it("resolves bundled brand icons in packaged apps", () => {
    expect(
      resolvePngBrandIconPath({
        isDevRuntime: false,
        isPackaged: true,
        moduleDir: "/unused",
        resourcesPath: "/Applications/App Manager.app/Contents/Resources"
      })
    ).toBe(
      path.join(
        "/Applications/App Manager.app/Contents/Resources",
        BRAND_ICON_RESOURCE_DIR,
        RELEASE_DOCK_ICON_NAME
      )
    );
  });

  it("only applies runtime Dock overrides on macOS development builds", () => {
    expect(shouldApplyRuntimeDockIcon("darwin", true, true)).toBe(true);
    expect(shouldApplyRuntimeDockIcon("darwin", true, false)).toBe(false);
    expect(shouldApplyRuntimeDockIcon("darwin", false, true)).toBe(false);
    expect(shouldApplyRuntimeDockIcon("win32", true, true)).toBe(false);
    expect(shouldApplyRuntimeDockIcon("linux", true, true)).toBe(false);
  });
});
