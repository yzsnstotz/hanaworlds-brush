# hanaworlds-brush · 插件级验收

真实运行时：**无，纯函数**。Brush 不连接世界、不写入；输入 BUILD/V2，输出 operations/v2。
证据上限：`FIXTURE`。

| ID | 验收条目 | 可见结果 | 怎么跑 | 证据上限 |
| --- | --- | --- | --- | --- |
| BR-01 | 一个方块的 BUILD/V2 编译出确定字节 | 单格 BUILD 编译结果与 golden 逐字节相等（含 `analysisDigest`） | `npm test`（golden 用例） | FIXTURE |
| BR-02 | 非法 BUILD 报类型化错误且零输出 | 缺字段、越界、消费者自造 Frame 等各返回其精确 oracle 错误（如 `NON_CANONICAL_AMBIGUITY`），响应里不回显输入 | `npm test`（negative 用例） | FIXTURE |
| BR-03 | 同输入两次输出一致 | 同一 BUILD 连续编译两次，输出字节相同；与 0.1.0 的 351 个成功编译结果一致 | `npm test`（determinism / compat 用例） | FIXTURE |
| BR-04 | 伪造的 Adapter 见证被拒绝 | 伪造 PROTECTION / BODY_CLEARANCE 见证或见证与效果格重叠 → `SAFETY_INVARIANT_FAILED`，零输出 | `npm test`（witness 用例） | FIXTURE |
| BR-05 | 依赖的 contracts 版本钉死且字节一致 | Brush 实际解析到的 contracts 与 src/contracts.mjs 钉的发布包身份（名称、版本、repack SHA-256、文件）一致；不一致时失败 | `npm run verify:contracts` | SOURCE |
