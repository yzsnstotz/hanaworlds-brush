# HanaWorlds Brush

Pure deterministic BUILD/V5 → operations/v4 and region-build/v2 → region-operations/v2 compiler, providing `hanaworldsBrushV3`. No world connection, mutation, persistence or model access. Package identity is read from package.json.

Development-only contracts: `git+https://github.com/yzsnstotz/hanaworlds-contracts.git#v2.2.1`. The lock records the released commit. `npm run verify:contracts` checks the exact release and the pinned SHA-256 of the sorted release file-path/byte-hash inventory, then compares normal pack contents against the installed SDK. The tgz SHA-256 is recorded as evidence; gzip encoding differences between npm/Node versions do not change release identity. Protocol compatibility uses SDK protocol major/minor and capabilities.

Repository checks use the shared user npm cache `${HOME}/.npm`, set in the local `.npmrc`. This keeps the standard commands independent of a volume-specific user cache setting; no environment prefix is required.

With Node >=24.13.1 <25:

```sh
npm ci
npm run verify:contracts && npm test
npm run build && npm run typecheck
```

`npm run build` and normal `npm pack` generate `dist/` reproducibly with esbuild from the exact development SDK, then execute `test:package-boundary` on a real normal tgz. The inner pack in that gate runs all build/prepack scripts and audits staging to terminate recursion; no install script is skipped. Generated validators/schema are local artifacts, with input/output SHA-256 and tag/SHA in `build-provenance.json`; the SDK package, fixtures and development resolvers are not distributed. canonicalize remains an ordinary registry runtime dependency.

`npm run test:package-boundary` installs the real tgz in a fresh consumer with pnpm 11.28.5 defaults, loads every runtime export and exercises BUILD/region compilation, raw bytes, service protocol and public errors. Fault-injected tgz files prove that transitive git, missing bundle and unbundled value loads fail. The gate also rejects undeclared/local-resource escapes and checks every shipped runtime module and its reachable imports.

TypeScript consumers install the exact admitted `hanaworlds-contracts` tag as their own direct **devDependency** to resolve `import type` declarations. Production JavaScript needs no contracts package; value imports of that package are unsupported. The type-consumer test has its own separate install and cannot satisfy production resolution.

`npm test` includes local BUILD, image consumption, region, pinned shape-oracle tests and normal `npm pack` consumption from an isolated install. The packed consumer repeats all four compiler/geometry suites and checks public types against the installed package in the separate development type consumer. Materials and orientations remain opaque. Only voxel-grid/v1 is supported; other geometry profiles return CAPABILITY_GAP. Partition edge and emptyMaterialRef come from the request. Each chunk carries `digestValue('region-block', chunk.block).sha256`; the SDK validates the compiled result.

The compile and region implementations reuse main e6dbace25f02cee338a643f9607c5cec0ff2e513; final box expansion now uses the D-14 port below. D-18 preview and historical tests/tooling have been moved outside this repository by card `brush-migration-cleanup-01` (Q-71 B1). Recovery copies, per-file SHA-256, modes and restore paths are recorded in that card's external `ARCHIVE-MANIFEST.json`; the original archive is also recoverable from Git commit `ca57180e0d25c2321510f353bd7fc1b505c82801`. Current exports, build and compiler tests do not consume the old panels.

D-14 geometry is ported from Minetest-WorldEdit revision `62ffafe3` into [src/shapes](src/shapes/README.md). The BUILD compiler uses its inclusive cuboid traversal; sphere, dome, cylinder/cone, pyramid and spiral remain internal primitives within the current published contract. The vendored source is AGPL-3.0-only, with original source hashes and license text included.

See [GADGET.md](GADGET.md) and [NOTICE](NOTICE). SOURCE/FIXTURE/PACK evidence does not establish product/world/UI acceptance.
