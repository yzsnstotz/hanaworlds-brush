# HanaWorlds Brush

Deterministic `BUILD/V2` → `operations/v2` compiler for HanaWorlds Stage 1, packaged as a
DSH plugin (`hanaworldsBrushV2` service). Pure: no world connection, mutation,
persistence or model access. See [GADGET.md](./GADGET.md) for the public boundary,
compile order, errors and lifecycle, and [NOTICE](./NOTICE) for third-party terms.

```sh
npm ci            # Node 24.13.1+ (<25)
npm run build     # syntax check
npm test          # conformance, determinism, typed rejection, purity, plugin
npm run verify:contracts   # bundled vendor/hanaworlds-contracts == admitted 0.3.0 artifact
```

Status: candidate `0.2.0` (brush-v4: contracts@0.3.0, target-facts/v3 REGION_INSPECTED,
ContractHandshake); component evidence only, product flows unproven.
