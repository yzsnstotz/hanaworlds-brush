// Pure current BUILD/V3 compiler. Canvas owns all transaction decisions.
import { version as contractsVersion, contractHandshake } from '#contracts';
import { compileBuildDocument, compileBuildDocumentBytes, hostCapabilities } from './compile.mjs';
export { compileBuildDocument, compileBuildDocumentBytes, hostCapabilities };
export { expandEffects } from './expand.mjs';
export { contractHandshake };
export const name = 'hanaworlds-brush';
export const version = '0.3.1';
export const serviceName = 'hanaworldsBrushV3';
export const invariants = Object.freeze([
 'PURE_COMPILER: no world connection, read/write, persistence, model access, clock or randomness',
 'STRICT_ADMISSION: contracts@0.4.2 strict raw UTF-8/duplicate-key/pure JSON and complete BUILD/V3 schema',
 'DIGEST_BINDING: build, catalogue, frame, target facts, safety and compilation config bind their exact payloads',
 'IDENTITY_BINDING: request localContext names its world; observed facts name that world; PLANNED facts name a preceding build',
 'EXACT_GEOMETRY: exact union bounds, last writer wins, one effect per cell, numeric x/y/z order, no rounding or cropping',
 'STATIC_MATERIALS: exact catalogue node, allowed param2, definition revision, no callbacks or persistent state',
 'KNOWN_TARGET_CELLS: unknown or unsampled cells are never air',
 'WITNESS_RECOMPUTE: coverage, body clearance and hazard witnesses checked against exact effects',
 'ZERO_OUTPUT_REJECTION: any failure produces no operations',
]);
export class BrushV3 {
 status() { return Object.freeze({ component:name, version, input:'BUILD/V3', output:'operations/v3',
  contracts:`hanaworlds-contracts@${contractsVersion}`, worldAccess:'NONE', persistence:'NONE', modelAccess:'NONE',
  contractHandshake, invariants, hostCapabilities }); }
 handshake() { return contractHandshake; }
 compile(request) { return compileBuildDocument(request); }
 compileBytes(bytes) { return compileBuildDocumentBytes(bytes); }
}
export const inject = [];
export const provide = serviceName;
export function apply(ctx) { ctx.provide(serviceName, new BrushV3()); }
export default { name, inject, provide, apply };
