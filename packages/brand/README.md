# Brand Assets Module

共享品牌资源模块。

建议把所有需要跨端复用的视觉资源统一放在这里：

- `logo/`：主 logo、icon mark、导出版本
- `fonts/`：内置字体文件

这样做的好处：

- 桌面端和未来移动端都能复用
- 不把公共资源绑死在某个具体应用模块下
- 后续如果增加官网、文档站、营销页，也能继续复用

当前建议目录：

- `packages/brand/logo/app-manager-mark.svg`
- `packages/brand/fonts/`

当前主应用模块路径：

- `desktop/`

当前默认字体资源：

- `packages/brand/fonts/source-sans-3/`
