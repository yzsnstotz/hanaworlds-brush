# hanaworlds-brush · 插件级验收

真实运行时：**无，纯函数**。Brush 不连接世界、不写入、不调模型；输入 BUILD/V5 或 region-build/v2，输出 operations/v4 或 region-operations/v2。合约为已发布的 hanaworlds-contracts v2.2.1。
证据类别：`SOURCE` / `FIXTURE`。

| ID | 验收条目 | 可见结果 | 怎么跑 | 证据上限 |
| --- | --- | --- | --- | --- |
| BR-01 | 一个方块的 BUILD/V5 编译出确定操作 | 单格 BUILD 的 operations/v4 与预期逐格效果相等，SDK 校验响应 | `npm test`（local-build / image-contracts） | FIXTURE |
| BR-02 | 非法 BUILD 报类型化错误且零输出 | 严格 schema、摘要绑定、世界绑定错误返回精确错误码及 mutationState NONE | `npm test`（local-build / region negative 用例） | FIXTURE |
| BR-03 | 同输入两次输出一致 | 值、原始字节与服务入口编译结果一致，输入不变，摘要由 SDK 重算一致 | `npm test`（determinism 用例） | FIXTURE |
| BR-04 | 不完整的安全见证被拒绝 | BODY_CLEARANCE 见证未覆盖最终效果格 → `SAFETY_INVARIANT_FAILED`，零输出 | `npm test`（local-build witness 用例） | FIXTURE |
| BR-05 | 依赖的 contracts 版本钉死且字节一致 | Brush 实际解析到的 contracts 与 src/contracts.mjs 钉的发布包身份（名称、版本、repack SHA-256、文件）一致；不一致时失败 | `npm run verify:contracts` | SOURCE |
| BR-06 | 分块边长和空材质来自世界源请求 | 非立方 partition.edge、负坐标与自定义 emptyMaterialRef 经值、字节及服务入口得到同一逐格结果；每块摘要可重算，UNSPECIFIED 保持不写入 | `npm test`（region） | FIXTURE |
| BR-07 | 世界源字段没有隐式默认 | 缺 partition / emptyMaterialRef、非法 edge 返回 SCHEMA_INVALID、零输出；不支持的 geometryProfile 返回 CAPABILITY_GAP | `npm test`（region） | FIXTURE |
| BR-08 | 中立能力名及公开类型 | 只声明 compile-partition-chunks；旧 compile-mapblock-chunks 能力请求被拒绝；公开请求类型要求 partition 并暴露 emptyMaterialRef | `npm test`、`npm run typecheck` | SOURCE / FIXTURE |

本表只记录模块 SOURCE / FIXTURE 证据，不代表整合、真实世界或 UI 验收。
