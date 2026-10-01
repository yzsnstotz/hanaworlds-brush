# HanaWorlds Brush 0.1.0 candidate

Status: `CANDIDATE / SOURCE+FIXTURE` component evidence. Stage 1 product flows are
`UNPROVEN`; this is not a release, deployment or user `ACCEPTED` receipt.

Brush is the deterministic `BUILD/V2` compiler. It accepts one admitted
`BuildDocumentRequest` and returns a `BuildDocumentResponse` whose result is the
canonical `operations/v2` projection, its stable `operations` digest, the bound
read bounds and the exact write bounds — or a typed error with zero output.

Brush has **no state and no effects**: no world connection, world read or write,
persistence, model access, target selection, clock or randomness. Canvas
independently authorizes, applies and reads back compiled operations through the
Luanti Adapter. A Brush result never grants world permission.

## Public host boundary

- Package: `hanaworlds-brush@0.1.0`, ESM, Node `>=24.13.1 <25` (Unicode 17 host
  verified by the admitted contracts package).
- DSH (Cordis) plugin: default export `{ name: 'hanaworlds-brush', inject: [],
  provide: 'hanaworldsBrushV2', apply }`, bundled through `dsh.bundle.patch`
  (`cordis.patch.yml`). `apply(ctx)` provides exactly one service,
  `hanaworldsBrushV2`, and consumes none.
- Service `BrushV2`: `compile(requestValue)`, `compileBytes(utf8Bytes)`, `status()`.
- Library: `compileBuildDocument`, `compileBuildDocumentBytes`, `expandEffects`.
- Public ports only: `hanaworlds-contracts@0.2.1` `./BUILD/V2` and `./operations/v2`
  (plus its root runtime helpers). No dependency on Canvas, Workshop, painter or
  Adapter internals.

## Compile order

The frozen BuildDocument `validationOrder`:

1. strict decode — contracts raw UTF-8 / duplicate decoded key / pure-JSON decoder
   (`compileBytes`), or pure-JSON snapshot for values;
2. complete schema — contracts `BuildDocumentRequest` schema and domain (includes
   ordered non-empty `set_box`, safe integers, `min<=max`, `declaredBounds` equal to
   the exact union bounds, materialRef present);
3. catalogue/frame/target identities — every payload digest binding; target facts
   bound to the same catalogue and coordinate-frame digest; INSPECTED facts bound to
   the request world; PLANNED facts never describe the same build; the three fact
   cell sets reproduce the bound coverage digest;
4. geometry exact integers — BigInt exact union cell count;
5. materials static semantics — exact catalogue node, allowed `param2`, definition
   revision, no callbacks, no persistent state;
6. attributed engine/host caps — see below;
7. recompute safety witnesses — contracts `validateWitnessCoherence` against the exact
   final effects (coherence only, not authorization or provider authenticity);
8. ordered effects — last-writer-wins, one effect per cell, numeric x,y,z order.

Every written cell must be a *known* target fact (occupied or known empty);
unknown or unsampled cells are never treated as air (`TARGET_FACTS_INCOMPLETE`).

## Errors

Rejections are the contracts `ContractError` public shape
(`code, phase, retryability, mutationState, transactionRef, causeCode, reason`),
always `mutationState: NONE`, with no input values, paths or stacks. If the failure
cannot be expressed as a valid `BuildDocumentResponse` — no recoverable `requestId`
(raw decode failures), or a contracts code outside the BuildDocument
`failureCodes` allowlist (currently `CAPABILITY_UNAVAILABLE` from
`validateWitnessCoherence` when a safety profile does not require protection and
body clearance) — the typed `ContractError` is thrown instead. Nothing is remapped
and nothing is produced. Non-contract exceptions are defects and propagate.

## Policies, invariants and host capabilities

Brush has **no switchable policy**. `status().invariants` lists its correctness
invariants (not switchable, shown for the management interface) and
`status().hostCapabilities` lists the one attributed engine capacity:
`COMPILER_EFFECT_CELLS = 2^32-1` (ECMAScript array length maximum, attributed to the
running Node/V8 version). A build whose exact cell count exceeds it is rejected with
`LIMIT_EXCEEDED` before any allocation, never truncated. A V8 string/array
allocation failure during expansion or canonicalization is also reported as
`LIMIT_EXCEEDED`. Brush adds no HanaWorlds volume cap.

## Idempotency and authorization

Brush is a pure function: the same validated payload always yields byte-identical
output, so a repeated `requestId` with the same payload returns the identical
response. Brush does not persist a replay store (that would be state), so it cannot
itself detect `REPLAY_MISMATCH`, and `authorizationRef` is carried, not verified;
authorization, revocation and replay are enforced by the caller/Canvas owner before
any world write.

`compilerRevision` in the output is the request's bound value (as in the frozen
`PROD-operations` golden). Brush's own identity is `status().version`.

## Install, upgrade and rollback

Install from the public origin into a DSH profile, e.g.
`dsh plugin --profile <profile> add https://codeload.github.com/yzsnstotz/hanaworlds-brush/tar.gz/<revision>`.
Brush keeps no state, so uninstall leaves nothing to preserve and rollback is
reinstalling the previous revision; Canvas history and world state are untouched.
