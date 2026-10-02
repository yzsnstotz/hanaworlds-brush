# HanaWorlds Brush 0.2.0 candidate (brush-v4)

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

- Package: `hanaworlds-brush@0.2.0`, ESM, Node `>=24.13.1 <25` (Unicode 17 host
  verified by the admitted contracts package).
- DSH (Cordis) plugin: default export `{ name: 'hanaworlds-brush', inject: [],
  provide: 'hanaworldsBrushV2', apply }`, bundled through `dsh.bundle.patch`
  (`cordis.patch.yml`). `apply(ctx)` provides exactly one service,
  `hanaworldsBrushV2`, and consumes none.
- Service `BrushV2`: `compile(requestValue)`, `compileBytes(utf8Bytes)`, `handshake()`, `status()`.
- Library: `compileBuildDocument`, `compileBuildDocumentBytes`, `expandEffects`, `contractHandshake`.
- Public ports only: `hanaworlds-contracts@0.3.0` v4 lane — `./v4/BUILD/V2`,
  `./v4/operations/v2` and the `./v4` runtime helpers (including `validateBoundRequest`,
  which runs the v4 BUILD/V2 frame and world bound checks). No dependency on Canvas, Workshop, painter or
  Adapter internals.
- Contracts are **bundled**: `vendor/hanaworlds-contracts/` is exactly the
  `package/` contents of the independently admitted artifact
  (`e827357`, SHA-256 `47a2e5cc…`, 923 entries), reached only through the package
  `imports` map (`#contracts` → `dist/v4/index.mjs`, `#contracts/BUILD/V2`,
  `#contracts/operations/v2` → the v4-lane bindings).
  The only installed dependency is `canonicalize@5.1.0` from the npm registry.
  `npm run verify:contracts` repacks the bundled copy (or any installed copy given
  as an argument) and fails unless the digest, entry count and bytes match;
  `npm run vendor:contracts` is the maintainer path to recreate it from the pinned
  public source.

## Target facts and the ContractHandshake (0.2.0)

Brush 0.2.0 accepts the contracts@0.3.0 `target-facts/v3` value set: `REGION_INSPECTED`
facts are the Adapter's inspection of a free region for a first new building, relayed
by Canvas and copied by the picture-blocks painter. They carry `worldRef` and
`worldRevision` and no object, build or plan reference. Brush binds them to the request
world exactly as it binds `INSPECTED` facts (another world → `TARGET_FACTS_STALE`); they
are never treated as `PLANNED`. The `TargetFacts` fields and every digest projection
(BUILD, operations, frame, target-facts and the other fifteen kinds) are unchanged, so
all nineteen production goldens and every 0.1.0 compile result for non-region input are
byte-identical. The BUILD frame must be the Adapter-produced frame the facts name
(`D(frame) = targetFacts.frameDigest`); Brush never accepts or invents one.

Before any request a consumer checks Brush's advertised `ContractHandshake`
(`status().contractHandshake`, `handshake()`, export `contractHandshake`) with contracts
`checkContractHandshake`. Brush advertises exactly the contracts@0.3.0 set: the seven
wires, `operations/v2` and fact profiles `target-facts/v2` + `target-facts/v3`. Brush
0.1.0 (contracts@0.2.1) advertises no ContractHandshake; a 0.3.0 consumer must treat its
absence as `UNSUPPORTED_VERSION` and send nothing. The contracts fixture
`HS-MIXED-BRUSH-FACTS-V2` models a contracts@0.2.1 advertisement (`target-facts/v2`
only), which fails a consumer that requires `target-facts/v3` with
`UNSUPPORTED_VERSION/decode`.

Rejections follow the admitted contracts@0.3.0 runtime, which Brush does not remap: a
digest-binding `NON_CANONICAL_AMBIGUITY/validate/PAYLOAD_CHANGED` now reports retryability
`NEVER` (0.1.0 reported `AFTER_NEW_FACTS`), and when the target-facts catalogue binding
fails together with the frame or world binding, the frame/world error is reported first.
Code, phase and reason of every single-fault rejection are unchanged.

## Compile order

The frozen BuildDocument `validationOrder`:

1. strict decode — contracts raw UTF-8 / duplicate decoded key / pure-JSON decoder
   (`compileBytes`), or pure-JSON snapshot for values;
2. complete schema — contracts `BuildDocumentRequest` schema and domain (includes
   ordered non-empty `set_box`, safe integers, `min<=max`, `declaredBounds` equal to
   the exact union bounds, materialRef present);
3. catalogue/frame/target identities — every payload digest binding; target facts
   bound to the same catalogue and coordinate-frame digest; INSPECTED and
   REGION_INSPECTED facts bound to the request world (REGION_INSPECTED is never
   treated as PLANNED); PLANNED facts never describe the same build; the three fact
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

Brush 0.2.0 moves with the contracts@0.3.0 consumer set (Workshop, building painters,
Luanti Adapter v4, Canvas v4). Rollback restores the whole 0.2.1 set together; for Brush
that is the admitted 0.1.0 (`49b74b5`, artifact SHA-256 `c4ad84c8…`). A mixed
0.2.1/0.3.0 composition is not supported.


Install from the public origin into a DSH profile, e.g.
`dsh plugin --profile <profile> add https://codeload.github.com/yzsnstotz/hanaworlds-brush/tar.gz/<revision>`.
Brush keeps no state, so uninstall leaves nothing to preserve and rollback is
reinstalling the previous revision; Canvas history and world state are untouched.

Because contracts are bundled, Brush has no URL, git or `file:` subdependency, so a
stock DSH profile (pnpm 11 default `blockExoticSubdeps`) installs it unchanged.
Revisions before the bundling change (`c7c9793`, `35da511`) used a URL-pinned
contracts dependency and fail on a stock profile with `ERR_PNPM_EXOTIC_SUBDEP`;
they are therefore not valid rollback targets on a stock host. The earliest
stock-installable revision is the bundling commit `7a34ac1`.

Lifecycle on a stock profile:

- install / upgrade / rollback: `dsh plugin --profile <p> add <codeload URL of the revision>`
  replaces the installed revision in place; the profile `dsh.profile.bundles`
  entry `hanaworlds-brush` stays;
- uninstall: `dsh plugin --profile <p> remove hanaworlds-brush` removes the package,
  `canonicalize` and the bundles entry; Brush leaves no state of its own;
- check an installed copy: `node tools/verify-contracts-artifact.mjs
  <profile>/node_modules/hanaworlds-brush/vendor/hanaworlds-contracts`.
