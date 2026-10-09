// Pure current BUILD/V3 compiler plus region voxel block compiler. Canvas owns all transaction decisions.
import { version as contractsVersion, contractHandshake } from '#contracts';
import { compileBuildDocument, compileBuildDocumentBytes, hostCapabilities } from './compile.mjs';
export { compileBuildDocument, compileBuildDocumentBytes, hostCapabilities };
export { expandEffects } from './expand.mjs';
import { compileRegionBuild, compileRegionBuildBytes, brushProtocols, brushCapabilities } from './region.mjs';
export { compileRegionBuild, compileRegionBuildBytes, brushProtocols, brushCapabilities };
export { contractHandshake };
export const name = 'hanaworlds-brush';
export const version = '0.5.3';
export const serviceName = 'hanaworldsBrushV3';
/** protocol-handshake/v1: consumers decide compatibility by protocol major + capabilities. */
export const protocolHandshake = Object.freeze({ profileVersion:'protocol-handshake/v1', component:name, protocols:brushProtocols,
 capabilities:brushCapabilities, provenance:Object.freeze({ packageName:name, packageVersion:version, sourceRevision:null, artifactDigest:null }) });
export const invariants = Object.freeze([
 'PURE_COMPILER: no world connection, read/write, persistence, model access, clock or randomness',
 `STRICT_ADMISSION: contracts@${contractsVersion} strict raw UTF-8/duplicate-key/pure JSON and complete BUILD/V3 and region-build/v1 schemas`,
 'DIGEST_BINDING: build, catalogue, frame, target facts, safety and compilation config bind their exact payloads',
 'IDENTITY_BINDING: request localContext names its world; observed facts name that world; PLANNED facts name a preceding build',
 'EXACT_GEOMETRY: exact union bounds, last writer wins, one effect per cell, numeric x/y/z order, no rounding or cropping',
 'STATIC_MATERIALS: exact catalogue node, allowed param2, definition revision, no callbacks or persistent state',
 'KNOWN_TARGET_CELLS: unknown or unsampled cells are never air',
 'WITNESS_RECOMPUTE: coverage, body clearance and hazard witnesses checked against exact effects',
 'ZERO_OUTPUT_REJECTION: any failure produces no operations',
 'REGION_PURE: region-voxels/v1 build compiles to mapblock-aligned region-operations/v1 chunks with contracts canonical encoding and digest; no world access',
 'EXPLICIT_CARVE: only an explicit {air,0} palette entry carves; UNSPECIFIED (null) stays UNSPECIFIED and is never air',
 'REGION_SELF_CHECK: every region result passes the public validateCompiledRegionSet exact equivalence before it is returned',
 'PROTOCOL_MAJOR: advertised protocol-handshake/v1 lets consumers decide by protocol major + capabilities; package version/hash are provenance only',
]);
export class BrushV3 {
 status() { return Object.freeze({ component:name, version, input:'BUILD/V3', output:'operations/v3',
  contracts:`hanaworlds-contracts@${contractsVersion}`, worldAccess:'NONE', persistence:'NONE', modelAccess:'NONE',
  contractHandshake, invariants, hostCapabilities,
  region: { input:'region-build/v1', output:'region-operations/v1', chunkEdge:16 }, protocolHandshake }); }
 handshake() { return contractHandshake; }
 compile(request) { return compileBuildDocument(request); }
 compileBytes(bytes) { return compileBuildDocumentBytes(bytes); }
 protocolHandshake() { return protocolHandshake; }
 compileRegion(request) { return compileRegionBuild(request); }
 compileRegionBytes(bytes) { return compileRegionBuildBytes(bytes); }
}
export const inject = [];
export const provide = serviceName;
export function apply(ctx) { ctx.provide(serviceName, new BrushV3()); }
export default { name, inject, provide, apply };
