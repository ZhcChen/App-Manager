---
title: feat: Redesign desktop UI toward activity monitor workflow
type: feat
status: completed
date: 2026-07-22
origin: user request on 2026-07-22
---

# feat: Redesign desktop UI toward activity monitor workflow

## Overview

将当前 `desktop/` 的首屏从品牌展示型壳层重构为更接近 macOS“活动监视器”的工具界面：顶部 tabs 切换不同监控视图，中间是密度更高的进程表格，底部是选中项和全局统计区，核心动作仍然是**结束某个进程**。

## Problem Frame

当前 UI 更像项目展示页，不像系统工具。用户已经明确要求界面更“正经”，并给出 macOS 活动监视器作为参考目标。新的设计重点不是照搬系统视觉细节，而是对齐其信息架构和使用节奏：

- 顶部 tabs 切换不同指标视角
- 主体以表格为中心，而不是卡片
- 进程选中和结束动作围绕一条主工作流展开

## Requirements Trace

- R1. 顶部必须有 tabs 切换，至少包含 `CPU / 内存 / 能耗 / 磁盘 / 网络`。
- R2. 主视图改为活动监视器风格的高密度表格，而不是卡片列表。
- R3. 在表格中或表格配套区域能结束选中的进程。
- R4. 结束进程仍需确认，且对受保护项禁用。
- R5. CPU / 内存视图要接入真实数据字段，而不是纯视觉占位。
- R6. 能耗 / 磁盘 / 网络视图本轮先建立结构和字段映射，允许基于当前 `sysinfo` 能力做轻量近似。
- R7. 底部应有全局统计或选中项信息区，增强“监视器”语义。
- R8. 继续保持当前 Tauri IPC 架构，不把关键逻辑挪回前端假数据层。

## Scope Boundaries

- 不追求像素级复刻 macOS 活动监视器。
- 不引入窗口级应用聚合。
- 不新增提权、批量结束、温和退出等系统动作。
- 不在本轮实现真正的 per-process 网络连接详情或磁盘历史图表。

## Key Technical Decisions

- 顶部 tabs 作为**视图切换器**，共享同一份进程数据源，而不是为每个 tab 分别拉取独立接口。
- Rust `process-core` 扩展出 CPU、内存、运行时、磁盘累计读写、用户名等字段，前端按 tab 决定展示哪些列。
- `CPU` 与 `内存` 视图直接消费真实字段；`能耗` 视图使用 CPU 占用和运行状态做轻量近似；`磁盘` 视图使用累计读写；`网络` 视图本轮以结构和空值占位为主。
- 结束进程动作从“每行按钮直出”调整为“选中行 + 主工具区动作”为主，同时保留行内快捷入口。

## Implementation Units

- [x] **Unit 1: 扩展进程数据模型与 IPC 返回字段**
  - Goal: 为活动监视器式表格提供 CPU、内存、运行时、磁盘、用户名等字段。
  - Files:
    - Modify: `crates/process-core/src/model.rs`
    - Modify: `crates/process-core/src/query.rs`
    - Modify: `crates/process-core/tests/process_core_smoke_test.rs`
    - Modify: `desktop/src/features/processes/types.ts`
    - Modify: `desktop/src/features/processes/mockProcesses.ts`
  - Verification:
    - Rust 测试可验证核心字段存在且当前进程仍被标记为 protected
    - 前端类型与 mock 数据同步更新

- [x] **Unit 2: 重构前端状态模型以支持 tabs / 选中行 / 视图列**
  - Goal: 为多 tab 视图和选中态建立可复用的状态层。
  - Files:
    - Modify: `desktop/src/features/processes/useProcesses.ts`
    - Create: `desktop/src/features/processes/view-config.ts`
    - Create: `desktop/src/features/processes/formatters.ts`
  - Verification:
    - 前端测试能覆盖 tab 切换后列配置与基础筛选逻辑

- [x] **Unit 3: 重做主界面为活动监视器式布局**
  - Goal: 落地顶部 tabs、工具栏、表格主体、底部信息区。
  - Files:
    - Modify: `desktop/src/App.tsx`
    - Modify: `desktop/src/styles/base.css`
    - Modify: `desktop/src/features/processes/components/ProcessToolbar.tsx`
    - Modify: `desktop/src/features/processes/components/ProcessList.tsx`
    - Modify: `desktop/src/features/processes/components/TerminateDialog.tsx`
    - Modify: `desktop/src/App.test.tsx`
    - Modify: `desktop/src/features/processes/components/ProcessList.test.tsx`
    - Modify: `desktop/src/features/processes/components/TerminateDialog.test.tsx`
  - Verification:
    - UI 出现顶部 tabs
    - 表格成为主视图
    - 选中行与结束动作可用

- [x] **Unit 4: 视觉回归与开发体验收口**
  - Goal: 用本地截图验证视觉方向，并保持当前 dev/build 流程可用。
  - Files:
    - Modify: `desktop/README.md` (if needed)
  - Verification:
    - `pnpm --dir desktop test`
    - `pnpm --dir desktop build`
    - `cargo test -p process-core`
    - 本地截图与活动监视器式结构一致

## Risks & Notes

- `sysinfo` 的 CPU 使用率需要差分采样，首帧可能不是稳定值；前端要接受“刷新后更准确”的表现。
- 用户名、线程等字段在不同平台可用性不完全一致，需要允许空值并优雅展示。
- 如果 macOS 上 `virtual_memory` 信息噪声过大，本轮内存视图优先展示 `memory` 常驻集。

## Verification Results

- `pnpm --dir desktop test`
- `pnpm --dir desktop build`
- `cargo test -p process-core`
- `cargo test --manifest-path desktop/src-tauri/Cargo.toml`
- 本地浏览器烟测：
  - 切换到 `内存` tab 后列配置更新为 `内存 / 虚拟内存 / % CPU / PID / 用户`
  - 点击结束按钮后确认弹窗正常出现
- 本地截图已人工检查，整体方向已收敛为更偏桌面工具、表格主导的活动监视器风格
