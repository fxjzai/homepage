# fxjzai GPU 修复与验收记录

日期：2026-09-05
本地构建标识：`2026-09-05-gpu-fix-2`

## 结论

本地 `gpu-fix-2` 已在同一台 Apple Silicon Mac 的 Chrome 与 Safari 上完成真实 WebGL 验收。白色外圈和红色斜杠在聚合后持续可见；暂停、恢复、重播、拖动、指针扰动、隐藏标签页返回及 WebGL 上下文丢失降级均正常。

正式网站仍发布 `gpu-fix-1`。Chrome 在正式网站的 WebGL 路径上仍能复现 Logo 不可见，因此不能把线上版本标记为已修复。需要由具备发布权限的 Agent 部署本记录对应的 `gpu-fix-2` 源码与构建产物后，再做一次线上复验。

## 可复现根因

1. 原顶点着色器对可能为负数的底数调用 `pow(x, 2.0)`。GLSL ES 规范明确规定 `x < 0` 时结果未定义；部分 GPU 驱动可能产生 NaN，并污染点尺寸和亮度计算。修订改为显式乘法，并把扫光计算限制在有效时间窗内。
2. 仅应用上述补丁后，Apple WebGL 上 Logo 仍不可见。逐项收窄后确认：每帧只更新了 React 创建时的外部 `uniforms` 对象，而实际挂载的 `ShaderMaterial` 使用的是自身的 uniforms 容器，导致真正提交给 GPU 的 `uIntro` 一直停留在初值，粒子始终散落在视野外。现在通过材质 ref 直接更新已挂载材质的 uniforms。

背景星点会让 draw calls 与 FPS 看起来正常，因此这次验收以真实画面、聚合完成状态和交互结果为准，而不是仅看提交计数。

## 动效调整

- 红色斜杠改为 2.8 秒一个完整周期的缓入缓出呼吸灯，聚合完成后才启用；暂停时保持稳定亮度。
- 指针影响半径和径向、切向、纵深力度均提高，粒子可以逸散得更开。
- 指针进入时响应更快，移开后采用较慢的解析回弹，约 1.8 秒衰减到 5% 以下，避免机械地瞬间归位。
- GPU 与 Canvas 2D 两条路径保持相同的呼吸节奏和交互方向。

## 测试环境

- MacBook Air，Apple M5，10 核 GPU，24 GB 内存
- Retina 显示器：2560 × 1664
- macOS 26.6.2（25G83）
- Safari 26.6.2
- Google Chrome 152.0.7977.76
- Node.js 22.22.3，npm 10.9.8
- 测试时使用电池供电且系统低电量模式开启；未更改用户电源或辅助功能设置

## 验收结果

| 场景 | 结果 | 证据摘要 |
| --- | --- | --- |
| 修复前 Chrome 生产预览 | 复现失败 | WebGL、22,000 粒子、60 FPS，但 13 秒后 Logo 仍完全不可见；强制 Canvas 可见 |
| 只应用 `gpu-fix-1` | 复现失败 | 负数 `pow` 已修，但 Chrome 12 秒后 GPU Logo 仍不可见 |
| Chrome 本地生产预览 | 通过 | WebGL、22,000 粒子、60 FPS、实际 DPR 1.5；10 秒、60 秒及 219 秒后 Logo 持续可见 |
| Safari 本地生产预览 | 通过 | WebGL、22,000 粒子、约 30 FPS；10 秒、60 秒及 292 秒后持续可见。低电量模式下未出现黑屏或降级抖动 |
| Chrome / Safari 开发模式 | 通过 | 两者均进入 WebGL；Chrome 60 FPS，Safari 约 30 FPS；重载后聚合正常 |
| 正式网站，同一台 Mac | 未通过，待发布 | `/release.json` 仍为 `gpu-fix-1`；Chrome WebGL 22,000 粒子、60 FPS，但 18 秒和 77 秒时 Logo 不可见 |
| 强制 Canvas | 通过 | Chrome Canvas 2D、6,200 粒子、60 FPS、单帧绘制约 2–3 ms；聚合、呼吸和交互正常 |
| 暂停、恢复、重播 | 通过 | 暂停时完整 Logo 保留；恢复继续运动；Chrome 连续重播 3 次、Safari 重播后均重新聚合 |
| 拖动与指针移开 | 通过 | GPU 路径可见更大范围的局部逸散和受限旋转；移开后约 2 秒柔和恢复 |
| 隐藏标签页后返回 | 通过 | 返回后无黑屏或异常跳变，Chrome 继续保持 60 FPS |
| 减少动态与用户偏好 | 通过 | 模拟系统减少动态时初始为静态 Logo；手动开启后写入 `fxjzai-motion-paused=false`，刷新仍保持开启 |
| WebGL 上下文丢失 | 通过 | Chrome 中主动触发 context loss 后自动切到 Canvas 2D，6,200 粒子、60 FPS，品牌与入口持续可见 |
| 资源完整性 | 通过 | 本地与线上 `/assets/logo-particles.bin` 均为 728,000 字节，SHA-256 一致，线上 MIME 为 `application/octet-stream` |
| 390px / 320px 布局 | 通过 | 两个宽度均无横向溢出，Logo、标题、社群入口、重播和动态开关均可见可触达 |
| `/join` | 通过 | 可独立打开；0 个 canvas，未请求 Three.js、ParticleLogo chunk 或 `logo-particles.bin`；二维码保持待配置状态 |

## 构建验证

`npm run build` 通过：TypeScript 构建与 Vite 生产打包均成功。Vite 仅报告现有 Three.js chunk 大于 500 kB 的性能提示，没有构建错误。

## 尚未覆盖

- 未取得真实 iPhone Safari 或 Android Chrome 设备，只完成了 390px 与 320px 的浏览器布局验收。
- 已实测 WebGL 上下文丢失自动降级；本轮没有额外注入粒子数据下载失败。线上粒子二进制的大小、SHA-256 与 MIME 已独立核验。
- 当前目录不是 Git 仓库，因此没有可报告的 commit hash，也没有执行 commit、push 或部署操作。

## 发布复验要求

部署后先确认 `/release.json` 为 `2026-09-05-gpu-fix-2`，然后在同一台 Mac 的 Safari 与 Chrome 重新观察 0–10 秒、60 秒待机、拖动、暂停/恢复和重播。只有线上资源标识与本构建一致且真实 GPU 画面通过，才应对正式网站宣称修复完成。
