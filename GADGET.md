# Brush public boundary

`compileBuildDocument` / `compileBuildDocumentBytes` return the SDK BuildDocumentResponse (BUILD/V5, operations/v4). `compileRegionBuild` / `compileRegionBuildBytes` return CompileRegionBuildResponse (region-build/v2, region-operations/v2). `apply(ctx)` provides `hanaworldsBrushV3`, whose BrushV3 service exposes compile, compileBytes, compileRegion, compileRegionBytes, status and protocolHandshake. Root declarations re-export the published SDK request/response types.

Only voxel-grid/v1 is expanded. Unknown geometryProfile returns CAPABILITY_GAP / GEOMETRY_PROFILE_UNSUPPORTED with mutationState NONE. Strict SDK validation governs malformed input, digest bindings, world identity and witnesses. MaterialRef and orientation pass through opaque. Per-cell geometry retains inclusive set_box, last writer wins, exact bounds and numeric coordinate order. No world or model access.

Region blocks are canonically clipped along request.partition.edge with SDK regionChunksOfBox and encodeRegionBlock. All-unspecified chunks are omitted; only request.catalogue.emptyMaterialRef carves. Every emitted chunk includes the SDK region-block digest of its block. operationDigest binds the entire projection; validateCompiledRegionSet verifies exact equivalence before return.

Contracts are the exact published v2.2.1 tag. Package version is read from package.json and is provenance; SDK protocol compatibility governs consumption. Canvas owns transactions/history/Undo. Historical preview and tooling are archived under archive/brush-01 with source commit and hashes (D-18). Current tests include public fixture examples, Cordis mock provision, image, BUILD and multi-chunk/tamper cases.
