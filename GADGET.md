# Brush 0.3.0 current public boundary

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

The bundled contracts are the unmodified 20-file npm artifact 0.4.0 from source
`8cfb18f8e13aa33d7a942f230ec6117914322cdd`, SHA256
`d7b22e76de5e161abe7525596df608b3f00445fb4237808941cb5ef8328e9bc4`.
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
