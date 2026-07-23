# App Manager

跨平台桌面应用管理工具。

当前仓库重点：

- `desktop/`：Electron 桌面应用模块
- `packages/brand/`：共享 logo / 字体 / 视觉资源
- `docs/`：CE 产物文档

当前桌面端目标：

- 展示运行中的应用/进程
- 搜索和筛选目标项
- 在 GUI 中触发结束进程
- 对失败原因做明确反馈
- 通过 Electron IPC 调用 Rust 进程 sidecar

## 开发命令

```bash
pnpm install
pnpm dev:desktop
```

桌面端开发会同时启动 Vite renderer（端口 `1430`）与 Electron 宿主。

## 计划文档

- `docs/brainstorms/2026-07-22-cross-platform-desktop-tech-selection-requirements.md`
- `docs/plans/2026-07-22-001-feat-tauri-desktop-foundation-plan.md`
- `docs/plans/2026-07-22-003-refactor-electron-desktop-runtime-plan.md`

## macOS 签名

当前桌面端在开发阶段先使用 **ad-hoc** 签名：

- `desktop/electron-builder.yml`
- `mac.identity = "-"`

## GitHub 自动发版

当前仓库已规划为 **tag 驱动发版**：

1. 先更新 `desktop/package.json` 中的版本号，例如 `0.1.0`
2. 合并到 `main`
3. 推送同版本 tag，例如 `v0.1.0`
4. GitHub Actions 工作流 `release-desktop.yml` 会自动：
   - 校验 tag 与 `desktop/package.json` 版本一致
   - 在 macOS / Windows / Linux 三个平台打包
   - 汇总产物
   - 自动创建或更新对应的 GitHub Release

当前默认发布形态：

- macOS：ad-hoc 签名产物
- Windows：未签名安装包
- Linux：标准发行包产物

后续如需正式签名 / notarization，可在此基础上继续补 GitHub Secrets 与签名配置。
