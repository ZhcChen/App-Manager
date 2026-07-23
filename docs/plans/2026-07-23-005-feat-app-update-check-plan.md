---
title: feat: 增加 GitHub Release 升级检测
type: feature
status: completed
date: 2026-07-23
---

# feat: 增加 GitHub Release 升级检测

## Overview

为桌面端增加应用升级提示。应用从 GitHub Release 读取由 GitHub Actions 发布的安装资产，展示当前版本、可升级红点和按平台区分的下载入口。

第一版只做“检测与引导下载”，不做后台自动下载安装或静默替换。

## Requirements Trace

- R1. 应用名旁展示当前版本号。
- R2. 检测到新版本时，用小红点提示。
- R3. 点击版本区域打开升级弹窗。
- R4. 升级来源使用 GitHub Actions 发布到 GitHub Release 的下载资产。
- R5. 下载入口需要区分 Windows / macOS / Linux 和 x64 / arm64。
- R6. 应用启动后检测一次，每 1 分钟检测一次，窗口聚焦时检测一次。
- R7. 本地 dev 不能误导用户安装；可展示 dev 名称和版本，但更新检测失败不影响主功能。

## Scope Boundaries

- 不实现自动下载安装。
- 不做差分更新。
- 不做系统级后台更新服务。
- 不要求用户登录 GitHub；仅访问 public release API。

## Technical Design

- Electron main 新增 `updates:check` 和 `updates:open-download` IPC。
- main 进程调用 `https://api.github.com/repos/ZhcChen/App-Manager/releases/latest`。
- main 进程按 asset 名称解析平台、架构和格式：
  - `-mac-`
  - `-win-`
  - `-linux-`
  - `-arm64.`
  - `-x64.`
- renderer 新增 `features/updates`：
  - `types.ts`
  - `api.ts`
  - `useUpdateCheck.ts`
  - `components/UpdateDialog.tsx`
- `App.tsx`：
  - bootstrap 后展示 `v当前版本`
  - 新版本可用时显示红点
  - 点击版本胶囊打开弹窗
  - 1 分钟定时检测，窗口聚焦检测

## Implementation Units

- [x] **Unit 1: Electron 更新检测 IPC**
  - Files:
    - Modify: `desktop/electron/ipc/channels.cts`
    - Create: `desktop/electron/ipc/updates.cts`
    - Modify: `desktop/electron/main.cts`
    - Modify: `desktop/electron/preload.cts`
    - Modify: `desktop/src/lib/desktopBridge.ts`
    - Modify: `desktop/src/lib/desktopRuntime.ts`
  - Test scenarios:
    - GitHub Release 返回较新版本时，能解析最新版本和下载资产。
    - 网络失败时返回标准错误，不影响其它 IPC。

- [x] **Unit 2: Renderer 更新状态与弹窗**
  - Files:
    - Create: `desktop/src/features/updates/types.ts`
    - Create: `desktop/src/features/updates/api.ts`
    - Create: `desktop/src/features/updates/useUpdateCheck.ts`
    - Create: `desktop/src/features/updates/components/UpdateDialog.tsx`
    - Create tests under `desktop/src/features/updates/`
  - Test scenarios:
    - 启动后检测一次。
    - 1 分钟后再次检测。
    - window focus 后触发检测。
    - 有新版本时弹窗显示按平台下载入口。

- [x] **Unit 3: Header UI 集成**
  - Files:
    - Modify: `desktop/src/App.tsx`
    - Modify: `desktop/src/styles/base.css`
    - Modify: `desktop/src/App.test.tsx`
  - Test scenarios:
    - header 展示版本号。
    - 有新版本时显示红点。
    - 点击版本入口打开升级弹窗。

## Verification

- `pnpm --dir desktop test`
- `pnpm --dir desktop build`
- 手动启动 desktop dev，确认：
  - `App Manager Dev vX.Y.Z` 可见
  - 模拟新版本时红点可见
  - 弹窗下载链接按平台展示
