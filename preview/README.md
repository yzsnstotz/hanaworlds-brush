# Brush 编译预览（开发面板）

本包属于 hanaworlds-brush。当前开发入口是同仓独立网页，原 App 面板代码保留，App 内接入归整合卡。

## 本机独立网页

在本仓使用 Node 24（>=24.13.1、<25）执行：

```sh
npm ci --omit=dev --ignore-scripts
ln -s .. node_modules/hanaworlds-brush
npm --prefix preview/web ci --ignore-scripts
npm --prefix preview/web start
```

打开 http://127.0.0.1:47602/。服务仅监听本机回环地址；端口占用直接报错，不换端口。
现有 `client.cjs` React 面板原样复用，编译请求经同源 HTTP 到 Node Host，直接调用原 `compilePreview` 与 Brush 0.5.0。
React 资源在本机服务，无 CDN、模型或世界写入；不依赖 HanaWorlds.app、App 安装或 GUI 锁。
样例与输出不等于真实世界；服务会保持运行供试用，Ctrl+C 可正常退出。

- 输入：小房子、区域填充、挖坑、非法材质四个 fixture 样例，宽/高/深和 fixture 石头/泥土。
- Host 调用已交付 Brush 0.5.0 `compileRegionBuild`。编译语义、contracts、世界和事务都不改。
- 输出：可切 Y 层的俯视方块、材质计数、地图块计数与子结果标识、完整结果标识。
- 材料目录、世界和会话来自 Brush 内置的公开 contracts 0.5.0 region fixture。面板上明示 FIXTURE；无世界写入。
- 独立网页通过同源 `/api/compile` 调用 Node Host；原 App 接入通过 DSH 公开 `@Remote` 和 `ctx.connection.rpc.call` 调用 Host。两者复用同一编译准备/汇总代码，由 Brush 校验编译输入。
- 同一输入再编译，显示与前次标识是否相同。编辑输入即清掉旧预览，进行中的旧输入结果不会覆盖新输入。

## 原 App 接入（历史，归整合卡）

先确认 Desktop 已安装 `/Applications/HanaWorlds.app`，且 PM 已释放本机 GUI 锁并允许本面板安装。
在 App「插件」页 → Add plugin，输入本包 tarball 的绝对路径，确认信任 → Install → Enable now。
侧栏出现「Brush 编译预览」。打开面板，选择小房子，点「编译」。

本包需要 Host 已装的 `hanaworlds-brush@0.5.0`（optional peer 只避免安装器到 registry 自动下载项目包；运行时严格检查版本），以及 App 提供的 `@deepseek-ai/dsh-typert-protocol@0.2.0-rc.2` 和 Cordis 4.0.4。
不捆绑、不复制 Brush 或 contracts。依赖缺失会使插件加载失败，不做兜底。

## 组件检查

在本仓独立开发工作树中安装根依赖，再让 `node_modules/hanaworlds-brush` 指向本仓；Host 检查使用 App 中的公开 DSH 包。

```sh
node --test preview/test/compile.test.mjs
npm --prefix preview run check
npm --prefix preview pack --ignore-scripts --pack-destination /ABSOLUTE/EVIDENCE/DIR
```

组件测试不代表 App 首步、用户验收或 GATE_PASS；真实运行结果另见本卡 REPORT。

## 许可

- 本面板：0.1.0 · MIT · 本仓 · fixture 开发面板。
- hanaworlds-brush：0.5.0 · MIT · 本仓已交付包 · Host 编译（peer）。
- hanaworlds-contracts：0.5.0 · MIT · Brush 内置公开包 · fixture 与区域编码/校验（不新增副本）。
- DSH typert-protocol：0.2.0-rc.2 · MIT · official deepseek-ai/deepseek-harness / 已装 App · Host Remote（peer）。
- Cordis：4.0.4 · MIT · official deepseek-ai/cordis / 已装 App · service（peer）。
- React / ReactDOM：18.3.1 · MIT · npm 官方 react / react-dom 包 · 独立网页本机资源（锁文件固定版本）；原 App 接入仍用其 baseline module。
