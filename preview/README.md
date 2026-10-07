# Brush 编译预览（开发面板）

本包属于 hanaworlds-brush，同仓独立安装，不替换安装器锁住的 Brush 编译包。

- 输入：小房子、区域填充、挖坑、非法材质四个 fixture 样例，宽/高/深和 fixture 石头/泥土。
- Host 调用已交付 Brush 0.5.0 `compileRegionBuild`。编译语义、contracts、世界和事务都不改。
- 输出：可切 Y 层的俯视方块、材质计数、地图块计数与子结果标识、完整结果标识。
- 材料目录、世界和会话来自 Brush 内置的公开 contracts 0.5.0 region fixture。面板上明示 FIXTURE；无世界写入。
- 通过 DSH 公开 `@Remote` source-mode 开发端点和 `ctx.connection.rpc.call` 调用 Host；Gateway 校验 JSON，Brush 校验输入。
- 同一输入再编译，显示与前次标识是否相同。编辑输入即清掉旧预览，进行中的旧输入结果不会覆盖新输入。

## 本机 App 安装

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
- React：18.3.1 · MIT · 已装 App baseline module · Client 界面（不捆绑）。
