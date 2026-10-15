# 更新日志

## 2026-10-15 · 迁移至 Cloudflare Workers

发布标识：`2026-10-15-workers-1`

- 从传统 Pages 迁移到 Workers 静态资源托管，使用 `cf` CLI 发布。
- 保留构建时预渲染、独立社群页、真实 404、SEO 元信息与现有粒子交互。
- 将正式域名 `fxjzai.com` 绑定至官网 Worker，旧 Pages 部署保留用于回退。

## 2026-10-15 · 品牌入口互通

发布标识：`2026-10-15-brand-navigation-1`

- 官网顶部新增「科技资讯」，访问 `https://ic.fxjzai.com/`。
- 保留原有「进入社群」入口与首页粒子视觉、交互和兼容回退。
- 调整窄屏导航排版，避免入口文案换行和横向溢出。
- 资讯站同步统一品牌 Logo 与黑白红视觉，并提供返回官网入口；其读者更新日志位于 `https://ic.fxjzai.com/changelog`。
