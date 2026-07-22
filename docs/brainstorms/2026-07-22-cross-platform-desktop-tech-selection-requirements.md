---
date: 2026-07-22
topic: cross-platform-desktop-tech-selection
---

# 跨平台桌面应用技术选型

## Problem Frame
项目目标是开发一款桌面应用管理工具，面向 macOS、Windows、Linux 三个平台。首个核心能力是展示当前已打开的应用，并在 GUI 中提供结束进程的操作。

这个产品天然依赖操作系统能力，技术选型要优先考虑三件事：
- 跨平台一致性：同一套产品逻辑能在三端稳定运行
- 原生系统能力：能可靠获取进程列表、结束进程、处理权限差异
- 常驻成本：安装包体积、内存占用、启动速度不应过重

## Requirements

**产品范围**
- R1. 应用需支持 macOS、Windows、Linux 三个平台发布。
- R2. 首期版本需支持读取当前运行中的应用或进程列表。
- R3. 首期版本需支持在 GUI 中触发结束进程操作。
- R4. 首期版本需明确处理“结束失败”的场景，包括权限不足、目标进程已退出、系统拒绝操作。

**技术能力**
- R5. 技术栈需支持稳定调用各平台原生能力，而不是只停留在浏览器沙箱能力。
- R6. 技术栈需支持桌面打包、签名与后续自动更新能力扩展。
- R7. 技术栈应适合多模块仓库演进，允许将 UI、系统能力、共享模型拆分管理。
- R8. 技术栈应避免为一个系统工具类应用引入过高的运行时资源开销。

**工程效率**
- R9. 前端界面层应保持较高开发效率，方便后续扩展搜索、排序、托盘、快捷操作等功能。
- R10. 系统能力层应尽量集中，避免三端分别维护大量平台专属 UI 代码。

## Success Criteria
- 在三大桌面平台上都能跑通“列出运行中应用/进程 -> 用户点击 -> 结束目标进程 -> 界面反馈结果”这条主链路。
- 核心系统能力有清晰边界，后续增加托盘、开机启动、窗口管理、进程过滤时不需要推倒重来。
- 团队能够在可接受学习成本内启动开发，并建立可维护的构建与发布流程。

## Scope Boundaries
- 首期不要求做完整任务管理器级别的系统监控。
- 首期不要求做 CPU、内存、网络等高级指标分析。
- 首期不要求做跨设备同步、云端账户或远程控制。
- 首期不要求在同一阶段支持移动端。

## Key Decisions
- 决策：优先考虑“Web UI + 原生后端”的跨平台桌面框架，而不是纯浏览器或纯原生三套 UI。
  - 理由：当前核心能力依赖 OS 进程管理，单纯 Web 技术不够；同时产品 UI 复杂度不高，没必要分别维护三套原生界面。
- 决策：桌面端正式选用 `Tauri 2 + Rust + TypeScript 前端`。
  - 理由：官方文档显示 Tauri 2 采用“前端 WebView + Rust 后端”的架构，并面向 Linux、macOS、Windows 提供桌面能力；对系统工具类应用，原生 WebView 架构通常比 Electron 更轻，Rust 也更适合承载进程枚举与结束进程这类系统能力。
- 决策：主应用模块直接使用根目录 `desktop/`，不额外包一层 `apps/`。
  - 理由：当前仓库规模还小，根目录直放主应用模块更直接；未来若增加移动端，可再平行增加 `mobile/`。
- 决策：跨端共享品牌资源统一放在 `packages/brand/`。
  - 理由：logo、字体等资源不应绑定在桌面模块下，便于未来移动端或其他入口复用。
- 决策：`Wails + Go + TypeScript 前端` 作为第二候选。
  - 理由：Wails 同样采用原生 WebView，并以 Go 承载后端系统能力；如果团队 Go 经验显著强于 Rust，它是可行备选。
- 决策：`Electron + TypeScript` 保留为“效率优先”的备选，不作为默认首选。
  - 理由：Electron 生态成熟、前端开发门槛最低，但它自带 Chromium + Node.js，常驻资源成本通常更高；对于一个偏系统工具、可能需要常驻的应用，这不是默认最优解。

## Alternatives Considered

| 方案 | 适合场景 | 优点 | 主要代价/风险 |
| --- | --- | --- | --- |
| Tauri 2 + Rust + TypeScript | 追求轻量、长期可维护、系统能力优先 | 体积和内存更友好；原生能力边界清晰；安全模型较强 | Rust 学习成本更高；桌面打包链路需要尽早固化 |
| Wails + Go + TypeScript | 团队 Go 能力强，希望轻量原生 WebView | Go 后端开发效率高；适合系统工具；原生集成直接 | 当前官方文档近期更新较快，版本演进节奏需额外确认 |
| Electron + TypeScript | 团队希望最快交付，且能接受资源占用 | 生态最大；招聘与上手成本最低；前端开发体验成熟 | 包体和内存更重；系统工具类常驻成本偏高 |

## Dependencies / Assumptions
- 假设本项目是绿色新项目，没有必须复用的既有技术栈。
- 假设目标产品会逐步扩展到托盘、后台常驻、权限提示、自动更新等标准桌面能力。
- 假设团队可以接受引入一门系统语言作为桌面后端（Rust 或 Go）。

## Outstanding Questions

### Resolve Before Planning
- [Affects R6][User decision] 首期是否需要把“托盘常驻、开机启动、自动更新”纳入同一轮设计，而不是后补？

### Deferred to Planning
- [Affects R2][Technical] 运行中“应用”的定义是按顶层窗口聚合，还是按 OS 进程粒度展示？
- [Affects R3][Technical] 结束进程是否需要区分“温和退出”和“强制终止”两类动作？
- [Affects R6][Needs research] 三个平台的签名、权限提示、安装包分发链路应如何统一设计？

## Next Steps
→ 先补齐 `Resolve Before Planning` 中剩余决策问题，再进入 `ce:plan`

## Research Notes
- Tauri 官方文档说明其桌面架构为原生 WebView + Rust 后端，并支持 Linux、macOS、Windows：<https://v2.tauri.app/concept/architecture> / <https://v2.tauri.app/security/capabilities>
- Electron 官方文档说明其使用 Chromium + Node.js，支持 macOS、Windows、Linux：<https://electronjs.org/docs/latest> / <https://github.com/electron/electron>
- Wails 官方文档说明其使用 Go 后端 + 原生 WebView，支持 Windows、macOS、Linux：<https://v3.wails.io/concepts/architecture/> / <https://v3.wails.io/>
