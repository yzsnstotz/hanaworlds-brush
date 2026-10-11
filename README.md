# HanaWorlds Brush

Pure deterministic BUILD/V5 → operations/v4 and region-build/v2 → region-operations/v2 compiler, providing `hanaworldsBrushV3`. No world connection, mutation, persistence or model access. Package identity is read from package.json.

Contracts: `git+https://github.com/yzsnstotz/hanaworlds-contracts.git#v2.2.1`. The lock records the released commit. `npm run verify:contracts` checks the exact release, package inventory and bytes; protocol compatibility uses SDK protocol major/minor and capabilities.

With Node >=24.13.1 <25:

```sh
npm ci
npm run verify:contracts && npm test
npm run build && npm run typecheck
```

`npm test` includes local BUILD, image consumption, region and pinned shape-oracle tests. Materials and orientations remain opaque. Only voxel-grid/v1 is supported; other geometry profiles return CAPABILITY_GAP. Partition edge and emptyMaterialRef come from the request. Each chunk carries `digestValue('region-block', chunk.block).sha256`; the SDK validates the compiled result.

The compile and region implementations reuse main e6dbace25f02cee338a643f9607c5cec0ff2e513; final box expansion now uses the D-14 port below. D-18 preview and historical tests/tooling are preserved with source references and byte hashes in [archive/brush-01](archive/brush-01/README.md), outside the distributed package and current tests.

D-14 geometry is ported from Minetest-WorldEdit revision `62ffafe3` into [src/shapes](src/shapes/README.md). The BUILD compiler uses its inclusive cuboid traversal; sphere, dome, cylinder/cone, pyramid and spiral remain internal primitives within the current published contract. The vendored source is AGPL-3.0-only, with original source hashes and license text included.

See [GADGET.md](GADGET.md) and [NOTICE](NOTICE). SOURCE/FIXTURE/PACK evidence does not establish product/world/UI acceptance.
