// HanaWorlds Brush 0.2.0 — DSH (Cordis) plugin and public service.
//
// Brush is a pure compiler: admitted BUILD/V2 in, canonical operations/v2 and
// its stable digest out, or a typed zero-output rejection. It never connects
// to a world, writes a world, persists, calls a model or chooses a target.
// Canvas independently authorizes and applies compiled operations.

import { version as contractsVersion, contractHandshake } from '#contracts';
import { compileBuildDocument, compileBuildDocumentBytes, hostCapabilities } from './compile.mjs';

export { compileBuildDocument, compileBuildDocumentBytes, hostCapabilities };
export { expandEffects } from './expand.mjs';

export const name = 'hanaworlds-brush';
export const version = '0.2.0';
export const serviceName = 'hanaworldsBrushV2';

/**
 * ContractHandshake this provider advertises before any request: exactly the
 * admitted contracts@0.3.0 set (wire majors, operations/v2 and the fact
 * profiles target-facts/v2 + target-facts/v3). A consumer checks it with
 * contracts `checkContractHandshake`; a contracts@0.2.1 peer advertises
 * target-facts/v2 and the older wire majors only, so a 0.3.0 consumer that
 * requires target-facts/v3 (or a v3/v4 wire) fails with
 * UNSUPPORTED_VERSION/decode before a request is sent.
 */
export { contractHandshake };

/**
 * Correctness invariants. They are not switchable policies; they are listed
 * here so the host management interface can show them with their reasons.
 */
export const invariants = Object.freeze([
  'PURE_COMPILER: no world connection, world read/write, persistence, model access, clock or randomness',
  'STRICT_ADMISSION: contracts@0.3.0 raw UTF-8/duplicate-key/pure-JSON decode and complete BUILD/V2 schema before any compile step',
  'DIGEST_BINDING: build, catalogue, target-facts, safety-profile and compilation-config digests must match their payloads',
  'IDENTITY_BINDING: target facts must name the same catalogue and coordinate frame; INSPECTED and REGION_INSPECTED facts must name the request world; only PLANNED facts describe a preceding plan',
  'EXACT_GEOMETRY: declaredBounds equals the exact union bounds; last-writer-wins; one effect per cell; numeric x,y,z order; no rounding, cropping or compression',
  'STATIC_MATERIALS: every material resolves to an exact catalogue node with allowed param2, a definition revision, no callbacks and no persistent state',
  'KNOWN_TARGET_CELLS: every written cell is a known occupied or known empty target fact; unknown or unsampled is never treated as air',
  'WITNESS_RECOMPUTE: safety witnesses are rechecked against the exact final effects; this is coherence, not authorization',
  'ZERO_OUTPUT_REJECTION: any failure returns no operations',
]);

export class BrushV2 {
  status() {
    return Object.freeze({
      component: name, version, input: 'BUILD/V2', output: 'operations/v2',
      contracts: `hanaworlds-contracts@${contractsVersion}`,
      worldAccess: 'NONE', persistence: 'NONE', modelAccess: 'NONE',
      contractHandshake, invariants, hostCapabilities,
    });
  }
  /** The ContractHandshake this provider advertises (contracts@0.3.0). */
  handshake() { return contractHandshake; }
  /** Compile a BuildDocumentRequest value; see compileBuildDocument. */
  compile(request) { return compileBuildDocument(request); }
  /** Compile raw UTF-8 BuildDocumentRequest bytes; see compileBuildDocumentBytes. */
  compileBytes(bytes) { return compileBuildDocumentBytes(bytes); }
}

export const inject = [];
export const provide = serviceName;
export function apply(ctx) {
  ctx.provide(serviceName, new BrushV2());
}
export default { name, inject, provide, apply };
