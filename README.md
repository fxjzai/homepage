# 反向加载 · 粒子品牌首页

为 fxjzai.com 实现的交互式粒子品牌网站，支持静态托管。首页使用原始 Logo 蒙版采样的白色与红色星粒，独立 `/join` 社群页面不加载 Three.js。

## 本地运行与构建

需要 Node.js 20.19+ 或 22.12+。

```sh
npm ci
npm run dev
npm run build
npm run preview
```

构建产物为 `dist/`。依赖版本由 `package-lock.json` 固定。使用 Vite、React、TypeScript、Three.js 和 React Three Fiber。GPU 模式使用批量 Points 和自定义顶点着色器；兼容模式使用 Canvas 2D 实时计算三维投影。

## 交互

- 初始黑场与分批弧线聚合，白色外圈先出现，红色斜杠随后出现，并有一次亮度扫过。
- 移动指针产生阻尼视差与局部排斥、切向扰动；粒子可向外逸散，移开后约两秒柔和恢复。
- 鼠标或单指拖动有限旋转，松开后保留惯性并平滑归位。触摸采用 `pan-y`，保留页面纵向滚动。
- 点击 Logo 中央或右下角重播按钮重新聚合。
- 关闭动态效果会显示静止星群，并保存本机偏好。初次访问遵循系统减少动态效果设置；用户可通过按钮明确开启本页动画。
- 页面不可见时停止持续渲染；回到页面后平滑续播。

## 粒子与性能

- 原图暗色外圈与红色斜杠分别提取，采样比例精确为 79:21。
- GPU 原始数据 26,000 点；普通桌面使用 22,000 点，低核数设备使用 14,000 点，窄屏使用 6,500 点。
- Canvas 2D 兼容模式桌面使用 6,200 点，手机使用 3,200 点。持续低帧率时减少到最低 2,400 点。
- 初始 DPR 上限：桌面 1.5，手机 1.15。GPU 模式热身后连续两个两秒窗口低于 45 FPS 时逐步降低 DPR，最低 0.75。
- 约 6.5% 的高亮星点使用较大的柔和光晕点精灵，无全屏后处理，保持品牌红色。
- GPU 模式的 Logo 和背景各一次 Points 批量绘制，CPU 不逐帧遍历粒子。Canvas 2D 模式使用批量 Path2D 和缓存星点精灵，粒子规模保持在 6,200 点以内。
- 页面立即启动 Canvas 2D 粒子，GPU 完成实际绘制后平滑接管。WebGL 2 不可用、上下文丢失、初始化超过 7 秒或 GPU 粒子数据失败时，继续使用支持聚合、拖拽、扰动、重播的 Canvas 2D 模式。
- 兼容模式的 Logo 坐标随前端代码打包，独立于 GPU 二进制请求。GPU 数据请求设置 6 秒超时，失败后允许重试。
- 仅在 Canvas 2D 本身也无法使用时，展示静态 SVG。用户选择关闭动态效果时，停止动画循环。
- 主页面、Three.js 和场景代码拆包。`/join` 不发起 WebGL 和粒子数据请求。

## 配置社群入口

二维码和备用联系方式可以在部署前自行配置。代码中已经保留文件夹与配置入口，无需提供给开发者。

1. 把二维码图片复制到 `public/assets/community/`，例如 `public/assets/community/qr-20260905.png`。
2. 修改 `public/community.json`。`qrImage` 填写浏览器路径，省略 `public` 前缀：

```json
{
  "qrImage": "/assets/community/qr-20260905.png",
  "qrUpdatedAt": "2026-09-05-v1",
  "contactLabel": "微信号",
  "contactValue": "你的备用联系方式",
  "contactUrl": ""
}
```

3. 执行 `npm run build`，将新生成的 `dist/` 部署到 Cloudflare Pages。打开 `/join` 检查二维码。

二维码支持手机长按保存和保存按钮。建议使用同源图片，以获得可靠的下载行为。以后替换二维码时使用新的文件名并更新 `qrUpdatedAt`，然后重新构建部署。

配置文件使用 `no-store` 请求，`_headers` 也禁止缓存该配置。更新静态配置或图片后重新构建并部署。没有提供二维码和备用联系方式时，社群页显示真实的待开放状态。图片加载失败时保留备用联系方式。

`contactUrl` 可留空，也可填写 `https://`、`mailto:` 或 `tel:` 链接。页面提供备用联系方式复制操作。

## Cloudflare Pages

1. 将项目放入自己的 Git 仓库并连接 Cloudflare Pages。
2. Framework preset 使用 Vite，构建命令为 `npm run build`，输出目录为 `dist`。
3. 构建环境选择上述受支持的 Node 版本。
4. 在 Cloudflare Pages 项目里添加并验证 `fxjzai.com` 自定义域名。

`public/_redirects` 包含 `/join` 的 SPA 回退。没有数据库、账户系统或后端运行依赖。当前 Sites 私密预览独立于 fxjzai.com 域名；没有替用户更改 DNS。

## 重建 Logo 数据

Python 依赖：`numpy`、`Pillow`、`scipy`。运行：

```sh
python3 scripts/generate_logo_assets.py --output /tmp/fxjzai-logo-assets
```

将生成的 `logo-particles.bin` 复制到 `public/assets/`，将 `logo-particle-fallback.svg` 复制为 `public/assets/logo-particles.svg`，将 `logo-mark.svg` 复制为 `public/assets/brand-mark.svg`，同时复制 `background-stars.svg`。将 `logoTargetsLite.json` 复制到 `src/scene/logoTargetsLite.json`，使 Canvas 2D 兼容模式使用相同的新造型。原始附件保留在 `public/assets/logo-source.png`。

数据为小端 float32，每条记录 7 个数值：`[x, y, z, type, seed, size, brightness]`。XY 最大轴长 2，Y 向上，Z 为 ±0.035，type 0 为白色、1 为红色。数据每 100 条保持 79:21 比例，支持不同性能档位复用。

## 验证范围

TypeScript 检查与生产构建通过。2026-09-05 已在 Apple M5 MacBook Air 上完成真实 WebGL 验收：Chrome 使用 22,000 粒子、DPR 1.5，稳定约 60 FPS，连续运行 219 秒后 Logo 仍完整可见；Safari 在系统低电量模式下使用 22,000 粒子，稳定约 30 FPS，连续运行 292 秒后仍完整可见。

强制 Canvas 2D 模式使用桌面 6,200 点，稳定约 60 FPS，单帧绘制约 2–3ms。已验证聚合、拖拽、指针逸散与恢复、暂停、恢复、重复重播、隐藏标签页返回、系统减少动态设置和用户偏好持久化。主动触发 WebGL 上下文丢失后会自动切换到 Canvas 2D，品牌内容和社群入口保持可用。

已检查 390px 与 320px 窄屏布局，没有横向溢出；这些是桌面浏览器视口测试，真实 iPhone Safari 与 Android Chrome 硬件仍需在取得设备后补测。`/join` 可独立加载，不请求 Three.js、粒子数据或 WebGL。

调试时访问 `/?debug=1` 可查看当前渲染器、粒子数量、帧率、帧号和旋转角度。访问 `/?renderer=canvas&debug=1` 可主动选择兼容渲染。正常首页隐藏这些诊断信息。
