import path from "node:path";

export const BRAND_ICON_RESOURCE_DIR = "brand";
export const RELEASE_DOCK_ICON_NAME = "app-manager-dock.png";
export const DEV_DOCK_ICON_NAME = "app-manager-dev-dock.png";

export function resolveDockIconName(isDevRuntime: boolean) {
  return isDevRuntime ? DEV_DOCK_ICON_NAME : RELEASE_DOCK_ICON_NAME;
}

export function resolvePngBrandIconPath({
  isDevRuntime,
  isPackaged,
  moduleDir,
  resourcesPath
}: {
  isDevRuntime: boolean;
  isPackaged: boolean;
  moduleDir: string;
  resourcesPath: string;
}) {
  const iconName = resolveDockIconName(isDevRuntime);

  if (isPackaged) {
    return path.join(resourcesPath, BRAND_ICON_RESOURCE_DIR, iconName);
  }

  return path.resolve(moduleDir, "../../packages/brand/logo", iconName);
}

export function shouldApplyDockIcon(platform: NodeJS.Platform, hasDock: boolean) {
  return platform === "darwin" && hasDock;
}
