# 项目维护约定

本项目是 Vite + React + TypeScript 的静态站点；交互、资源重建与部署说明见 [README.md](README.md)。

## 开发与验证

- 安装依赖用 `npm ci`，保留 `package-lock.json`。
- 开发用 `npm run dev`；生产验收先 `npm run build`，再 `npm run preview`。两者默认同为 4173 端口，选择其一运行。
- 官网使用 Workers 静态资源托管；发布用 `npm run deploy`（预渲染构建后执行 `cf deploy --prebuilt --mode production`），不要直接运行会触发框架自动配置的 `cf deploy`。配置与回退流程见 README。
- 回归用 `node --test tests/*.test.mjs`，需要 Node.js 22.18+；站点测试读取生产产物，先运行 `npm run build`。
- 动效修改需检查真实 WebGL 画面，以及 `/?renderer=canvas&debug=1` 的兼容路径；draw calls 和 FPS 不能单独证明 Logo 可见。
- 未实测的浏览器或手机硬件不得标记通过。更新版本标识时同步 `public/release.json` 与 `src/pages/HomePage.tsx`。

## 实现边界

- 首页 WebGL 场景位于 `src/scene/`；Canvas 2D 是可交互回退，最后才使用静态 SVG。`/join` 不加载 Three.js 或粒子数据。
- 逐帧更新实际挂载的 `ShaderMaterial.uniforms`；不要只改 React 创建时的外部 uniforms 对象。
- GLSL 对可能为负的值求平方使用乘法，不能用 `pow(x, 2.0)`，避免驱动产生 NaN。
- GPU 与 Canvas 的鼠标运动方程保持同步；指针进入、恢复页面和调整窗口尺寸时不得制造虚假冲量。
- 保留减少动态偏好、隐藏页面暂停、GPU 失败回退与 DPR 自适应。
- 默认保持原始 Logo 造型，平时粒子在轮廓内流动；鼠标可短暂带出，按住拖动控制视角。设计变更以用户明确要求为准。
- 原始图、SVG、GPU 二进制与 Canvas 采样坐标是必要源资源，不能当作构建垃圾删除；重建流程见 README。
- 社群配置入口为 `public/community.json`，没有用户提供的内容时保留待配置状态。
- 页面在构建时预渲染并在浏览器 hydration；首轮渲染不能依赖 window、document、时间、localStorage 或设备偏好，相关状态在 effect 中初始化。粒子运动不因页面架构调整而改写。
- 新页登记 `src/app/routes.ts` 与 `src/app/App.tsx`，使用独立按需加载模块。保留真实 404，不恢复全站 SPA 回退。
- 首页文案和入口配置位于 `src/content/site.ts`，默认视觉与交互已定型；架构调整不能顺带改版。

## 仓库卫生

- 提交源码、必要静态资源和测试；依赖、`dist/`、日志和交付 ZIP 留在忽略规则中。
- 当前用法维护在 README，长期约定维护在本文件；不累积过时交接单或阶段性补丁。
