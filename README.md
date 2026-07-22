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
