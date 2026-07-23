# GitHub Release Runbook Template

适用于需要用 **GitHub Actions + semver tag** 做自动发版的项目。

这是一份可迁移模板，不绑定当前仓库实现。使用时请先替换文中的占位符：

- `<repo>`
- `<module>`
- `<version-source>`
- `<release-workflow>`
- `<repair-workflow>`
- `<artifact-dir>`
- `<asset-pattern>`
- `<platform-matrix>`

---

## 1. 目标

建立一套稳定的 Release 运维流程，覆盖：

- 正式发版
- 历史 release 说明补修
- 失败中间版本清理
- 发布后核查

---

## 2. 正式发版流程

### 前置条件

- 版本号来源已明确，例如：
  - `package.json`
  - `Cargo.toml`
  - `pyproject.toml`
  - 其他单一版本源
- GitHub Actions 已配置正式发版 workflow：`<release-workflow>`
- workflow 通过 semver tag 触发，例如：

```yaml
on:
  push:
    tags:
      - "v*.*.*"
```

### 标准步骤

1. 更新 `<version-source>` 中的版本号
2. 将变更合并到主分支
3. 推送正式 tag

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

4. 等待 `<release-workflow>` 自动完成：
   - 校验 tag 与版本号一致
   - 构建 `<platform-matrix>`
   - 汇总安装资产
   - 生成 Release Notes
   - 创建或更新 GitHub Release

---

## 3. 历史 Release 说明补修

如果项目有历史 release 说明格式不统一、下载分组缺失、compare 链接失效等问题，建议单独维护一个修复 workflow：`<repair-workflow>`。

建议支持两种触发方式：

### 方式 A：手动触发

```yaml
on:
  workflow_dispatch:
```

### 方式 B：临时 tag 触发

```yaml
on:
  push:
    tags:
      - "repair-release-notes/v*.*.*"
```

### 补修逻辑建议

修复 workflow 建议做这几件事：

1. 确认目标 release 存在
2. 下载该 release 当前已有资产
3. 基于资产重新生成 Release Notes
4. 回写 Release 标题和说明

如果当前没有浏览器登录态或 API token 可直接人工操作，优先用：

```bash
git tag -f repair-release-notes/vX.Y.Z
git push origin refs/tags/repair-release-notes/vX.Y.Z
```

修复完成后清理临时 tag：

```bash
git push origin :refs/tags/repair-release-notes/vX.Y.Z
git tag -d repair-release-notes/vX.Y.Z
```

---

## 4. 失败中间版本清理

如果某次发布是失败中间版本，不希望继续保留：

### 删除远端 tag

```bash
git push origin :refs/tags/vX.Y.Z
```

### 删除本地 tag

```bash
git tag -d vX.Y.Z
```

### 清理后要复查

- `releases/tag/vX.Y.Z` 是否变为 `404`
- Releases 列表页是否仍可见
- 后续版本的 compare 链接是否因此断裂

---

## 5. 发布后核查清单

每次正式发版或历史说明补修后，至少检查：

- Release 页面是否已生成结构化下载说明
- compare 链接是否返回 `200`
- 安装资产是否返回 `200`
- 是否残留临时修复 tag
- 最新 workflow run 是否为成功状态

### compare 链接校验

```bash
curl -o /dev/null -s -w '%{http_code}\n' \
  'https://github.com/<repo>/compare/<from-tag>...<to-tag>'
```

### 安装资产校验

```bash
curl -L -o /dev/null -s -w '%{http_code}\n' \
  'https://github.com/<repo>/releases/download/vX.Y.Z/<asset-file>'
```

### workflow 页面校验

- `https://github.com/<repo>/actions`
- `https://github.com/<repo>/actions/workflows/<release-workflow-file>`

---

## 6. Release Notes 生成建议

建议把 release notes 生成逻辑独立成脚本，而不是直接把文案写死在 workflow 里。

脚本建议输入：

- release tag
- repo 名称
- 资产目录
- 输出文件路径

脚本建议输出：

- `下载`
  - 平台分组
  - 架构分组
  - 安装格式链接
- `变更`
  - compare 链接

这样做的好处：

- workflow 更简洁
- 历史 release 说明可重复生成
- 资产命名规则变化时，只需要改脚本

---

## 7. 推荐目录结构

```text
.github/workflows/
  <release-workflow-file>
  <repair-workflow-file>

scripts/
  generate-release-notes.*
  collect-release-assets.*
  verify-release-version.*
```

如果项目是多模块仓库，也可以把脚本放到模块目录中，例如：

```text
<module>/scripts/
```

---

## 8. 项目接入时需要替换的参数

迁移到新项目时，至少确认这些点：

- 版本号从哪里读
- 正式发版由哪个 tag 模式触发
- 资产文件名规则是什么
- 目标平台和架构矩阵是什么
- Release Notes 排版格式是什么
- 是否需要签名、公证、代码签名证书
- 是否需要 prerelease 分支逻辑

---

## 9. 最小操作清单

### 正式发版

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

### 修历史 release 说明

```bash
git tag -f repair-release-notes/vX.Y.Z
git push origin refs/tags/repair-release-notes/vX.Y.Z
```

### 清理失败版本

```bash
git push origin :refs/tags/vX.Y.Z
git tag -d vX.Y.Z
```

### 清理修复临时 tag

```bash
git push origin :refs/tags/repair-release-notes/vX.Y.Z
git tag -d repair-release-notes/vX.Y.Z
```
