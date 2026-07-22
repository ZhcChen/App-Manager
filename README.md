# App Manager

跨平台桌面应用管理工具。

当前仓库重点：

- `desktop/`：Tauri 2 桌面应用模块
- `packages/brand/`：共享 logo / 字体 / 视觉资源
- `docs/`：CE 产物文档

当前桌面端目标：

- 展示运行中的应用/进程
- 搜索和筛选目标项
- 在 GUI 中触发结束进程
- 对失败原因做明确反馈
- 通过 Tauri IPC 调用 Rust 进程核心

## 开发命令

```bash
pnpm install
pnpm dev:desktop
```

## 计划文档

- `docs/brainstorms/2026-07-22-cross-platform-desktop-tech-selection-requirements.md`
- `docs/plans/2026-07-22-001-feat-tauri-desktop-foundation-plan.md`

## macOS 签名

当前桌面端在开发阶段先使用 **ad-hoc** 签名：

- `desktop/src-tauri/tauri.conf.json`
- `bundle.macOS.signingIdentity = "-"`
