# HanaWorlds Brush

Pure deterministic `BUILD/V3` → `operations/v3` per-cell compiler and
`region-build/v1` `CompileRegionBuild` → mapblock-aligned `region-operations/v1`
compiler, packaged as a Cordis plugin providing `hanaworldsBrushV3`. No world
connection, writes, persistence or model access. Candidate **0.5.1**, contracts
**v0.5.4** (installed from the released tag commit); SOURCE/FIXTURE component only. App, model, world and Undo product gates remain unproven.

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

Contracts pin: `src/contracts.mjs` is the only place that names the contracts
package (`ADMITTED_CONTRACTS`) and the only way tests, preview and
`verify:contracts` locate it; `package.json` `imports` map `#contracts` to the installed
`hanaworlds-contracts` dependency (no vendored copy). `verify:contracts` checks the package
Brush actually resolves against that identity (name, version, repack SHA-256, files), so a
different build with the same version string fails. Re-pinning to another released
package is one step: `node tools/switch-contracts.mjs --tar <released tgz>
--spec <npm spec> --revision <commit>` then `npm install`.

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
