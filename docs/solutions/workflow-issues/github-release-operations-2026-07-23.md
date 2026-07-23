---
title: GitHub Release 发布与历史说明修复流程
date: 2026-07-23
category: workflow-issues
module: release-management
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - 需要发布新的桌面端版本
  - 历史 GitHub Release 说明需要重新排版或补修
  - 失败中间版本的 tag 或 release 页面需要清理
tags: [github-release, github-actions, release-notes, semver-tags, electron]
---

# GitHub Release 发布与历史说明修复流程

## Context

桌面端当前通过 GitHub Actions 自动构建并发布多平台安装包，但发布链路里有两类额外运维动作需要固定下来：

1. 新版本需要按统一格式生成下载说明，并验证多平台资产是否完整可下载。
2. 历史 release 可能因为说明格式较旧、compare 链接失效，或中间失败版本残留而需要补修。

在 2026-07-23 的这轮整理中，已经完成：

- 清理失败中间版本 `v0.1.7`、`v0.1.8`
- 修复 `v0.1.3` 的旧版 release 说明
- 修复 `v0.1.9` 指向已删除 `v0.1.8` 的 compare 链接
- 确认 `v0.1.10` 当前 8 个安装资产都可正常下载

## Guidance

### 1. 正常发布流程

桌面端正式发布以 semver tag 驱动：

1. 更新 `desktop/package.json` 的版本号
2. 将变更合并到 `main`
3. 推送正式 tag，例如 `v0.1.10`
4. 由 `.github/workflows/release-desktop.yml` 自动完成：
   - 校验 tag 与 `desktop/package.json.version`
   - 多平台构建
   - 汇总资产
   - 生成 release 说明
   - 创建或更新 GitHub Release

### 2. 历史 release 说明补修流程

仓库已提供 `.github/workflows/repair-release-notes.yml`，支持两种触发方式：

- GitHub Actions 页面手动 `workflow_dispatch`
- 推送临时 tag：`repair-release-notes/vX.Y.Z`

补修逻辑会：

1. 读取目标 release 的现有资产
2. 调用 `desktop/scripts/generate-release-notes.mjs`
3. 重新生成“下载 / 平台 / 架构 / 查看完整变更”格式
4. 回写对应 GitHub Release 的标题和说明

无浏览器登录态时，优先使用临时 tag 触发修复，再在成功后删除该 tag。

### 3. 失败中间版本清理流程

如果某个中间版本不希望继续暴露，应优先删除远端 tag：

```bash
git push origin :refs/tags/v0.1.7 :refs/tags/v0.1.8
```

然后同步删除本地 tag：

```bash
git tag -d v0.1.7 v0.1.8
```

删除 tag 后，需要再次检查：

- release tag 直链是否已变成 `404`
- Releases 列表页是否仍显示该版本
- 其余历史版本的 compare 链接是否因此失效

### 4. 发布后核查清单

每次发布或修复 release 后，至少检查：

- Release 页面是否为结构化下载说明
- compare 链接是否返回 `200`
- 最新版本各平台安装资产是否返回 `200`
- 是否残留临时修复 tag `repair-release-notes/*`

## Why This Matters

这套流程能解决三个常见问题：

1. **说明漂移**：旧 release 说明和新 release 说明格式不一致，下载入口不直观。
2. **链路失效**：删除失败中间版本后，后续 release 的 compare 链接可能指向已不存在的 tag。
3. **权限受限时仍可修复**：即使当前浏览器未登录 GitHub，只要还能 `git push`，就能通过临时 tag + GitHub Actions 完成远端 release 修复。

## When to Apply

- 发布新的桌面端正式版本时
- 删除失败或不应保留的中间版本 tag 后
- 发现历史 Release 仍显示 `Full Changelog` 旧格式时
- 发现“查看完整变更”跳转到 `404` 时

## Examples

### 正式发布

```bash
git push origin v0.1.10
```

对应 workflow：

- `.github/workflows/release-desktop.yml`

### 修复历史 release 说明

```bash
git tag -f repair-release-notes/v0.1.9
git push origin refs/tags/repair-release-notes/v0.1.9
```

等待 `Repair Release Notes` 成功后清理：

```bash
git push origin :refs/tags/repair-release-notes/v0.1.9
git tag -d repair-release-notes/v0.1.9
```

### 校验 compare 链接

```bash
curl -o /dev/null -s -w '%{http_code}\n' \
  'https://github.com/ZhcChen/App-Manager/compare/v0.1.6...v0.1.9'
```

### 校验安装资产

```bash
curl -L -o /dev/null -s -w '%{http_code}\n' \
  'https://github.com/ZhcChen/App-Manager/releases/download/v0.1.10/App-Manager-0.1.10-mac-arm64.dmg'
```

## Related

- `.github/workflows/release-desktop.yml`
- `.github/workflows/repair-release-notes.yml`
- `desktop/scripts/generate-release-notes.mjs`
