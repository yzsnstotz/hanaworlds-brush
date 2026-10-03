import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { canonicalJSON, ContractError, deepFreeze } from '#contracts';
import * as operationsV2 from '#contracts/operations/v2';
import * as buildV2 from '#contracts/BUILD/V2';
import goldens from '#contracts/fixtures/production-goldens' with { type: 'json' };
import closure from '#contracts/fixtures/closure-oracles' with { type: 'json' };
import plugin, { compileBuildDocument, compileBuildDocumentBytes, BrushV2, apply, invariants } from '../src/index.mjs';
import { makeRequest, wireRequest, catalogue, box, compileFixtureEffects } from './helpers.mjs';

const utf8 = value => Buffer.from(JSON.stringify(value), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));

function rejects(response, code, reason, phase = 'validate') {
  assert.equal(response.result, null, 'zero output on rejection');
  assert.deepEqual(
    { code: response.error.code, phase: response.error.phase, reason: response.error.reason, mutationState: response.error.mutationState },
    { code, phase, reason, mutationState: 'NONE' });
  buildV2.response('BuildDocument', response);
}

function throwsTyped(fn, code, reason, phase) {
  assert.throws(fn, error => error instanceof ContractError && error.code === code && error.reason === reason && error.phase === phase);
}

// ---- golden / conformance -------------------------------------------------

test('admitted WIRE-BUILD-V2 compiles to the frozen PROD-operations golden', () => {
  const response = compileBuildDocument(wireRequest());
  assert.equal(response.error, null);
  const golden = goldens.vectors.find(v => v.id === 'PROD-operations');
  const oracle = closure.cases.find(c => c.id === 'BU-02-VALID');
  assert.deepEqual(plain(response.result.projection), golden.payload);
  assert.equal(response.result.operationDigest, oracle.expected.sha256);
  assert.equal(operationsV2.digest(response.result.projection).sha256, oracle.expected.sha256);
  operationsV2.validateCompiledSet(response.result);
  operationsV2.validate(response.result.projection);
});

test('BU-02-INVALID: a provided operations digest that does not match is rejected by the public consumer check', () => {
  const oracle = closure.cases.find(c => c.id === 'BU-02-INVALID');
  const { result } = compileBuildDocument(wireRequest());
  assert.notEqual(result.operationDigest, oracle.input.providedDigest);
});

test('readBounds is the bound target-facts coverage, writeBounds the exact effect bounds', () => {
  const req = makeRequest({ operations: [box([0, 0, 0], [1, 0, 0])], factsCells: {
    occupiedCells: [{ position: [3, 0, 0], nodeName: 'fixture:stone', param2: 0 }],
    knownEmptyCells: [[0, 0, 0], [1, 0, 0]], unknownCells: [{ position: [-2, 0, 0], reason: 'UNLOADED' }] } });
  const { result } = compileBuildDocument(req);
  assert.deepEqual(plain(result.readBounds), { min: [-2, 0, 0], max: [3, 0, 0] });
  assert.deepEqual(plain(result.writeBounds), { min: [0, 0, 0], max: [1, 0, 0] });
});

// ---- deterministic exact expansion ------------------------------------------

test('last writer wins on overlap; numeric x,y,z order including negatives', () => {
  const materials = { stone: { nodeName: 'fixture:stone', param2: 0 }, glass: { nodeName: 'fixture:glass', param2: 2 } };
  const operations = [box([-10, -1, 0], [2, 0, 1]), box([-3, -1, 1], [9, 0, 1], 'glass'), box([0, 0, 0], [0, 0, 0])];
  const response = compileBuildDocument(makeRequest({ operations, materials }));
  assert.equal(response.error, null);
  assert.deepEqual(plain(response.result.projection.effects), compileFixtureEffects(operations, materials));
  const at = p => response.result.projection.effects.find(e => e.position.join() === p.join());
  assert.equal(at([0, 0, 0]).nodeName, 'fixture:stone');
  assert.equal(at([0, 0, 1]).nodeName, 'fixture:glass');
  assert.equal(at([-10, -1, 1]).nodeName, 'fixture:stone');
  assert.deepEqual(response.result.projection.effects[0].position, [-10, -1, 0]);
});

test('distant boxes do not enumerate the empty space between them', () => {
  const big = 2 ** 40;
  const operations = [box([0, 0, 0], [0, 0, 0]), box([big, big, big], [big, big, big])];
  const response = compileBuildDocument(makeRequest({ operations, declaredBounds: { min: [0, 0, 0], max: [big, big, big] } }));
  assert.equal(response.error, null);
  assert.deepEqual(plain(response.result.projection.effects.map(e => e.position)), [[0, 0, 0], [big, big, big]]);
});

test('seeded property check: 300 random ordered builds equal the independent contracts expander', () => {
  let seed = 0x5eed1234;
  const rand = n => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  const materials = { stone: { nodeName: 'fixture:stone', param2: 0 }, glass: { nodeName: 'fixture:glass', param2: 1 }, g3: { nodeName: 'fixture:glass', param2: 3 } };
  const refs = Object.keys(materials);
  for (let i = 0; i < 300; i++) {
    const operations = Array.from({ length: 1 + rand(6) }, () => {
      const min = [rand(9) - 4, rand(9) - 4, rand(9) - 4];
      return box(min, min.map(v => v + rand(4)), refs[rand(refs.length)]);
    });
    const response = compileBuildDocument(makeRequest({ operations, materials }));
    assert.equal(response.error, null, `case ${i}`);
    assert.deepEqual(plain(response.result.projection.effects), compileFixtureEffects(operations, materials), `case ${i}`);
  }
});

test('byte-identical output for identical input, value and raw-bytes entrypoints, and permuted key order', () => {
  const req = makeRequest({ operations: [box([0, 0, 0], [2, 1, 1]), box([1, 1, 1], [1, 1, 1])] });
  const a = canonicalJSON(compileBuildDocument(req));
  const b = canonicalJSON(compileBuildDocument(structuredClone(req)));
  const c = canonicalJSON(compileBuildDocumentBytes(utf8(req)));
  const reverse = v => Object.fromEntries(Object.entries(v).reverse());
  const d = canonicalJSON(compileBuildDocument({ ...reverse(req), build: reverse(req.build) }));
  assert.equal(a, b); assert.equal(a, c); assert.equal(a, d);
});

test('observed contracts behaviour (0.2.1 and 0.3.0): a Box written {max,min} is rejected typed (reported to PM, not masked)', () => {
  const req = makeRequest({ operations: [box([0, 0, 0], [1, 0, 0])] });
  const reordered = { ...req, build: { ...req.build, declaredBounds: { max: req.build.declaredBounds.max, min: req.build.declaredBounds.min } } };
  rejects(compileBuildDocument(reordered), 'SCHEMA_INVALID', 'INVALID_SHAPE');
});

test('input is never mutated (deep-frozen request compiles)', () => {
  const req = deepFreeze(makeRequest({ operations: [box([0, 0, 0], [1, 1, 1])] }));
  const before = JSON.stringify(req);
  assert.equal(compileBuildDocument(req).error, null);
  assert.equal(JSON.stringify(req), before);
});

// ---- typed zero-output rejection --------------------------------------------

test('P0: raw duplicate decoded key is rejected before anything else (no requestId recoverable → thrown, no output)', () => {
  const raw = Buffer.from('{"contractVersion":"BUILD/V2","requestId":"a","\\u0072equestId":"b"}', 'utf8');
  throwsTyped(() => compileBuildDocumentBytes(raw), 'NON_CANONICAL_AMBIGUITY', 'DUPLICATE_DECODED_KEY', 'decode');
});

test('P0: invalid UTF-8 is rejected', () => {
  throwsTyped(() => compileBuildDocumentBytes(Buffer.from([0x7b, 0xff, 0x7d])), 'SCHEMA_INVALID', 'INVALID_UTF8', 'decode');
});

test('P0: old major BUILD/V1 → UNSUPPORTED_VERSION', () => {
  rejects(compileBuildDocument({ ...wireRequest(), contractVersion: 'BUILD/V1' }), 'UNSUPPORTED_VERSION', 'VERSION_UNSUPPORTED', 'decode');
});

test('P0: unknown field → UNKNOWN_REQUIRED_FIELD (BU-01-INVALID)', () => {
  rejects(compileBuildDocument({ ...wireRequest(), unexpectedAuthority: true }), 'UNKNOWN_REQUIRED_FIELD', 'UNKNOWN_FIELD', 'decode');
});

test('P0: missing field, empty operations and min>max are schema-invalid', () => {
  const { compilerRevision, ...missing } = wireRequest();
  rejects(compileBuildDocument(missing), 'SCHEMA_INVALID', 'INVALID_SHAPE', 'decode');
  const empty = wireRequest(); empty.build.operations = [];
  assert.equal(compileBuildDocument(empty).error.code, 'SCHEMA_INVALID');
  const inverted = wireRequest(); inverted.build.operations[0].min = [1, 0, 0];
  assert.equal(compileBuildDocument(inverted).error.code, 'SCHEMA_INVALID');
});

test('P0: non-object input without requestId throws typed error', () => {
  throwsTyped(() => compileBuildDocument(5), 'SCHEMA_INVALID', 'INVALID_SHAPE', 'decode');
});

test('identity: any payload/digest mismatch → NON_CANONICAL_AMBIGUITY/PAYLOAD_CHANGED', () => {
  const req = wireRequest(); req.buildDigest = 'f'.repeat(64);
  rejects(compileBuildDocument(req), 'NON_CANONICAL_AMBIGUITY', 'PAYLOAD_CHANGED');
  const cat = wireRequest(); cat.catalogue.gameRevision = 'changed';
  rejects(compileBuildDocument(cat), 'NON_CANONICAL_AMBIGUITY', 'PAYLOAD_CHANGED');
});

test('identity: coordinate frame differing from the target-facts frame → NON_CANONICAL_AMBIGUITY', () => {
  rejects(compileBuildDocument(makeRequest({ operations: [box([0, 0, 0], [0, 0, 0])], frame: { transformRevision: 'other' } })),
    'NON_CANONICAL_AMBIGUITY', 'PAYLOAD_CHANGED');
});

test('identity: target facts bound to another catalogue → CATALOGUE_MISMATCH', () => {
  rejects(compileBuildDocument(makeRequest({ operations: [box([0, 0, 0], [0, 0, 0])], facts: { catalogueDigest: 'a'.repeat(64) } })),
    'CATALOGUE_MISMATCH', 'CATALOGUE_UNRESOLVED');
});

test('identity: INSPECTED facts from another world → TARGET_FACTS_STALE', () => {
  rejects(compileBuildDocument(makeRequest({ operations: [box([0, 0, 0], [0, 0, 0])], facts: { worldRef: 'other-world' } })),
    'TARGET_FACTS_STALE', 'REVISION_CHANGED');
});

test('identity: facts whose cells do not hash to the bound coverage → rejected', () => {
  const req = makeRequest({ operations: [box([0, 0, 0], [0, 0, 0])], facts: { coverageDigest: 'b'.repeat(64) } });
  rejects(compileBuildDocument(req), 'NON_CANONICAL_AMBIGUITY', 'PAYLOAD_CHANGED');
});

test('geometry: declaredBounds not equal to exact union bounds → SCHEMA_INVALID (contracts domain)', () => {
  const req = makeRequest({ operations: [box([0, 0, 0], [1, 0, 0])] });
  rejects(compileBuildDocument({ ...req, build: { ...req.build, declaredBounds: { min: [0, 0, 0], max: [2, 0, 0] } } }), 'SCHEMA_INVALID', 'INVALID_SHAPE');
});

test('materials: unresolved materialRef or catalogue node → CATALOGUE_MISMATCH (never guessed)', () => {
  const req = makeRequest({ operations: [box([0, 0, 0], [0, 0, 0])] });
  rejects(compileBuildDocument({ ...req, build: { ...req.build, operations: [box([0, 0, 0], [0, 0, 0], 'missing')] } }),
    'CATALOGUE_MISMATCH', 'CATALOGUE_UNRESOLVED');
  rejects(compileBuildDocument(makeRequest({ operations: [box([0, 0, 0], [0, 0, 0])], materials: { stone: { nodeName: 'fixture:marble', param2: 0 } } })),
    'CATALOGUE_MISMATCH', 'CATALOGUE_UNRESOLVED');
});

test('materials: disallowed param2, callbacks, persistent state or unknown definition → UNSUPPORTED_MUTATION_SEMANTICS', () => {
  const cases = [
    { materials: { stone: { nodeName: 'fixture:glass', param2: 7 } } },
    { materials: { stone: { nodeName: 'fixture:chest', param2: 0 } } },
    { cat: catalogue({ 'fixture:stone': { ...catalogue().nodes['fixture:stone'], hasPersistentState: true } }) },
    { cat: catalogue({ 'fixture:stone': { ...catalogue().nodes['fixture:stone'], definitionRevision: null, unknownFields: ['definitionRevision'] } }) },
  ];
  for (const c of cases) rejects(compileBuildDocument(makeRequest({ operations: [box([0, 0, 0], [0, 0, 0])], ...c })),
    'UNSUPPORTED_MUTATION_SEMANTICS', 'REQUIRED_FACT_UNKNOWN');
});

test('caps: exact BigInt count above the attributed host cap → LIMIT_EXCEEDED without allocation or truncation', () => {
  const max = 2 ** 20;
  const req = makeRequest({ operations: [box([0, 0, 0], [max, max, max])], skipOracle: true,
    factsCells: { occupiedCells: [], knownEmptyCells: [[0, 0, 0]], unknownCells: [] } });
  const started = process.hrtime.bigint();
  rejects(compileBuildDocument(req), 'LIMIT_EXCEEDED', 'LIMIT_EXCEEDED');
  assert.ok(process.hrtime.bigint() - started < 2_000_000_000n);
});

test('target facts: writing an unknown or unsampled cell → TARGET_FACTS_INCOMPLETE (never treated as air)', () => {
  const operations = [box([0, 0, 0], [1, 0, 0])];
  rejects(compileBuildDocument(makeRequest({ operations, factsCells: { occupiedCells: [], knownEmptyCells: [[0, 0, 0]], unknownCells: [{ position: [1, 0, 0], reason: 'UNLOADED' }] } })),
    'TARGET_FACTS_INCOMPLETE', 'REQUIRED_FACT_UNKNOWN');
  rejects(compileBuildDocument(makeRequest({ operations, factsCells: { occupiedCells: [], knownEmptyCells: [[0, 0, 0]], unknownCells: [] } })),
    'TARGET_FACTS_INCOMPLETE', 'REQUIRED_FACT_UNKNOWN');
});

test('target facts: an occupied known cell may be overwritten (modification), facts are not invented', () => {
  const operations = [box([0, 0, 0], [1, 0, 0])];
  const response = compileBuildDocument(makeRequest({ operations, factsCells: {
    occupiedCells: [{ position: [1, 0, 0], nodeName: 'fixture:stone', param2: 0 }], knownEmptyCells: [[0, 0, 0]], unknownCells: [] } }));
  assert.equal(response.error, null);
});

test('PLANNED facts must precede the build they describe (acyclic)', () => {
  const planned = { source: 'PLANNED', worldRef: null, objectRef: null, worldRevision: null, objectRevision: null, buildDigest: 'c'.repeat(64), planRevision: 'plan-1' };
  assert.equal(compileBuildDocument(makeRequest({ operations: [box([0, 0, 0], [0, 0, 0])], facts: planned })).error, null);
});

test('witnesses: missing required predicate, uncovered effect, or body overlap → SAFETY_INVARIANT_FAILED', () => {
  const operations = [box([0, 0, 0], [1, 0, 0])];
  rejects(compileBuildDocument(makeRequest({ operations, witnesses: w => w.filter(x => x.predicate !== 'BODY_CLEARANCE') })),
    'SAFETY_INVARIANT_FAILED', 'REQUIRED_FACT_UNKNOWN');
  rejects(compileBuildDocument(makeRequest({ operations, witnesses: w => w.map(x => x.predicate === 'COVERAGE' ? { ...x, facts: { ...x.facts, positions: [[0, 0, 0]] } } : x) })),
    'SAFETY_INVARIANT_FAILED', 'REQUIRED_FACT_UNKNOWN');
  rejects(compileBuildDocument(makeRequest({ operations, witnesses: w => w.map(x => x.predicate === 'BODY_CLEARANCE' ? { ...x, facts: { ...x.facts, bodyOccupiedPositions: [[1, 0, 0]] } } : x) })),
    'SAFETY_INVARIANT_FAILED', 'REQUIRED_FACT_UNKNOWN');
});

test('witnesses: protected cell in the write set → PERMISSION_DENIED; stale witness digest → NON_CANONICAL_AMBIGUITY', () => {
  const operations = [box([0, 0, 0], [0, 0, 0])];
  rejects(compileBuildDocument(makeRequest({ operations, witnesses: w => w.map(x => x.predicate === 'PROTECTION' ? { ...x, facts: { ...x.facts, protectedPositions: [[0, 0, 0]] } } : x) })),
    'PERMISSION_DENIED', 'SCOPE_DENIED', 'authorize');
  rejects(compileBuildDocument(makeRequest({ operations, witnesses: w => w.map(x => ({ ...x, finalEffectsDigest: 'd'.repeat(64) })) })),
    'NON_CANONICAL_AMBIGUITY', 'PAYLOAD_CHANGED');
});

test('contract gap: a code outside the BuildDocument allowlist is thrown typed, never remapped (CAPABILITY_UNAVAILABLE)', () => {
  throwsTyped(() => compileBuildDocument(makeRequest({ operations: [box([0, 0, 0], [0, 0, 0])], safety: { requireProtectedClearance: false } })),
    'CAPABILITY_UNAVAILABLE', 'POLICY_UNAVAILABLE', 'validate');
});

test('every error response passes the public BuildDocument response contract and carries no input data', () => {
  const response = compileBuildDocument({ ...wireRequest(), unexpectedAuthority: 'FIXTURE_SECRET_MUST_NOT_PROJECT' });
  assert.ok(!JSON.stringify(response).includes('FIXTURE_SECRET'));
  assert.deepEqual(Object.keys(response.error).sort(), ['causeCode', 'code', 'mutationState', 'phase', 'reason', 'retryability', 'transactionRef']);
});

// ---- purity / host plugin ---------------------------------------------------

test('source has no world, network, filesystem, process, clock or randomness access', () => {
  const dir = new URL('../src/', import.meta.url);
  for (const file of readdirSync(dir)) {
    const text = readFileSync(new URL(file, dir), 'utf8');
    const imports = [...text.matchAll(/from '([^']+)'/g)].map(m => m[1]);
    for (const spec of imports) assert.ok(spec.startsWith('./') || spec === '#contracts' || spec.startsWith('#contracts/'), `${file} imports ${spec}`);
    assert.doesNotMatch(text, /\b(require\(|import\(|fetch\(|Date\.|Math\.random|setTimeout|setInterval|child_process|node:fs|node:net|node:http|WebSocket)/, file);
  }
});

test('DSH plugin provides exactly the hanaworldsBrushV2 service and nothing else', () => {
  const provided = [];
  apply({ provide: (name, value) => provided.push([name, value]) });
  assert.equal(provided.length, 1);
  assert.equal(provided[0][0], 'hanaworldsBrushV2');
  assert.ok(provided[0][1] instanceof BrushV2);
  assert.equal(plugin.name, 'hanaworlds-brush');
  assert.deepEqual(plugin.inject, []);
  const status = provided[0][1].status();
  assert.equal(status.worldAccess, 'NONE');
  assert.equal(status.contracts, 'hanaworlds-contracts@0.3.0');
  assert.equal(status.invariants, invariants);
  assert.equal(provided[0][1].compile(wireRequest()).result.operationDigest, closure.cases.find(c => c.id === 'BU-02-VALID').expected.sha256);
});

test('#contracts resolves only to the bundled admitted contracts 0.3.0 (v4 lane) copy inside this package', async () => {
  const root = new URL('../', import.meta.url).href;
  for (const spec of ['#contracts', '#contracts/BUILD/V2', '#contracts/operations/v2']) {
    assert.ok(import.meta.resolve(spec).startsWith(root + 'vendor/hanaworlds-contracts/dist/v4/'), spec);
  }
  const vendored = JSON.parse(readFileSync(new URL('../vendor/hanaworlds-contracts/package.json', import.meta.url), 'utf8'));
  assert.deepEqual([vendored.name, vendored.version, vendored.dependencies], ['hanaworlds-contracts', '0.3.0', { canonicalize: '5.1.0' }]);
  const own = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.deepEqual(own.dependencies, { canonicalize: '5.1.0' });
});
