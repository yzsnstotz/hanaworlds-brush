// brush-v4 (0.2.0): contracts@0.3.0 target-facts/v3 REGION_INSPECTED binding and
// ContractHandshake advertisement, against the admitted contracts oracles.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalJSON, checkContractHandshake, ContractError, digestValue } from '#contracts';
import * as buildV2 from '#contracts/BUILD/V2';
import chain from '#contracts/fixtures/placement-region-chain-v4' with { type: 'json' };
import goldens from '#contracts/fixtures/production-goldens' with { type: 'json' };
import { compileBuildDocument, compileBuildDocumentBytes, contractHandshake, BrushV2 } from '../src/index.mjs';
import { bindFactsSource } from '../src/compile.mjs';
import { makeRequest, box } from './helpers.mjs';

const plain = value => JSON.parse(JSON.stringify(value));
const utf8 = value => Buffer.from(JSON.stringify(value), 'utf8');
const regionChain = chain.validCases.find(c => c.id === 'PLACE-LUANTI-INITIATOR-CHAIN').materializedChain;
const brushRequest = () => structuredClone(regionChain.brushRequest);
const compatibility = id => chain.compatibilityCases.find(c => c.id === id);
const invalid = id => chain.invalidCases.find(c => c.id === id);

function rejects(response, code, reason, phase = 'validate') {
  assert.equal(response.result, null, 'zero output on rejection');
  assert.deepEqual(
    { code: response.error.code, phase: response.error.phase, reason: response.error.reason, mutationState: response.error.mutationState },
    { code, phase, reason, mutationState: 'NONE' });
  buildV2.response('BuildDocument', response);
}

const region = (worldRef = 'fixture-world') => ({
  profileVersion: 'target-facts/v3', source: 'REGION_INSPECTED', worldRef, worldRevision: 'fixture-world-10',
  objectRef: null, objectRevision: null, buildDigest: null, planRevision: null,
});

// ---- TF-REGION-SOURCE / FRAME-ADAPTER-PRODUCED / REGION-PROTECTION-BODY-EVIDENCE --

test('PLACE-LUANTI-INITIATOR-CHAIN: the chained REGION_INSPECTED brushRequest compiles to exactly the chained brushResponse', () => {
  const request = brushRequest();
  assert.equal(request.targetFacts.source, 'REGION_INSPECTED');
  assert.equal(request.targetFacts.profileVersion, 'target-facts/v3');
  const expected = canonicalJSON(regionChain.brushResponse);
  assert.equal(canonicalJSON(compileBuildDocument(request)), expected);
  assert.equal(canonicalJSON(compileBuildDocumentBytes(utf8(request))), expected);
  assert.equal(canonicalJSON(new BrushV2().compile(request)), expected);
});

test('chained region compile: the operations bind the request world and the Adapter-produced frame digest D(frame)', () => {
  const request = brushRequest();
  const { result } = compileBuildDocument(request);
  assert.equal(result.projection.worldRef, request.worldRef);
  assert.equal(result.projection.worldRef, request.targetFacts.worldRef);
  assert.equal(result.projection.frameDigest, digestValue('frame', request.build.coordinateFrame).sha256);
  assert.equal(result.projection.frameDigest, request.targetFacts.frameDigest);
  assert.equal(result.projection.targetFactsDigest, request.targetFactsDigest);
});

test('REGION_INSPECTED facts for another world → TARGET_FACTS_STALE through the public entrypoint (contracts validateBoundRequest rejects first)', () => {
  const request = brushRequest();
  request.worldRef = 'fixture-other-world';
  rejects(compileBuildDocument(request), 'TARGET_FACTS_STALE', 'REVISION_CHANGED');
  rejects(compileBuildDocument(makeRequest({ operations: [box([0, 0, 0], [0, 0, 0])], facts: region('fixture-other-world') })),
    'TARGET_FACTS_STALE', 'REVISION_CHANGED');
});

test('REGION_INSPECTED and INSPECTED facts of the request world compile alike; same world for both sources', () => {
  const operations = [box([0, 0, 0], [1, 0, 1])];
  const inspected = compileBuildDocument(makeRequest({ operations }));
  const regioned = compileBuildDocument(makeRequest({ operations, facts: region() }));
  assert.equal(inspected.error, null);
  assert.equal(regioned.error, null);
  assert.deepEqual(plain(regioned.result.projection.effects), plain(inspected.result.projection.effects));
  assert.equal(regioned.result.projection.worldRef, 'fixture-world');
});

test('PLANNED facts are not world-bound: a foreign request world compiles through the public entrypoint', () => {
  const planned = { source: 'PLANNED', worldRef: null, objectRef: null, worldRevision: null, objectRevision: null, buildDigest: 'c'.repeat(64), planRevision: 'plan-1' };
  assert.equal(compileBuildDocument(makeRequest({ operations: [box([0, 0, 0], [0, 0, 0])], facts: planned, worldRef: 'any-world' })).error, null);
});

test('TF-REGION-SOURCE invalid shapes are rejected at decode before any compile step', () => {
  // Each variant replaces the chained REGION_INSPECTED facts; the shape check
  // precedes every digest binding, so no digest needs recomputing.
  const withFacts = patch => { const request = brushRequest(); request.targetFacts = { ...request.targetFacts, ...patch }; return request; };
  const variants = [
    { objectRef: 'obj-1' },                       // INV-REGION-SOURCE-WITH-OBJECTREF
    { objectRevision: 'obj-rev-1' },
    { buildDigest: 'c'.repeat(64) },              // a region is not a plan
    { planRevision: 'plan-1' },
    { worldRevision: null },                      // region facts need their world revision
    { worldRef: null },
    { profileVersion: 'target-facts/v2' },        // REGION_INSPECTED only on target-facts/v3
    { source: 'INSPECTED' },                      // INSPECTED only on target-facts/v2
    { source: 'PLANNED' },
  ];
  for (const patch of variants) rejects(compileBuildDocument(withFacts(patch)), 'SCHEMA_INVALID', 'INVALID_SHAPE', 'decode');
  // the contracts oracle's own materialized facts
  const oracle = invalid('INV-REGION-SOURCE-WITH-OBJECTREF');
  const request = brushRequest();
  request.targetFacts = oracle.materialized.message;
  rejects(compileBuildDocument(request), oracle.expected.error.code, oracle.expected.error.reason, oracle.expected.error.phase);
});

test('INV-INVENTED-FRAME: a consumer-invented coordinate frame is rejected with the exact oracle error and zero output', () => {
  const oracle = invalid('INV-INVENTED-FRAME');
  const response = compileBuildDocument(structuredClone(oracle.materialized.message));
  assert.equal(response.result, null);
  assert.deepEqual(plain(response.error), oracle.expected.error);
});

test('region witnesses are rechecked: forged Adapter body evidence overlapping an effect → SAFETY_INVARIANT_FAILED', () => {
  const operations = [box([0, 0, 0], [0, 0, 0])];
  const response = compileBuildDocument(makeRequest({ operations, facts: region(),
    witnesses: w => w.map(x => x.predicate === 'BODY_CLEARANCE' ? { ...x, facts: { ...x.facts, bodyOccupiedPositions: [[0, 0, 0]] } } : x) }));
  rejects(response, 'SAFETY_INVARIANT_FAILED', 'REQUIRED_FACT_UNKNOWN');
});

// ---- Brush's own source binding (internal helper, tested directly) ----------

test('bindFactsSource: REGION_INSPECTED and INSPECTED bind the request world; REGION_INSPECTED is never treated as PLANNED', () => {
  const stale = e => e instanceof ContractError && e.code === 'TARGET_FACTS_STALE' && e.reason === 'REVISION_CHANGED' && e.phase === 'validate';
  const request = { worldRef: 'fixture-world', buildDigest: 'b'.repeat(64) };
  for (const source of ['REGION_INSPECTED', 'INSPECTED']) {
    assert.doesNotThrow(() => bindFactsSource({ source, worldRef: 'fixture-world', buildDigest: null }, request));
    assert.throws(() => bindFactsSource({ source, worldRef: 'fixture-other-world', buildDigest: null }, request), stale, source);
  }
});

test('bindFactsSource: PLANNED is not world-bound but may not describe the same build; an unknown source is SCHEMA_INVALID, never PLANNED', () => {
  const request = { worldRef: 'fixture-world', buildDigest: 'b'.repeat(64) };
  assert.doesNotThrow(() => bindFactsSource({ source: 'PLANNED', worldRef: null, buildDigest: 'c'.repeat(64) }, request));
  assert.throws(() => bindFactsSource({ source: 'PLANNED', worldRef: null, buildDigest: 'b'.repeat(64) }, request),
    e => e instanceof ContractError && e.code === 'NON_CANONICAL_AMBIGUITY' && e.reason === 'PAYLOAD_CHANGED');
  assert.throws(() => bindFactsSource({ source: 'OBSERVED', worldRef: 'fixture-other-world', buildDigest: null }, request),
    e => e instanceof ContractError && e.code === 'SCHEMA_INVALID' && e.reason === 'INVALID_SHAPE' && e.phase === 'decode');
});

// ---- BU-09 ContractHandshake --------------------------------------------------

test('HS-V030-PAIR-MATCH: Brush advertises exactly the contracts@0.3.0 handshake; a 0.3.0 consumer matches it', () => {
  const pair = compatibility('HS-V030-PAIR-MATCH');
  assert.deepEqual(plain(contractHandshake), pair.advertised);
  assert.deepEqual(plain(contractHandshake.factProfiles), ['target-facts/v2', 'target-facts/v3']);
  assert.equal(new BrushV2().handshake(), contractHandshake);
  assert.equal(new BrushV2().status().contractHandshake, contractHandshake);
  assert.equal(checkContractHandshake(contractHandshake, pair.required).result, pair.expected.result);
  assert.equal(checkContractHandshake(contractHandshake, { wires: ['BUILD/V2'], factProfiles: ['target-facts/v3'] }).result, 'HANDSHAKE_VERSION_MATCH');
});

test('HS-MIXED-BRUSH-FACTS-V2: a contracts@0.2.1 Brush advertisement fails a 0.3.0 consumer with UNSUPPORTED_VERSION before any request', () => {
  const pair = compatibility('HS-MIXED-BRUSH-FACTS-V2');
  let requestsSent = 0;
  assert.throws(() => { checkContractHandshake(pair.advertised, pair.required); requestsSent++; }, error =>
    error instanceof ContractError && error.code === pair.expected.code && error.phase === pair.expected.phase &&
    error.reason === pair.expected.reason && error.publicError.mutationState === pair.expected.mutationState);
  assert.equal(requestsSent, pair.expected.requestsSent);
});

test('a 0.3.0 Brush does not satisfy a consumer that requires 0.2.1-only wire majors (no silent fallback)', () => {
  for (const wire of ['painter/v2', 'canvas/v3', 'world-adapter/v3', 'interaction-surface/v2']) {
    assert.throws(() => checkContractHandshake(contractHandshake, { wires: ['BUILD/V2', wire], factProfiles: [] }),
      error => error instanceof ContractError && error.code === 'UNSUPPORTED_VERSION' && error.phase === 'decode');
  }
});

// ---- no digest projection change ------------------------------------------------

test('all nineteen production goldens reproduce byte-identically through the bundled contracts@0.3.0 runtime', () => {
  assert.equal(goldens.vectors.length, 19);
  for (const vector of goldens.vectors) {
    const digest = digestValue(vector.kind, vector.payload);
    assert.equal(digest.sha256, vector.expected.sha256, vector.id);
    assert.equal(canonicalJSON(digest.projection), vector.expected.canonicalUtf8, vector.id);
  }
});
