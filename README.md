# HanaWorlds Brush

Pure deterministic BUILD/V5 → operations/v4 and region-build/v2 → region-operations/v2 compiler, providing `hanaworldsBrushV3`. No world connection, mutation, persistence or model access. Package identity is read from package.json.

The runtime validators, schema, metadata and public types are Brush-owned C-brush/v3 closures. `npm run verify:contracts` checks the complete local schema/type/metadata identity, source inventory and dependency lock. Protocol metadata preserves the existing public values; it grants no additional operations.

Use this card's writable npm cache when a machine's configured cache is unavailable; no global cache changes are required.

With Node >=24.13.1 <25:

```sh
npm ci
npm run verify:contracts && npm test
npm run build && npm run typecheck
```

`npm run build` and normal `npm pack` copy all of `src/` into `dist/`, including the local schema and metadata JSON. The build records source/output SHA-256 in `build-provenance.json` and audits the normal artifact allowlist locally. Prepack does not recursively pack or install. canonicalize remains an ordinary registry runtime dependency.

`npm run test:package-boundary` is the separate outer gate: it normally packs and installs the real tgz in a fresh consumer with pnpm 11.28.5 defaults, loads every runtime export and exercises BUILD/region compilation, raw bytes, service protocol and public errors. Fault-injected tgz files prove that transitive git, missing artifacts and retired supplier value loads fail. The gate rejects undeclared/local-resource escapes and checks every shipped runtime module and its reachable imports.

TypeScript consumers need only Brush. Root declarations import their complete local types, including the correlated response/error unions and the existing handshake metadata. The strict consumer uses the actual installed package without a contracts dependency.

`npm test` includes local BUILD, image consumption, region, pinned shape-oracle tests and normal `npm pack` consumption from an isolated install. The packed consumer repeats all four compiler/geometry suites and checks public types against the installed package in the independent type consumer. Materials and orientations remain opaque. Only voxel-grid/v1 is supported; other geometry profiles return CAPABILITY_GAP. Partition edge and emptyMaterialRef come from the request. Each chunk carries `digestValue('region-block', chunk.block).sha256`; the local compiled-set validator checks exact request/result correspondence.

The compile and region implementations reuse main e6dbace25f02cee338a643f9607c5cec0ff2e513; final box expansion now uses the D-14 port below. D-18 preview and historical tests/tooling have been moved outside this repository by card `brush-migration-cleanup-01` (Q-71 B1). Recovery copies, per-file SHA-256, modes and restore paths are recorded in that card's external `ARCHIVE-MANIFEST.json`; the original archive is also recoverable from Git commit `ca57180e0d25c2321510f353bd7fc1b505c82801`. Current exports, build and compiler tests do not consume the old panels.

D-14 geometry is ported from Minetest-WorldEdit revision `62ffafe3` into [src/shapes](src/shapes/README.md). The BUILD compiler uses its inclusive cuboid traversal; sphere, dome, cylinder/cone, pyramid and spiral remain internal primitives within the current published contract. The vendored source is AGPL-3.0-only, with original source hashes and license text included.

See [GADGET.md](GADGET.md) and [NOTICE](NOTICE). SOURCE/FIXTURE/PACK evidence does not establish product/world/UI acceptance.
