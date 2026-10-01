// Test-only builders. Digests come from the admitted contracts package and the
// expected effects from its independent fixture expander, not from Brush.
import { digestValue, comparePosition } from 'hanaworlds-contracts';
import { compileFixtureEffects } from 'hanaworlds-contracts/fixture';
import wire from 'hanaworlds-contracts/fixtures/wire-inputs' with { type: 'json' };

export const wireRequest = () => structuredClone(wire.requests.find(r => r.id === 'WIRE-BUILD-V2').request);

const node = (over = {}) => ({
  walkable: true, collisionBoxes: [[-0.5, -0.5, -0.5, 0.5, 0.5, 0.5]], liquidType: 'none', damagePerSecond: 0,
  lightSource: 0, param2Type: 'none', allowedParam2: [0], hasCallbacks: false, hasPersistentState: false,
  definitionRevision: 'fixture-def-1', unknownFields: [], ...over,
});

export function catalogue(extra = {}) {
  const base = wireRequest().catalogue;
  return { ...base, nodes: {
    ...base.nodes,
    'fixture:glass': node({ param2Type: 'facedir', allowedParam2: [0, 1, 2, 3] }),
    'fixture:chest': node({ hasCallbacks: true }),
    ...extra,
  } };
}

const sortPositions = list => [...list].sort(comparePosition);
const bounds = positions => {
  const min = [...positions[0]], max = [...positions[0]];
  for (const p of positions) for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a], p[a]); max[a] = Math.max(max[a], p[a]); }
  return { min, max };
};
const boxBounds = ops => {
  const min = [...ops[0].min], max = [...ops[0].max];
  for (const op of ops) for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a], op.min[a]); max[a] = Math.max(max[a], op.max[a]); }
  return { min, max };
};

/**
 * Build a fully digest-bound BuildDocumentRequest. Options mutate parts before
 * digests are computed so that each negative case isolates one rule.
 */
export function makeRequest({
  operations, materials = { stone: { nodeName: 'fixture:stone', param2: 0 } }, cat = catalogue(),
  facts: factsPatch = {}, factsCells = null, safety: safetyPatch = {}, witnesses: witnessEdit = w => w,
  declaredBounds = null, worldRef = 'fixture-world', frame: framePatch = {}, skipOracle = false,
} = {}) {
  const req = wireRequest();
  const frame = { ...req.build.coordinateFrame, ...framePatch };
  const frameDigest = digestValue('frame', wireRequest().build.coordinateFrame).sha256;
  // skipOracle: only digests are needed (the build is rejected before expansion); a
  // one-cell stand-in keeps every witness and final-effects payload schema-valid.
  const effects = skipOracle ? [{ position: operations[0].min, ...Object.values(materials)[0] }] : compileFixtureEffects(operations, materials);
  const written = effects.map(e => e.position);
  const cells = factsCells ?? { occupiedCells: [], knownEmptyCells: sortPositions(written), unknownCells: [] };
  const sampled = sortPositions([...cells.occupiedCells.map(c => c.position), ...cells.knownEmptyCells, ...cells.unknownCells.map(c => c.position)]);
  const sampledBounds = sampled.length ? bounds(sampled) : { min: [0, 0, 0], max: [0, 0, 0] };
  const catalogueDigest = digestValue('catalogue', cat).sha256;
  const coverageDigest = digestValue('coverage', { profileVersion: 'coverage/v2', sampledBounds, sampledPositions: sampled }).sha256;
  const targetFacts = {
    ...req.targetFacts, worldRef, catalogueDigest, frameDigest, sampledBounds, coverageDigest, ...cells,
    usableVolume: null, ...factsPatch,
  };
  const safetyProfile = { ...req.safetyProfile, ...safetyPatch };
  const targetFactsDigest = digestValue('target-facts', targetFacts).sha256;
  const safetyProfileDigest = digestValue('safety-profile', safetyProfile).sha256;
  const finalEffectsDigest = digestValue('final-effects', { profileVersion: 'final-effects/v2', frameDigest, catalogueDigest, effects }).sha256;
  const evidence = { providerRef: 'FIXTURE-adapter', sourceRevision: 'fixture-evidence-1', worldRef, worldRevision: 'fixture-world-1' };
  const head = { finalEffectsDigest, targetFactsDigest, safetyProfileDigest };
  const positions = sortPositions(written);
  const witnesses = witnessEdit([
    { witnessId: 'w1', predicate: 'COVERAGE', ...head, facts: { evidence, positions } },
    { witnessId: 'w2', predicate: 'PROTECTION', ...head, facts: { evidence, positions, protectedPositions: [] } },
    { witnessId: 'w3', predicate: 'BODY_CLEARANCE', ...head, facts: { evidence, positions, bodyOccupiedPositions: [[9000, 9000, 9000]], avatarDimensions: safetyProfile.avatarDimensions } },
    { witnessId: 'w4', predicate: 'HAZARD', ...head, facts: { evidence, positions, forbidLiquid: safetyProfile.hazardPolicy.forbidLiquid, maximumDamagePerSecond: safetyProfile.hazardPolicy.maximumDamagePerSecond } },
  ]);
  const build = {
    contractVersion: 'BUILD/V2', documentId: 'fixture-document', coordinateFrame: frame,
    catalogueDigest, targetFactsDigest, safetyProfileDigest, materials, operations,
    declaredBounds: declaredBounds ?? boxBounds(operations), witnesses,
  };
  return {
    ...req, worldRef, build, buildDigest: digestValue('build', build).sha256,
    catalogue: cat, catalogueDigest, targetFacts, targetFactsDigest, safetyProfile, safetyProfileDigest,
    compilationConfigDigest: digestValue('compilation-config', req.compilationConfig).sha256,
  };
}

export const box = (min, max, materialRef = 'stone') => ({ op: 'set_box', min, max, materialRef });
export { compileFixtureEffects };
