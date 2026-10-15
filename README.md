# 反向加载 · 粒子品牌首页

为 fxjzai.com 实现的交互式粒子品牌网站，支持静态托管。首页使用原始 Logo 蒙版采样的白色与红色星粒，独立 `/join` 社群页面不加载 Three.js。构建时生成完整 HTML，浏览器接管后启动交互。

## 本地运行与构建

构建需要 Node.js 20.19+ 或 22.12+；执行数值回归测试需要 22.18+。

```sh
npm ci
npm run dev
npm run build
npm run preview
```

开发服务器与生产预览默认使用同一个 4173 端口，选择其一运行。构建产物为 `dist/`。依赖版本由 `package-lock.json` 固定。使用 Vite、React、TypeScript、Three.js 和 React Three Fiber。GPU 模式使用批量 Points 和自定义顶点着色器；兼容模式使用 Canvas 2D 实时计算三维投影。

`npm run build` 先做 TypeScript 检查，再构建浏览器资源，并通过 React 在构建时生成 `index.html`、`join.html`、`404.html`、`sitemap.xml` 和 `robots.txt`。生产环境不需要 Node 服务。开发服务器运行客户端版本；静态正文、元信息和 HTTP 行为应使用生产预览验收。需要并存时运行 `npm run preview -- --port 4174 --strictPort`。

## 页面与内容架构

- `src/content/site.ts`：品牌信息、正式域名、首页文案与主入口。默认配置保留定型首页，包含社群与科技资讯站（`https://ic.fxjzai.com/`）入口；活动期间可以改文案和链接，恢复配置即可还原。
- `src/app/routes.ts`：页面地址、标题、描述、是否允许索引；`src/app/App.tsx`：对应页面的按需加载器。新增页面需要同时登记这两处。
- `src/app/metadata.ts`：逐页 canonical、Open Graph、基础 WebPage JSON-LD 和 robots 元信息。所有内容必须与真实页面一致，不虚构组织、产品或事件。
- `src/entry-server.tsx` 与 `scripts/build.mjs`：使用同一页面组件生成 HTML，避免维护两套正文。浏览器通过 hydration 接管，浏览器专用状态与粒子在挂载后初始化。
- `src/app/navigation.ts`：悬停/键盘聚焦时预取已知站内页面的 HTML，省流量或慢速网络跳过；普通链接负责跳转、历史和焦点行为。支持的浏览器使用 160ms 原生页面过渡，减少动态偏好下禁用过渡。
- `src/scene/`：现有粒子实现，与新增产品分开。`/join` 和 404 不加载首页模块、Three.js 或粒子数据。

没有 JavaScript 时，首页显示原有静态 Logo、文案和可用链接；动态按钮隐藏。社群页初始内容来自构建时的配置，浏览器再请求最新 `community.json`，请求失败保留已有内容。

### 后续轻量产品边界

AI 时代编年史暂未实现，也没有在正式首页添加未完成入口。后续采用 `/ai-history` 单页面：仅分「LLM 时代」与「更早时期」，默认最新在前，向前回溯；使用紧凑事件列表和品牌/事件类型筛选，避免为每个品牌铺一条宽泳道。覆盖 GPT、Claude、Gemini、Grok、DeepSeek、Qwen、Kimi、GLM 等，也记录编程工具诞生、产品整合等重要变化。事件日期、来源及事实须调研核实后录入。内容数据与筛选组件分开即可，不引入事件详情子站、CMS 或数据库。

## 交互

- 初始黑场与分批弧线聚合，白色外圈先出现，红色斜杠随后出现，红色斜杠聚合后每 2.8 秒出现一次沿斜杠移动的扫描高亮（约 1.15 秒扫过，其余时间保持常亮）。
- 每颗 Logo 星粒沿原始轮廓内的小范围闭合路线缓慢流动，速度与相位各异；边缘粒子适度降亮，柔化高密度硬边。造型不自动旋转，也不沿整个箭头循环移动。
- 指针移动沿整段轨迹注入顺向动量，每颗粒子保存独立的位移、速度与惯性；按已经移动的位置继续受力，因此连续画圈可以反复搅动。鼠标可以暂时把粒子带出 Logo，停手后自然衰减并回归内部流动，GPU 只在 5–6 秒末段淡去极小余势，不再强制两秒归位。静止指针不施力；首次进入、页面恢复和结束拖动不会造成突发冲量。
- 背景保持稀疏的冷暖星点，也响应鼠标移动。悬停不再倾斜整个 Logo；按住拖动才控制视角。
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
- GPU 模式桌面背景 2,200 点、手机 750 点。Logo 和背景各一次 Points 绘制，CPU 不逐帧遍历粒子。每批粒子使用两张 128 列的半浮点状态纹理，RGBA 保存屏幕位移 XY 与速度 XY；有新鼠标动作时各增加一次状态绘制并交换纹理，停手时在顶点着色器里解析计算阻尼。WebGL 缺少半浮点颜色缓冲支持时使用 Canvas 2D。
- Canvas 2D 使用同样的逐粒子动量方程，背景桌面 1,300 点、手机 500 点，Logo 保持 6,200 点以内，使用批量 Path2D 与缓存光晕精灵。两种模式都在初始化时根据原始 SVG 检查 Logo 内部流动路径；流动路径直接使用随代码打包的 SVG，不额外请求资源。
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

也可以在 Cloudflare 控制台选择 Pages → 拖放文件，上传 `dist/` 的内容或以这些文件为根目录的 ZIP；不要上传源码或包含外层 `dist` 目录的 ZIP。直接上传项目后续继续采用直接上传方式更新。

Pages 按无扩展名地址提供静态 HTML，`/join` 对应 `join.html`，`404.html` 保证未知路径返回 404。构建生成去除页面尾斜杠的 301 规则，不使用全站 SPA 回退。没有数据库、账户系统或后端运行依赖。`robots.txt` 与站点地图开放正式内容，404 标记 `noindex`；配置中的正式域名应与最终绑定域名一致。

## 重建 Logo 数据

Python 依赖：`numpy`、`Pillow`、`scipy`。运行：

```sh
python3 scripts/generate_logo_assets.py --output /tmp/fxjzai-logo-assets
```

将生成的 `logo-particles.bin` 复制到 `public/assets/`，将 `logo-particle-fallback.svg` 复制为 `public/assets/logo-particles.svg`，将 `logo-mark.svg` 复制为 `public/assets/brand-mark.svg`，同时复制 `background-stars.svg`。将 `logoTargetsLite.json` 复制到 `src/scene/logoTargetsLite.json`，使 Canvas 2D 兼容模式使用相同的新造型。原始附件保留在 `public/assets/logo-source.png`。

数据为小端 float32，每条记录 7 个数值：`[x, y, z, type, seed, size, brightness]`。XY 最大轴长 2，Y 向上，Z 为 ±0.035，type 0 为白色、1 为红色。数据每 100 条保持 79:21 比例，支持不同性能档位复用。

## 验证范围

当前站点发布版本为 `2026-10-15-brand-navigation-1`，更新记录见 [CHANGELOG.md](CHANGELOG.md)；本次仅调整导航，粒子实现沿用 `2026-09-06-particle-flow-1`。回归测试使用 Node.js 22.18+：先 `npm run build`，再 `node --test tests/*.test.mjs`。数值测试覆盖移动输入、轨迹中段受力、当前位置受力、惯性差异、30/60/120Hz 阻尼一致性、Logo 路径范围与接缝连续性；站点测试覆盖未知路由、元信息转义、构建后的正文和 SEO 输出。

粒子版本此前在 Edge 验证连续搅动、手动视角、暂停、恢复与重播；WebGL 桌面 22,000 点和 Canvas 2D 6,200 点均约 60 FPS，Canvas 绘制采样约 5ms。390px 视口 WebGL 6,500 点约 60 FPS，无横向溢出。尚未覆盖真实手机或重新验收 Safari。

本次静态页面重构在 Edge 生产预览中验证：1462×693 视口下导航、品牌、首页文案、侧边说明、页脚和按钮的文字、坐标、尺寸、字体、颜色与重构前一致；WebGL 桌面 22,000 点与 Canvas 2D 6,200 点采样约 60 FPS，Canvas 拖动、暂停、刷新后保持偏好正常。390×844 视口 WebGL 6,500 点约 60 FPS，无横向溢出；禁用 JavaScript 后首页及社群页可读、可跳转；系统减少动态模式自动暂停；社群导航不请求首页、Three.js 或粒子资源，前进后退正常。HTTP 检查首页/社群/robots/sitemap 为 200、尾斜杠为 301、未知页面为 404。构建与 11 项回归通过。上述为桌面 Edge 和视口模拟，不代表真实手机验收。

鼠标运动参考了 [OpenAI Astra 公开页面](https://openai.com/index/gpt-6-astra/) 中逐粒子动量与解析衰减的思路；当前实现是独立粒子运动，未引入压力流体求解器。

调试时访问 `/?debug=1` 可查看当前渲染器、粒子数量、帧率、帧号和旋转角度。访问 `/?renderer=canvas&debug=1` 可主动选择兼容渲染。正常首页隐藏这些诊断信息。

## 仓库维护

保留源码、测试、依赖锁文件及 `public/assets/` 的必要静态资源。`node_modules/`、`dist/`、日志、本地环境配置、浏览器临时产物和根目录交付 ZIP 由 `.gitignore` 排除。部署包按需从当前构建生成，不在仓库内保留旧版源码包或补丁。

项目维护约定见 [AGENTS.md](AGENTS.md)。
