# Fonts

当前默认 UI 字体选择：

- `Source Sans 3`

选择理由：

- 面向 UI 环境设计，阅读压力低
- 字形中性，适合工具型桌面应用
- 授权清晰，适合商用项目
- 已下载为本地离线资源，便于 Tauri 桌面端直接打包

当前已收录字重：

- `400` Regular
- `500` Medium
- `600` Semibold

目录：

```text
packages/brand/fonts/source-sans-3/
  LICENSE.md
  SourceSans3-Regular.otf.woff2
  SourceSans3-Medium.otf.woff2
  SourceSans3-Semibold.otf.woff2
```

接入建议：

- 英文/数字/按钮主字体使用 `Source Sans 3`
- 中文首期先走系统 fallback
- 后续若要统一中文观感，再单独引入可商用 CJK 字体

建议字体栈：

```css
font-family:
  "Source Sans 3",
  "PingFang SC",
  "Microsoft YaHei",
  "Noto Sans CJK SC",
  sans-serif;
```

来源：

- Adobe 官方仓库：`https://github.com/adobe-fonts/source-sans`
- 授权文件：`packages/brand/fonts/source-sans-3/LICENSE.md`
