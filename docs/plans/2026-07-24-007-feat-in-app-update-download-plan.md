---
title: feat: 应用内下载更新并自动安装
type: feature
status: active
date: 2026-07-24
---

# feat: 应用内下载更新并自动安装

## Overview

现有升级能力只做到“检测新版本 + 跳浏览器打开 GitHub Release 下载页”。这不符合桌面应用的产品形态：用户点击升级后，应用应在宿主侧完成下载，前端展示真实下载进度，下载完成后进入安装流程，而不是把用户抛到浏览器。

本次改造将把升级机制从“自定义 GitHub 页面解析 + 外部下载”升级为“Electron 应用内更新”。技术路线采用 `electron-updater`，继续以 GitHub Release 作为发布源，并在保留现有版本检测入口与 UI 交互的前提下，补齐下载、进度、安装状态和构建发布元数据链路。

## Requirements Trace

- R1. 用户点击升级后，不再打开浏览器下载，而是在桌面宿主内开始下载更新。
- R2. 下载进度需要从宿主侧同步到前端，驱动升级弹窗里的真实进度条。
- R3. 下载完成后，应自动进入安装流程，而不是要求用户手动去下载目录执行安装。
- R4. 升级来源仍然是 GitHub Release 的正式发布资产，不引入额外服务端口。
- R5. 继续区分当前平台与架构，只为当前设备选择可用更新。
- R6. 现有“启动后 / 1 分钟定时 / 聚焦时”检测逻辑继续保留。
- R7. dev 环境不能误触正式更新安装；更新失败不能影响主流程。

## Scope Boundaries

- 不做自建更新服务，继续使用 GitHub Release。
- 不做灰度发布或分批 rollout。
- 不自研下载器与安装器，优先复用 Electron 生态 updater 能力。
- 不在本次改造中重做整套升级 UI 信息架构，仅增强现有弹窗的状态与交互。
- 不新增本地 HTTP 端口，前后端通信继续使用 Electron IPC / preload bridge（见 origin: `docs/plans/2026-07-22-003-refactor-electron-desktop-runtime-plan.md`）。

## Research Summary

### Existing local patterns

- `desktop/electron/ipc/updates.cts`
  - 当前负责：
    - 抓取 GitHub Release 页面
    - 解析平台资产
    - 暴露 `updates:check`
    - 暴露 `updates:open-download`
- `desktop/src/features/updates/`
  - 当前 renderer 已有：
    - 检测 hook
    - 升级弹窗
    - “模拟进度”状态机
- `desktop/scripts/collect-release-assets.mjs`
  - 当前只收集 `.dmg/.exe/.appimage/.deb`
  - 未保留自动更新所需的 `.yml`、`.zip`、`.blockmap`

### Related prior plans / docs

- `docs/plans/2026-07-23-005-feat-app-update-check-plan.md`
  - 第一版升级能力计划，已明确“不做后台自动下载安装”
- `docs/solutions/workflow-issues/github-release-operations-2026-07-23.md`
  - 已固化 GitHub Release 发布与核查流程

### External guidance

- `electron-updater` 相比 Electron 内置 `autoUpdater`：
  - 支持 Linux
  - 支持下载进度事件
  - 支持 GitHub Releases provider
  - 依赖 `latest.yml` / `latest-mac.yml` / blockmap 等更新元数据
- macOS / Windows / Linux 的自动安装行为存在平台差异：
  - macOS / Windows 是主要标准路径
  - Linux 依赖目标包格式与运行环境，AppImage / deb 能力存在边界

## Key Decisions

### D1. 使用 `electron-updater` 替代当前“打开浏览器下载”的实现

原因：

- 用户需求已经从“引导下载”升级为“应用内下载安装”
- `electron-updater` 原生支持：
  - GitHub Release provider
  - 下载进度事件
  - 下载完成后的安装流程
- 相比自研下载器 + 平台脚本，风险和维护成本更低

### D2. 保留现有更新弹窗，但把内部状态机切换为“宿主事件驱动”

原因：

- 当前 `UpdateDialog` 已有版本信息、按钮和进度条 UI
- 现有 `preparing -> ready/failed` 是前端模拟状态，不反映真实下载生命周期
- 改为监听 IPC 事件后，可最小改动接入：
  - checking
  - available
  - downloading(progress)
  - downloaded
  - installing
  - failed

### D3. 更新检查与下载/安装拆成两条能力

- 检测：继续由 `useUpdateCheck` 驱动
- 执行升级：新增“开始下载更新 / 监听更新状态 / 执行安装”能力

原因：

- 保留现有 header 红点与周期检测逻辑
- 避免把“检查”和“执行下载”耦合成单调用，方便弹窗内重试与状态恢复

### D4. Release workflow 必须改为发布自动更新元数据

必须保留的产物至少包括：

- macOS：`zip`、`latest-mac.yml`、相关 blockmap
- Windows NSIS：`exe`、`latest.yml`、相关 blockmap
- Linux：`AppImage` / `deb` 与对应 metadata（按 `electron-updater` 输出）

原因：

- 当前 `collect-release-assets.mjs` 会把自动更新必需的 metadata 过滤掉
- 没有这些元数据，客户端即使接入 `electron-updater` 也无法完成更新解析与下载

### D5. dev 环境默认禁用安装型更新

原因：

- 当前已存在 `App Manager Dev` 与正式版并存的开发态
- dev 不应误下正式安装包，也不应触发覆盖安装
- dev 环境保留“检测能力可选”，但安装型动作必须拒绝或直接标记不可用

## Implementation Units

- [ ] **Unit 1: Electron main 更新服务重构**
  - Goal: 用 `electron-updater` 接管更新检查、下载、下载进度和安装触发，替换当前 `shell.openExternal` 下载流。
  - Files:
    - Modify: `desktop/electron/ipc/updates.cts`
    - Modify: `desktop/electron/ipc/channels.cts`
    - Modify: `desktop/electron/main.cts`
    - Modify: `desktop/electron/preload.cts`
    - Modify: `desktop/src/lib/desktopBridge.ts`
    - Modify: `desktop/package.json`
  - Patterns to follow:
    - `desktop/electron/ipc/processes.cts`
    - `desktop/electron/preload.cts`
    - `desktop/electron/ipc/updates.test.ts`
  - Test scenarios:
    - 新版本可用时，仍能返回版本信息与当前平台候选资产。
    - 调用“开始升级”后，主进程不再打开浏览器。
    - 下载进度事件能按百分比推送到 renderer。
    - 下载完成后能进入“已下载 / 即将安装”状态。
    - dev 环境调用安装型升级时，返回明确错误，不影响现有应用运行。
  - Verification:
    - `pnpm --dir desktop test -- electron/ipc/updates.test.ts`

- [ ] **Unit 2: Renderer 升级弹窗接入真实状态机**
  - Goal: 用真实下载/安装状态替换当前模拟进度条，支持开始升级、下载中、安装中、失败重试。
  - Files:
    - Modify: `desktop/src/features/updates/types.ts`
    - Modify: `desktop/src/features/updates/api.ts`
    - Modify: `desktop/src/features/updates/components/UpdateDialog.tsx`
    - Modify: `desktop/src/features/updates/components/UpdateDialog.test.tsx`
    - Modify: `desktop/src/App.tsx`
    - Modify: `desktop/src/App.test.tsx`
    - Modify: `desktop/src/styles/base.css`
  - Patterns to follow:
    - `desktop/src/features/processes/components/TerminateDialog.tsx`
    - `desktop/src/components/TransientToast.tsx`
    - `desktop/src/features/updates/useUpdateCheck.ts`
  - Test scenarios:
    - 点击升级后进入真实下载中状态，按钮禁用。
    - 收到进度事件时，进度条百分比同步更新。
    - 下载完成后展示“正在安装 / 即将重启”状态。
    - 升级失败时展示错误并允许重试。
  - Verification:
    - `pnpm --dir desktop test -- src/features/updates/components/UpdateDialog.test.tsx src/App.test.tsx`

- [ ] **Unit 3: 发布资产与 workflow 调整**
  - Goal: 让 GitHub Release 保留 `electron-updater` 所需元数据与安装资产，保证客户端可以真正更新。
  - Files:
    - Modify: `desktop/scripts/collect-release-assets.mjs`
    - Modify: `.github/workflows/release-desktop.yml`
    - Modify: `desktop/scripts/generate-release-notes.mjs`（如说明文案需兼容新增 metadata，可只在必要时调整）
    - Modify: `desktop/electron/electronBuilderConfig.test.ts`
  - Patterns to follow:
    - `docs/solutions/workflow-issues/github-release-operations-2026-07-23.md`
    - `desktop/electron/electronBuilderConfig.test.ts`
  - Test scenarios:
    - 产物收集脚本不会再丢失 `latest*.yml` / `zip` / blockmap。
    - Release 说明继续只展示用户关心的安装资产，不把 metadata 当作下载入口暴露给用户。
    - workflow 仍能在多平台矩阵下汇总并发布资产。
  - Verification:
    - `pnpm --dir desktop test -- electron/electronBuilderConfig.test.ts`

## Risks and Mitigations

- **R1. Linux 自动更新行为不一致**
  - 风险：不同分发版、安装方式、权限策略不同。
  - 缓解：先接入 `electron-updater` 支持的标准路径；UI 文案避免宣称所有 Linux 都能完全静默；必要时按资产类型区分。

- **R2. Release 资产契约变化影响现有发布说明**
  - 风险：把 metadata 一起上传后，release notes 可能被噪声文件污染。
  - 缓解：继续让说明生成脚本只面向安装包渲染，把 metadata 视为 updater 内部依赖。

- **R3. dev 误触正式安装**
  - 风险：本地开发环境触发下载/安装正式包。
  - 缓解：main 进程在 dev runtime 明确禁用安装型更新 IPC。

- **R4. macOS ad-hoc 签名对自动更新路径的兼容性**
  - 风险：自动更新在本地 ad-hoc 签名或预览包上和正式发布包行为不同。
  - 缓解：以 GitHub Release 正式产物验证为准；本地主要验证事件链路与 UI。

## Verification

- `pnpm --dir desktop test`
- `pnpm --dir desktop build`
- 手动验证 packaged app：
  - 发现新版本时弹窗展示可升级状态
  - 点击升级后不打开浏览器
  - 进度条跟随真实下载百分比变化
  - 下载完成后进入安装流程
  - dev 环境不会触发正式安装
