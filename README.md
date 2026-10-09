# HanaWorlds Brush

Pure deterministic `BUILD/V4` → `operations/v3` per-cell compiler and
`region-build/v1` `CompileRegionBuild` → mapblock-aligned `region-operations/v1`
compiler, packaged as a Cordis plugin providing `hanaworldsBrushV3`. No world
connection, writes, persistence or model access. Source **0.6.0**, contracts
**`#semver:^2.0.0-rc.1`** (contracts source git released tags, same-major handshake/schema); SOURCE/FIXTURE component only. App, model, world and Undo product gates remain unproven.

```sh
npm ci --ignore-scripts
npm run build
npm run test:image  # affected 0.4.2 consumption only
npm run test:region # region compile + per-cell regression
npm run typecheck
npm run verify:contracts
bash tools/gate-image-contracts.sh <exact-source-commit> /absolute/evidence-dir
```

The gate uses Node 24.13.1/npm 11.8.0, an isolated npm cache, a precise git archive,
actual pack and an independent installed-package consumer. It removes temporary
build/install environments and retains one current tar and full logs.

See [GADGET.md](GADGET.md) for the public API and invariants and [NOTICE](NOTICE)
for licenses.

Contracts range: `src/contracts.mjs` is the only place that names the contracts
dependency (`ADMITTED_CONTRACTS`, a caret range) and the only way tests, preview and
`verify:contracts` locate it; `package.json` `imports` map `#contracts` to the installed
`hanaworlds-contracts` dependency `git+https://github.com/yzsnstotz/hanaworlds-contracts.git#semver:^2.0.0-rc.1`
(no vendored copy, no commit or byte pin; the lock records what npm resolved). `verify:contracts`
checks that the package Brush actually resolves has the right name, a version inside that range
(npm caret semantics: 1.x; no prereleases) and exactly its own packed files, and reports its version and
repack SHA-256 as provenance. Handshake and schema compatibility are the contracts SDK's
same-major predicate; Brush adds no exact version check. Raising the floor for a new field is
the range in `src/contracts.mjs` and `package.json`, then `npm install`.

Reuse: original Brush `dfbf8e0`, indexed by HanaWorlds
`bluemap/DEFERRED.md` → “后延 S1-02 图片建筑：丰富skill，基础Painter保留” and
`bluemap/cards/S1-SLICE-01/REPORT.md` / original SLICE manifest. The exact slab
expander is retained; historical algorithm/compatibility tests are preserved in
`test/legacy/` and Git. They need their original contracts and are not current
compatibility support. Current scope has no old profile/wire migration path.

The image branch consumes the final contracts 0.4.2 directly. MaterialSources is
read-only source evidence used upstream; Brush gains no source reader, palette
algorithm, model, or world port. The prior 0.3.0 / contracts 0.4.0 source/tar/E
remain the protected text baseline. No older handshake is accepted by this line.
