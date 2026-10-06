// Pure region voxel block + palette compiler. Canvas owns all transaction
// decisions; this module never reads or writes a world, persists, calls a
// model, reads a clock or uses randomness.
//
// FIXTURE BOUNDARY: hanaworlds-contracts@0.4.2 has no region wire yet. The
// envelope field names, the protocol/capability record and the digest domain
// below are an explicit Brush-local fixture of the public shape named by the
// S1-CONTRACT-REGION-V1-01 card (region voxel block + palette v1, explicit air
// dig, per-chunk digest, protocol-major compatibility). They are replaced by the
// actual contracts region v1 bytes once delivered. Node/material/world checks
// already use the current public contracts validators.

import { types as nodeTypes } from 'node:util';
import { createHash } from 'node:crypto';
import canonicalize from 'canonicalize';
import { ContractError, validateType } from '#contracts';

export const REGION_FIXTURE = 'FIXTURE: brush-local region v1 shape pending contracts region v1';
export const REGION_WIRE = 'REGION/V1';
export const REGION_PROFILE = 'region-voxel/v1';
export const REGION_OUTPUT_PROFILE = 'region-chunks/v1';
/** Explicit "not specified": the target cell is left untouched. Never air. */
export const UNSPECIFIED = -1;
/** Luanti MAP_BLOCKSIZE: VoxelManip/mapblock edge. An engine fact, not a policy. */
export const CHUNK_EDGE = 16;
const CHUNK_CELLS = CHUNK_EDGE ** 3;
/** x fastest, then y, then z: Luanti VoxelArea/mapblock index order. */
export const AXIS_ORDER = 'x,y,z';
const DIGEST_DOMAIN = 'HanaWorlds|brush-region-fixture@v1|';

/** Protocol this compiler speaks and the capabilities it provides. */
export const regionProtocol = Object.freeze({ name: 'hanaworlds-region', major: 1, minor: 0 });
export const regionCapabilities = Object.freeze(['region-voxel-palette', 'explicit-air-dig', 'unspecified-preserve', 'chunk-digest', 'rle-cells']);

const fail = (code, reason, phase = 'validate') => { throw new ContractError(code, phase, reason); };
const check = (condition, code, reason, phase) => { if (!condition) fail(code, reason, phase); };
const shape = (condition) => check(condition, 'SCHEMA_INVALID', 'INVALID_SHAPE', 'decode');
const isInt = (v, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(v) && v >= min && v <= max;

/**
 * Protocol compatibility: same major plus every required capability. Minor,
 * patch and package hashes never decide compatibility. Major 0 is pre-stable:
 * there the minor is the breaking component, so 0.x is not blanket-compatible.
 */
export function checkRegionProtocol(protocol, requiredCapabilities = []) {
  shape(protocol !== null && typeof protocol === 'object' && protocol.name === regionProtocol.name && isInt(protocol.major, 0) && isInt(protocol.minor, 0));
  const line = p => p.major > 0 ? `${p.major}` : `0.${p.minor}`;
  check(line(protocol) === line(regionProtocol), 'UNSUPPORTED_VERSION', 'VERSION_UNSUPPORTED', 'decode');
  shape(Array.isArray(requiredCapabilities) && requiredCapabilities.every(c => typeof c === 'string' && c.length > 0));
  check(requiredCapabilities.every(c => regionCapabilities.includes(c)), 'CAPABILITY_UNAVAILABLE', 'VERSION_UNSUPPORTED', 'decode');
  return Object.freeze({ result: 'REGION_PROTOCOL_COMPATIBLE', speaks: regionProtocol, requested: Object.freeze({ ...protocol }) });
}

/** Own-data plain JSON snapshot: never runs caller getters, traps or toJSON. */
function snapshot(value, depth = 0) {
  shape(depth < 64);
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') { shape(Number.isFinite(value)); return value; }
  shape(typeof value === 'object' && !nodeTypes.isProxy(value) && Object.getOwnPropertySymbols(value).length === 0);
  const array = Array.isArray(value), proto = Object.getPrototypeOf(value);
  shape(array ? proto === Array.prototype : proto === Object.prototype || proto === null);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (array) {
    const out = new Array(value.length);
    shape(Object.keys(descriptors).length === value.length + 1);
    for (let i = 0; i < value.length; i++) {
      const d = descriptors[i]; shape(d && Object.hasOwn(d, 'value') && d.enumerable);
      out[i] = snapshot(d.value, depth + 1);
    }
    return out;
  }
  const out = {};
  for (const [k, d] of Object.entries(descriptors)) { shape(Object.hasOwn(d, 'value') && d.enumerable); out[k] = snapshot(d.value, depth + 1); }
  return out;
}

const exactKeys = (o, keys) => shape(o !== null && typeof o === 'object' && !Array.isArray(o)
  && Object.keys(o).length === keys.length && keys.every(k => Object.hasOwn(o, k)));

/** dense: one palette index per cell; rle: [[value, count], ...] runs in axis order. */
function decodeCells(cells, total, paletteLength) {
  const out = new Int32Array(total);
  const legal = v => isInt(v, UNSPECIFIED, paletteLength - 1);
  if (Array.isArray(cells)) {
    shape(cells.length === total);
    for (let i = 0; i < total; i++) { shape(legal(cells[i])); out[i] = cells[i]; }
    return out;
  }
  exactKeys(cells, ['encoding', 'runs']);
  shape(cells.encoding === 'rle' && Array.isArray(cells.runs));
  let at = 0;
  for (const run of cells.runs) {
    shape(Array.isArray(run) && run.length === 2 && legal(run[0]) && isInt(run[1], 1) && at + run[1] <= total);
    out.fill(run[0], at, at + run[1]); at += run[1];
  }
  shape(at === total);
  return out;
}

function rle(indices) {
  const runs = [];
  for (let i = 0; i < indices.length;) {
    let j = i + 1; while (j < indices.length && indices[j] === indices[i]) j++;
    runs.push([indices[i], j - i]); i = j;
  }
  return runs;
}

export function regionDigest(kind, payload) {
  return createHash('sha256').update(DIGEST_DOMAIN + kind + '|' + canonicalize(payload), 'utf8').digest('hex');
}

const nodeKey = n => `${n.nodeName}\u0000${n.param2}`;
const floorDiv = (a, b) => Math.floor(a / b);

function decodeRequest(request) {
  exactKeys(request, ['contractVersion', 'requestId', 'protocol', 'requiredCapabilities', 'worldRef', 'localContext', 'catalogue', 'region']);
  shape(request.contractVersion === REGION_WIRE && typeof request.requestId === 'string' && request.requestId.length > 0);
  checkRegionProtocol(request.protocol, request.requiredCapabilities);
  validateType('Ref', request.worldRef);
  const localContext = validateType('LocalWorldContext', request.localContext);
  check(localContext.worldRef === request.worldRef, 'CURRENT_WORLD_MISMATCH', 'IDENTITY_UNVERIFIED');
  const catalogue = validateType('Catalogue', request.catalogue);
  const region = request.region;
  exactKeys(region, ['profileVersion', 'origin', 'size', 'axisOrder', 'palette', 'cells']);
  check(region.profileVersion === REGION_PROFILE, 'UNSUPPORTED_VERSION', 'VERSION_UNSUPPORTED', 'decode');
  check(region.axisOrder === AXIS_ORDER, 'AMBIGUOUS_GEOMETRY', 'INVALID_GEOMETRY');
  const origin = validateType('Position', region.origin);
  shape(Array.isArray(region.size) && region.size.length === 3 && region.size.every(n => isInt(n, 1)));
  // Exact integer bounds (BigInt: float addition near 2^53 would round silently).
  const maxBig = origin.map((o, i) => BigInt(o) + BigInt(region.size[i]) - 1n);
  const minChunkCorner = origin.map(o => BigInt(floorDiv(o, CHUNK_EDGE)) * BigInt(CHUNK_EDGE));
  const safe = n => n <= BigInt(Number.MAX_SAFE_INTEGER) && n >= BigInt(Number.MIN_SAFE_INTEGER);
  check(maxBig.every(safe) && minChunkCorner.every(safe), 'AMBIGUOUS_GEOMETRY', 'INVALID_GEOMETRY');
  const max = maxBig.map(Number);
  const total = region.size[0] * region.size[1] * region.size[2];
  // Engine fact: a typed array index must be a valid array length.
  check(Number.isSafeInteger(total) && total <= 2 ** 32 - 1, 'LIMIT_EXCEEDED', 'LIMIT_EXCEEDED');
  shape(Array.isArray(region.palette) && region.palette.length >= 1);
  const seen = new Set();
  const palette = region.palette.map(entry => {
    const node = validateType('NodeSpec', entry);
    check(!seen.has(nodeKey(node)), 'NON_CANONICAL_AMBIGUITY', 'PAYLOAD_CHANGED'); seen.add(nodeKey(node));
    check(Object.hasOwn(catalogue.nodes, node.nodeName), 'CATALOGUE_MISMATCH', 'CATALOGUE_UNRESOLVED');
    const cap = catalogue.nodes[node.nodeName];
    check(cap.allowedParam2 !== null && cap.definitionRevision !== null && cap.hasCallbacks === false && cap.hasPersistentState === false,
      'UNSUPPORTED_MUTATION_SEMANTICS', 'REQUIRED_FACT_UNKNOWN');
    check(cap.allowedParam2.includes(node.param2), 'UNSUPPORTED_MUTATION_SEMANTICS', 'REQUIRED_FACT_UNKNOWN');
    return node;
  });
  const cells = decodeCells(region.cells, total, palette.length);
  return { request, catalogue, region, origin, max, palette, cells };
}

function compileChunks({ request, catalogue, region, origin, max, palette, cells }) {
  const [sx, sy] = region.size;
  const chunks = new Map();
  let specified = 0, air = 0;
  for (let i = 0; i < cells.length; i++) {
    const v = cells[i]; if (v === UNSPECIFIED) continue;
    const x = origin[0] + (i % sx), y = origin[1] + (floorDiv(i, sx) % sy), z = origin[2] + floorDiv(i, sx * sy);
    const c = [floorDiv(x, CHUNK_EDGE), floorDiv(y, CHUNK_EDGE), floorDiv(z, CHUNK_EDGE)];
    const k = c.join(',');
    let chunk = chunks.get(k);
    if (!chunk) { chunk = { chunkPos: c, local: new Int32Array(CHUNK_CELLS).fill(UNSPECIFIED) }; chunks.set(k, chunk); }
    const lx = x - c[0] * CHUNK_EDGE, ly = y - c[1] * CHUNK_EDGE, lz = z - c[2] * CHUNK_EDGE;
    chunk.local[lx + CHUNK_EDGE * (ly + CHUNK_EDGE * lz)] = v;
    specified++; if (palette[v].nodeName === 'air') air++;
  }
  check(specified > 0, 'BUILD_INVALID', 'INVALID_GEOMETRY');
  const worldRef = request.worldRef;
  const out = [...chunks.values()]
    .sort((a, b) => a.chunkPos[0] - b.chunkPos[0] || a.chunkPos[1] - b.chunkPos[1] || a.chunkPos[2] - b.chunkPos[2])
    .map(({ chunkPos, local }) => {
      // Chunk palette: used entries in ascending global palette order.
      const used = [...new Set(local)].filter(v => v !== UNSPECIFIED).sort((a, b) => a - b);
      const remap = new Map(used.map((g, l) => [g, l]));
      const indices = Array.from(local, v => v === UNSPECIFIED ? UNSPECIFIED : remap.get(v));
      const chunkPalette = used.map(g => ({ nodeName: palette[g].nodeName, param2: palette[g].param2 }));
      let n = 0, a = 0; for (const v of indices) if (v !== UNSPECIFIED) { n++; if (chunkPalette[v].nodeName === 'air') a++; }
      const body = { profileVersion: REGION_OUTPUT_PROFILE, worldRef, chunkPos, min: chunkPos.map(c => c * CHUNK_EDGE),
        edge: CHUNK_EDGE, axisOrder: AXIS_ORDER, palette: chunkPalette, cells: { encoding: 'rle', runs: rle(indices) },
        specifiedCells: n, airCells: a };
      return { ...body, chunkDigest: regionDigest('region-chunk', body) };
    });
  const catalogueDigest = regionDigest('catalogue', catalogue);
  const sourceRegionDigest = regionDigest('region', region);
  const compiled = { profileVersion: REGION_OUTPUT_PROFILE, worldRef, catalogueDigest, sourceRegionDigest,
    regionBounds: { min: origin, max }, chunkDigests: out.map(c => [c.chunkPos, c.chunkDigest]), specifiedCells: specified, airCells: air };
  return { ...compiled, compiledDigest: regionDigest('region-compiled', compiled), chunks: out };
}

function deepFreeze(v) { if (v && typeof v === 'object') { Object.freeze(v); for (const k of Object.keys(v)) deepFreeze(v[k]); } return v; }

function requestIdOf(value) {
  if (value === null || typeof value !== 'object' || nodeTypes.isProxy(value) || Array.isArray(value)) return null;
  const d = Object.getOwnPropertyDescriptor(value, 'requestId');
  const id = d && Object.hasOwn(d, 'value') ? d.value : null;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/**
 * Compile one region request. Returns { contractVersion, requestId, result, error }
 * with exactly one of result/error; any failure yields zero chunks. When no
 * requestId is recoverable the ContractError itself is thrown.
 */
export function compileRegion(value) {
  let requestId = null;
  try {
    const request = snapshot(value);
    requestId = requestIdOf(request);
    const result = compileChunks(decodeRequest(request));
    return deepFreeze({ contractVersion: REGION_WIRE, requestId: request.requestId, result, error: null });
  } catch (error) {
    if (!(error instanceof ContractError)) throw error;
    requestId ??= requestIdOf(value);
    if (requestId === null) throw error;
    return deepFreeze({ contractVersion: REGION_WIRE, requestId, result: null, error: error.publicError });
  }
}

/** Expand compiled chunks back to explicit cells (for readback comparison). */
export function chunkCells(chunk) {
  const out = []; let i = 0;
  for (const [v, count] of chunk.cells.runs) {
    for (let k = 0; k < count; k++, i++) {
      if (v === UNSPECIFIED) continue;
      const lx = i % CHUNK_EDGE, ly = floorDiv(i, CHUNK_EDGE) % CHUNK_EDGE, lz = floorDiv(i, CHUNK_EDGE * CHUNK_EDGE);
      out.push({ position: [chunk.min[0] + lx, chunk.min[1] + ly, chunk.min[2] + lz], ...chunk.palette[v] });
    }
  }
  return out;
}
