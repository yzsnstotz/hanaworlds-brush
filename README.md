# HanaWorlds Brush

Pure deterministic BUILD/V5 → operations/v4 and region-build/v2 → region-operations/v2 compiler, providing `hanaworldsBrushV3`. No world connection, mutation, persistence or model access. Package identity is read from package.json.

Contracts: `git+https://github.com/yzsnstotz/hanaworlds-contracts.git#v2.2.1`. The lock records the released commit. `npm run verify:contracts` checks the exact release, package inventory and bytes; protocol compatibility uses SDK protocol major/minor and capabilities.

With Node >=24.13.1 <25:

```sh
npm ci
npm run verify:contracts && npm test
npm run build && npm run typecheck
```

`npm test` includes local BUILD, image consumption and region tests. Materials and orientations remain opaque. Only voxel-grid/v1 is supported; other geometry profiles return CAPABILITY_GAP. Partition edge and emptyMaterialRef come from the request. Each chunk carries `digestValue('region-block', chunk.block).sha256`; the SDK validates the compiled result.

The compile/expand/region implementations reuse main e6dbace25f02cee338a643f9607c5cec0ff2e513. D-18 preview and historical tests/tooling are preserved with source references and byte hashes in [archive/brush-01](archive/brush-01/README.md), outside the distributed package and current tests.

See [GADGET.md](GADGET.md) and [NOTICE](NOTICE). SOURCE/FIXTURE/PACK evidence does not establish product/world/UI acceptance.
