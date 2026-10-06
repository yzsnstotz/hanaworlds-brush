// Pure BUILD/V3 -> operations/v3 compiler. No world connection, no mutation,
// no persistence, no model access, no clock, no randomness.
//
// Every public type, digest and coherence rule comes from the admitted
// hanaworlds-contracts@0.4.2 package (current lane, which admits target-facts/v4
// REGION_INSPECTED facts); this module only orders those checks
// through current public validators and performs the unchanged expansion.

import { types as nodeTypes } from 'node:util';
import {
  ContractError, validateBoundRequest, digestValue, validateFactsCoverage,
  validateStaticMaterials, validateWitnessCoherence, unionCellCount, comparePosition,
  validateResponse, admitRequest,
} from '#contracts';
import { expandEffects, unionBounds } from './expand.mjs';

const WIRE = 'BUILD/V3';
const OPERATION = 'BuildDocument';

/**
 * Attributed host capability: the largest array the ECMAScript engine can
 * hold. A build whose exact written-cell count exceeds it cannot be expanded
 * by this compiler on this host. It is an engine fact, not a HanaWorlds policy.
 */
export const hostCapabilities = Object.freeze([Object.freeze({
  limitKind: 'COMPILER_EFFECT_CELLS',
  limit: 2 ** 32 - 1,
  source: 'ECMAScript Array length maximum',
  sourceRevision: `node ${process.version} / v8 ${process.versions.v8}`,
})]);

const fail = (code, reason, phase = 'validate') => { throw new ContractError(code, phase, reason); };
const check = (condition, code, reason, phase) => { if (!condition) fail(code, reason, phase); };
const key = p => `${p[0]},${p[1]},${p[2]}`;

/**
 * Internal (not a package export): bind target facts to the request by source.
 * INSPECTED and REGION_INSPECTED (target-facts/v4, a first building's inspected
 * region) are both observed world facts bound to the request world. Only
 * PLANNED facts describe a preceding plan; REGION_INSPECTED is never PLANNED.
 * contracts@0.4.2 validateBoundRequest enforces the same world binding first;
 * this is Brush's own binding and is unit-tested directly.
 */
export function bindFactsSource(facts, request) {
  switch (facts.source) {
    case 'INSPECTED':
    case 'REGION_INSPECTED':
      check(facts.worldRef === request.worldRef, 'TARGET_FACTS_STALE', 'REVISION_CHANGED');
      break;
    case 'PLANNED':
      // Cycle guard: unreachable with bound digests (request.buildDigest covers
      // targetFactsDigest, which covers facts.buildDigest); kept as defence in depth.
      check(facts.buildDigest !== request.buildDigest, 'NON_CANONICAL_AMBIGUITY', 'PAYLOAD_CHANGED');
      break;
    default:
      // Mirrors the contracts FactsSource decode rejection (hence phase decode);
      // unreachable after validateBoundRequest. Never defaults to PLANNED.
      fail('SCHEMA_INVALID', 'INVALID_SHAPE', 'decode');
  }
}

function stage(request) {
  const { build, catalogue, targetFacts: facts } = request;

  // catalogue/frame/target identities (digest bindings already verified by validateBoundRequest)
  check(facts.catalogueDigest === request.catalogueDigest, 'CATALOGUE_MISMATCH', 'CATALOGUE_UNRESOLVED');
  const frameDigest = digestValue('frame', build.coordinateFrame).sha256;
  check(facts.frameDigest === frameDigest, 'NON_CANONICAL_AMBIGUITY', 'PAYLOAD_CHANGED');
  bindFactsSource(facts, request);
  const sampledPositions = [...facts.occupiedCells.map(c => c.position), ...facts.knownEmptyCells,
    ...facts.unknownCells.map(c => c.position)].sort(comparePosition);
  validateFactsCoverage(facts, { profileVersion: 'coverage/v2', sampledBounds: facts.sampledBounds, sampledPositions });

  // geometry exact integers: the contracts BuildProjection domain already enforced
  // safe integers, min<=max, non-empty ordered set_box and declaredBounds equal
  // to the exact union bounds, and that every materialRef is a materials key.
  const writeBounds = unionBounds(build.operations);

  // materials static semantics
  validateStaticMaterials(build.materials, catalogue);

  // attributed engine/host caps: exact BigInt count before any allocation
  const cellCount = unionCellCount(build.operations);
  for (const cap of hostCapabilities) check(cellCount <= BigInt(cap.limit), 'LIMIT_EXCEEDED', 'LIMIT_EXCEEDED');

  // ordered effects
  const effects = expandEffects(build.operations, build.materials);
  if (BigInt(effects.length) !== cellCount) throw new Error('brush: expansion count invariant violated');

  // every written cell must be a known (occupied or empty) target fact; unknown or unsampled is never air
  const known = new Set([...facts.occupiedCells.map(c => key(c.position)), ...facts.knownEmptyCells.map(key)]);
  for (const effect of effects) check(known.has(key(effect.position)), 'TARGET_FACTS_INCOMPLETE', 'REQUIRED_FACT_UNKNOWN');

  // recompute safety witnesses against the exact final effects
  const finalEffects = { profileVersion: 'final-effects/v2', frameDigest, catalogueDigest: request.catalogueDigest, effects };
  validateWitnessCoherence({ build, finalEffects, targetFacts: facts, safetyProfile: request.safetyProfile, catalogue, witnesses: build.witnesses });

  const operations = digestValue('operations', {
    contractVersion: 'operations/v3',
    buildDigest: request.buildDigest,
    compilerRevision: request.compilerRevision,
    compilationConfigDigest: request.compilationConfigDigest,
    worldRef: request.worldRef,
    frameDigest,
    catalogueDigest: request.catalogueDigest,
    targetFactsDigest: request.targetFactsDigest,
    effects,
  });
  return { projection: operations.projection, operationDigest: operations.sha256, readBounds: facts.sampledBounds, writeBounds };
}

function requestIdOf(value) {
  // A rejected pure-JSON input must never invoke caller code while recovering an ID.
  if (value === null || typeof value !== 'object' || nodeTypes.isProxy(value) || Array.isArray(value)) return null;
  const descriptor = Object.getOwnPropertyDescriptor(value, 'requestId');
  const id = descriptor && Object.hasOwn(descriptor, 'value') ? descriptor.value : null;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

function isHostCapacityError(error) {
  return error instanceof RangeError && /^Invalid (string|array) length/.test(error.message);
}

function respond(requestId, result, error) {
  return validateResponse(WIRE, OPERATION, { contractVersion: WIRE, requestId, result, error });
}

/**
 * Compile one BuildDocumentRequest value.
 *
 * Returns a validated BuildDocumentResponse with exactly one of result/error.
 * A typed failure carries zero output. When the failure cannot be expressed in
 * a valid response (no recoverable requestId) the ContractError itself is thrown; nothing is
 * produced in either case. Non-contract exceptions are programming defects
 * and propagate unchanged.
 */
export function compileBuildDocument(value) {
  let request = null;
  try {
    request = validateBoundRequest(WIRE, OPERATION, value);
    return respond(request.requestId, stage(request), null);
  } catch (error) {
    let contractError = error;
    if (isHostCapacityError(error)) contractError = new ContractError('LIMIT_EXCEEDED', 'validate', 'LIMIT_EXCEEDED');
    if (!(contractError instanceof ContractError)) throw error;
    const requestId = request?.requestId ?? requestIdOf(value);
    if (requestId === null) throw contractError;
    return respond(requestId, null, contractError.publicError);
  }
}

/** Compile from raw UTF-8 request bytes using the contracts strict decoder. */
export function compileBuildDocumentBytes(bytes) {
  // Raw strict decode (UTF-8, duplicate decoded keys, pure JSON) precedes everything else.
  return compileBuildDocument(admitRequest(WIRE, OPERATION, bytes));
}
