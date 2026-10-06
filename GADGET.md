# Brush 0.4.0 current public boundary

Evidence: SOURCE/FIXTURE. This package has no external runtime of its own.
Actual pack installation and execution do not prove App/world/model/Undo or
owner acceptance.

Exports: `compileBuildDocument(request)`, `compileBuildDocumentBytes(Uint8Array)`,
`expandEffects(operations, materials)`, `BrushV3`, `contractHandshake`, version,
serviceName, hostCapabilities, invariants and the default Cordis plugin. Types are
provided at the root export. `apply(ctx)` provides exactly `hanaworldsBrushV3`,
with no injected services. The service exposes compile/compileBytes/handshake/status.
Low-level expandEffects requires already validated geometry/materials; public
compile is the admitted boundary.

The bundled contracts are the unmodified 21-file npm artifact 0.4.2 from source
`aad7c0ea2a4a9a93dfb13555c46cd98b9b5da777`, SHA256
`c3528a4fc3f0cdf94245c4d2d8b1cfa5d28db96d1cd00ae74737bdbdfcd26ec6`.
The imports map uses its root API. `verify:contracts` checks repack hash, inventory
and file bytes. Only runtime dependency is canonicalize 5.1.0. There are no peer
plugin imports, old wire adapters, authority/grant fields or world ports.

Compile order reuses dfbf8e0: strict UTF-8/duplicate keys/pure JSON; complete current
BUILD schema; payload/catalogue/frame/world association; exact integer geometry;
static materials; attributed engine capacity; exact ordered effects; known target
cells; recomputed coverage/body/hazard witnesses; current domain-separated digest.
BUILD/V3 requires the supplied localContext world to match request and observed
facts. Brush cannot observe whether a connection/selection remains live; the
owning runtime checks actual current facts before any write. PLANNED facts refer
to a preceding build, never the current build.

Geometry is unchanged: inclusive set_box, last writer wins, one effect per cell,
numeric x/y/z order, exact union bounds, no rounding/cropping/compression. Unknown
or unsampled cells are never air. Static materials must resolve catalogue nodes,
allowed param2 and definition revision, without callbacks/persistent state.
The sole capacity is the attributed ECMAScript array maximum (2^32−1); V8
string/array allocation failures return LIMIT_EXCEEDED. No policy volume cap.

Compile returns current BuildDocumentResponse with exactly result/error. Result
contains operations/v3 projection, current digest, readBounds and writeBounds.
Typed rejection has zero output and mutationState NONE. Raw decoding failures or
no recoverable requestId throw ContractError. Other exceptions propagate as defects.
Current response schema governs error shape; there is no legacy failureCodes list.
Repeated payloads yield identical responses without mutation or a replay store.
The compilerRevision is the caller's bound revision; package identity is status.version.
Canvas owns transaction admission, durable replay, readback/rollback/history/Undo;
Brush makes no transaction or permission decision.

Fresh installation uses one current peer/contracts set and exact handshake.
No compatibility or profile migration. The original implementation and complex
matrices remain in Git/test/legacy, indexed through DEFERRED; this card only runs
normal compilation and core invariants. No release or deployment is claimed.

Image pin delta: MaterialSources adds no Brush input or operation fields. The
compiler and expander behavior remain from bc1626a; only exact bundled contract
identity/handshake and current public declarations change. Use test:image and
gate-image-contracts.sh for the affected install/type/compile smoke; the original
nine core checks and complex legacy matrix are retained without rerunning here.

## Region voxel block compile (0.4.0, FIXTURE envelope)

`compileRegion(request)` / `BrushV3.compileRegion` compile a `REGION/V1` request
(region `region-voxel/v1`: origin, size, axisOrder `x,y,z` = x fastest as Luanti
VoxelArea, palette of catalogue `NodeSpec`, cells dense or `{encoding:'rle',runs}`)
into `region-chunks/v1`: Luanti-mapblock-aligned 16³ chunks sorted by numeric
x/y/z chunk position, each with its used palette (ascending global order), RLE
cells in mapblock order, specified/air counts and a deterministic chunk digest,
plus a compiled digest over the ordered chunk digests.

- Dig is only an explicit `air` palette entry. Cell `-1` (`UNSPECIFIED`) leaves
  the target untouched: it is never air and never emitted. An all-unspecified
  region is rejected (zero output).
- Every node must be a static catalogue node with allowed param2; duplicates,
  wrong axis order, unsafe bounds, wrong world binding, unknown fields, accessors
  or proxies are rejected with zero output.
- Compatibility: same protocol major (`hanaworlds-region` 1) plus each required
  capability (`regionCapabilities`); minor/patch/hash never decide; for major 0
  the minor is breaking.
- Brush does not decide load state, lighting, transactions, snapshots or Undo:
  Adapter transports and Canvas owns the cross-chunk transaction.
- How to use: the skill chooses region writes for large/terrain edits and the
  per-cell BUILD path for fine edits; typical size e.g. 256×32×256 cells (2.1M)
  compiles to 512 chunks in well under a second on a dev machine. Precondition:
  catalogue and world context of the current connection.

FIXTURE boundary: the envelope names and the digest domain
`HanaWorlds|brush-region-fixture@v1|` are replaced by the contracts region v1
public shape/digests once delivered.
