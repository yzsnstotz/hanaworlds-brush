# HanaWorlds Brush

Pure deterministic `BUILD/V3` → `operations/v3` compiler, packaged as a Cordis
plugin providing `hanaworldsBrushV3`. No world connection, writes, persistence or
model access. Candidate **0.3.0**, contracts **0.4.0**; SOURCE/FIXTURE component
only. App, model, world and Undo product gates remain unproven.

```sh
npm ci --ignore-scripts
npm run build
npm test
npm run typecheck
npm run verify:contracts
bash tools/gate-local-build.sh <exact-source-commit> /absolute/evidence-dir
```

The gate uses Node 24.13.1/npm 11.8.0, an isolated npm cache, a precise git archive,
actual pack and an independent installed-package consumer. It removes temporary
build/install environments and retains one current tar and full logs.

See [GADGET.md](GADGET.md) for the public API and invariants and [NOTICE](NOTICE)
for licenses. Regenerate bundled contracts only from the admitted 0.4.0 tar:
`node tools/vendor-contracts.mjs /absolute/hanaworlds-contracts-0.4.0.tgz`.

Reuse: original Brush `dfbf8e0`, indexed by HanaWorlds
`bluemap/DEFERRED.md` → “后延 S1-02 图片建筑：丰富skill，基础Painter保留” and
`bluemap/cards/S1-SLICE-01/REPORT.md` / original SLICE manifest. The exact slab
expander is retained; historical algorithm/compatibility tests are preserved in
`test/legacy/` and Git. They need their original contracts and are not current
compatibility support. Current scope has no old profile/wire migration path.
