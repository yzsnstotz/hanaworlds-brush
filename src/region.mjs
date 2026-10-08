// Pure region-build/v1 CompileRegionBuild: a region voxel block + palette build
// is split into Luanti-mapblock-aligned chunks (region-operations/v1). No world
// connection, mutation, persistence, model access, clock or randomness. Canvas
// owns every transaction decision; Adapter transports.
//
// Every public type, canonical encoding, digest and compatibility rule comes from
// the admitted hanaworlds-contracts package (src/contracts.mjs); this module only orders those
// public helpers and performs the chunk split.

import { types as nodeTypes } from 'node:util';
import {
  ContractError, admitRequest, validateResponse, digestValue, contractProtocols,
  validateCompileRegionBuildRequest, validateCompiledRegionSet,
  expandRegionBlock, encodeRegionBlock, regionChunksOfBox,
} from '#contracts';

const WIRE = 'region-build/v1';
const OPERATION = 'CompileRegionBuild';

/** Protocols this compiler speaks, at the minor the admitted contracts declare. */
export const brushProtocols = Object.freeze(['BUILD', 'region-build'].map(name => {
  const p = contractProtocols.find(x => x.protocol === name);
  if (!p) throw new Error(`brush: admitted contracts lack protocol ${name}`);
  return Object.freeze({ protocol: p.protocol, major: p.major, minor: p.minor });
}));
export const brushCapabilities = Object.freeze(['BUILD/V3:per-cell-compile', 'region-build/v1:compile-mapblock-chunks']);

/** Copy the clipped box of the build's VoxelArea-order indices; -1 stays UNSPECIFIED. */
function clip(build, box) {
  const [bx, by] = [0, 1].map(a => build.box.max[a] - build.box.min[a] + 1);
  const size = [0, 1, 2].map(a => box.max[a] - box.min[a] + 1);
  const out = new Int32Array(size[0] * size[1] * size[2]);
  let i = 0, specified = false;
  for (let z = box.min[2]; z <= box.max[2]; z++) {
    for (let y = box.min[1]; y <= box.max[1]; y++) {
      const row = (box.min[0] - build.box.min[0]) + bx * ((y - build.box.min[1]) + by * (z - build.box.min[2]));
      for (let x = 0; x < size[0]; x++, i++) { const v = build.indices[row + x]; out[i] = v; if (v !== -1) specified = true; }
    }
  }
  return { size, indices: out, specified };
}

function stage(request) {
  const build = expandRegionBlock(request.build.block);
  const chunks = [];
  // regionChunksOfBox yields every intersecting mapblock in ascending x,y,z with its clipped box.
  for (const { chunkPos, box } of regionChunksOfBox(build.box)) {
    const part = clip(build, box);
    if (!part.specified) continue; // an all-UNSPECIFIED chunk writes nothing and is not a valid block
    chunks.push({ chunkPos: [...chunkPos], block: encodeRegionBlock({ origin: box.min, size: part.size, palette: build.palette, indices: part.indices }) });
  }
  const projection = {
    contractVersion: 'region-operations/v1',
    buildDigest: request.buildDigest,
    compilerRevision: request.compilerRevision,
    worldRef: request.worldRef,
    catalogueDigest: request.catalogueDigest,
    chunkEdge: 16,
    chunks,
  };
  const bounds = chunks.map(c => ({ min: c.block.origin, max: c.block.origin.map((o, a) => o + c.block.size[a] - 1) }));
  const writeBounds = { min: [0, 1, 2].map(a => Math.min(...bounds.map(b => b.min[a]))), max: [0, 1, 2].map(a => Math.max(...bounds.map(b => b.max[a]))) };
  return { projection, operationDigest: digestValue('region-operations', projection).sha256, writeBounds };
}

function requestIdOf(value) {
  // A rejected pure-JSON input must never invoke caller code while recovering an ID.
  if (value === null || typeof value !== 'object' || nodeTypes.isProxy(value) || Array.isArray(value)) return null;
  const descriptor = Object.getOwnPropertyDescriptor(value, 'requestId');
  const id = descriptor && Object.hasOwn(descriptor, 'value') ? descriptor.value : null;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

const isHostCapacityError = error => error instanceof RangeError && /^Invalid (typed array|string|array) length/.test(error.message);

/**
 * Compile one CompileRegionBuildRequest value. Returns a contracts-validated
 * CompileRegionBuildResponse with exactly one of result/error; a successful
 * result has also passed the public validateCompiledRegionSet equivalence
 * check. Failures carry zero chunks; with no recoverable requestId the
 * ContractError itself is thrown. Non-contract exceptions propagate unchanged.
 */
export function compileRegionBuild(value) {
  let request = null;
  try {
    request = validateCompileRegionBuildRequest(value);
    const response = { contractVersion: WIRE, requestId: request.requestId, result: stage(request), error: null };
    return validateCompiledRegionSet(request, response);
  } catch (error) {
    let contractError = error;
    if (isHostCapacityError(error)) contractError = new ContractError('LIMIT_EXCEEDED', 'validate', 'LIMIT_EXCEEDED');
    if (!(contractError instanceof ContractError)) throw error;
    const requestId = request?.requestId ?? requestIdOf(value);
    if (requestId === null) throw contractError;
    return validateResponse(WIRE, OPERATION, { contractVersion: WIRE, requestId, result: null, error: contractError.publicError });
  }
}

/** Compile from raw UTF-8 request bytes using the contracts strict decoder. */
export function compileRegionBuildBytes(bytes) {
  return compileRegionBuild(admitRequest(WIRE, OPERATION, bytes));
}
