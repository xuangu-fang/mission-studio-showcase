# 开发与部署

## 参考环境

- 使用 Linux CI 和 deployment build；
- 使用 Node active LTS 和 pnpm，并在第一个 coding PR 中固定准确版本；
- 支持 WebGL 的现代常青桌面浏览器；
- Playwright 浏览器安装在固定版本的 CI image/container 中；
- Static mode 不需要 Python 或私有 service。

本地开发可以使用 Windows 和 macOS，但构建和 screenshot baseline 以 Linux CI 为准。

## 规划中的 build mode

### Static

```text
VITE_STUDIO_MODE=static
VITE_PUBLIC_FIXTURE_BASE=./fixtures
```

使用已提交且经过审查的 fixture，不依赖 API。

### Password-protected Authoring

```text
VITE_CORE_API_BASE_URL=https://mission-studio-gateway.example
```

浏览器配置中只能出现 Gateway 的 public URL。DeepSeek key 和演示密码摘要由 Serverless runtime 管理，secret 永远不能使用 `VITE_*` 变量。浏览器发送用户临时输入的演示密码；密码不进入 repository、build artifact 或 browser storage。

Gateway 只允许 Showcase 与本地开发 Origin，限制 body、intent 长度和请求频率，只接受三个受审 capability profile。模型只能填写目标相关字段；AOI、资产、能力、约束、权限与 policy 由服务端可信模板覆盖。Authoring 响应固定为 `proposal_only`。用户明确点击确认后，独立 Execution endpoint 会重新验证完整 MissionIR 与 trusted profile；通过后只返回 `synthetic_sandbox_only` 授权并启动 checked adaptive trace，不允许真实设备或外部系统副作用。

## GitHub Pages 要求

- Vite base path：`/mission-studio-showcase/`，除非 custom domain 将其改为 `/`；
- 通过 GitHub Actions 构建和部署；
- 使用 repository variable `MISSION_STUDIO_GATEWAY_URL` 注入非敏感 Gateway 地址；
- 将 Cesium Workers、ThirdParty、Assets 和 Widgets 复制到预期的 static base path；
- 使用与 static hosting 兼容的 route；初期采用单一 application route 或 hash routing；
- remote basemap 或 asset service 失败时，提供实用的 offline/static fallback；
- 永远不要将 `dist` 提交到 `main`。

## 数据与 asset budget

第一个 coding PR 应为下列项目提出可度量的 budget：

- 首次 JavaScript/CSS load；
- Cesium static asset；
- 已提交 fixture 的大小；
- 普通笔记本上的 first meaningful paint 和 interactive readiness；
- playback 期间的帧稳定性；
- chart 最大更新频率；
- screenshot test 时长。

不要提交完整 HSI cube。应使用经过审查的小型 crop/derived profile，或带 attribution 和 graceful fallback 的外部 public asset。

## Visual regression 纪律

- 在 CI 使用的同一 Linux image 上生成 baseline；
- 固定 browser、font、viewport、fixture、clock 和 reduced-motion setting；
- 只遮罩真正非确定性的外部内容；
- 审查每一项发生改变的 baseline；
- 为 Story Mode、Operator Mode、event inspection、comparison 和 error state 分别保留代表性视图。

## 规划中的检查项

- format/lint/typecheck；
- 针对 event ordering、seek、projection 和 comparison 的 unit test；
- JSON Schema fixture validation；
- accessibility check；
- Playwright interaction test；
- screenshot regression；
- Pages subpath build smoke test；
- secret/prohibited-reference scan。
