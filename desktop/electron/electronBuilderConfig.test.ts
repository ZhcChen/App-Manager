import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  BRAND_ICON_RESOURCE_DIR,
  DEV_DOCK_ICON_NAME,
  RELEASE_DOCK_ICON_NAME
} from "./branding.cjs";

const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.join(desktopRoot, "electron-builder.yml");
const configText = fs.readFileSync(configPath, "utf8");
const normalizedConfigText = configText.replace(/\r\n/g, "\n");

function expectConfiguredAssetExists(relativePath: string) {
  expect(fs.existsSync(path.resolve(desktopRoot, relativePath))).toBe(true);
}

describe("electron-builder branding config", () => {
  it("publishes update metadata against the GitHub release provider", () => {
    expect(normalizedConfigText).toMatch(
      /publish:\n  provider: github\n  owner: ZhcChen\n  repo: App-Manager/
    );
  });

  it("does not define a top-level icon that can override mac.icon", () => {
    expect(normalizedConfigText).not.toMatch(/^icon:/m);
  });

  it("bundles runtime Dock PNG resources under the expected brand directory", () => {
    expect(normalizedConfigText).toContain(`to: ${BRAND_ICON_RESOURCE_DIR}`);
    expect(normalizedConfigText).toContain(`- ${RELEASE_DOCK_ICON_NAME}`);
    expect(normalizedConfigText).toContain(`- ${DEV_DOCK_ICON_NAME}`);

    expectConfiguredAssetExists(`../packages/brand/logo/${RELEASE_DOCK_ICON_NAME}`);
    expectConfiguredAssetExists(`../packages/brand/logo/${DEV_DOCK_ICON_NAME}`);
  });

  it("uses the Dock-sized release icon for all packaged app icons", () => {
    expect(normalizedConfigText).toMatch(
      /mac:\n(?:  .+\n)*  icon: \.\.\/packages\/brand\/logo\/app-manager-dock\.icns/
    );
    expect(normalizedConfigText).toMatch(
      /win:\n(?:  .+\n)*  icon: \.\.\/packages\/brand\/logo\/app-manager-dock\.png/
    );
    expect(normalizedConfigText).toMatch(
      /linux:\n(?:  .+\n)*  icon: \.\.\/packages\/brand\/logo\/app-manager-dock\.png/
    );

    expectConfiguredAssetExists("../packages/brand/logo/app-manager-dock.icns");
    expectConfiguredAssetExists(`../packages/brand/logo/${RELEASE_DOCK_ICON_NAME}`);
  });
});
