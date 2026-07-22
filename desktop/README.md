# Desktop App Module

桌面应用主模块。

当前已确定采用：

- `Tauri 2`
- `Rust` 负责桌面宿主与系统能力
- `TypeScript` 负责前端 UI

建议这里承载：

- Tauri 宿主工程
- 桌面端前端 UI
- 桌面端打包与分发配置
- 桌面专属集成能力

当前命名采用 `desktop/`，原因是：

- 根目录直接表达模块职责，不再额外包一层 `apps/`
- 和未来可能新增的 `mobile/`、`web/` 保持对称
- 对多模块仓库足够直接，路径更短

## 当前结构

```text
desktop/
  src/                 # React UI
  src-tauri/           # Tauri Rust host
```

## 开发命令

```bash
pnpm install
pnpm dev:desktop
```

## 当前阶段

- 已完成桌面壳与首屏 UI 骨架
- 已接入 `packages/brand/` 的本地 logo / 字体资源
- 已接入真实进程列表 / 结束进程 IPC
- 当前刷新策略为：首次加载、手动刷新、15 秒低频自动刷新
- 当前保护规则为：自身或受保护项不会暴露可执行的结束动作

## macOS 签名

- 当前开发阶段先使用 **ad-hoc** 签名
- Tauri 配置位于 `desktop/src-tauri/tauri.conf.json`
- 当前值为：`bundle.macOS.signingIdentity = "-"`
