// Pure current BUILD/V5 compiler plus region voxel block compiler. Canvas owns all transaction decisions.
import { version as contractsVersion, contractHandshake } from './contracts.mjs';
import pkg from '../package.json' with { type: 'json' };
import { geometryProfiles } from './admit.mjs';
import { compileBuildDocument, compileBuildDocumentBytes, hostCapabilities } from './compile.mjs';
export { compileBuildDocument, compileBuildDocumentBytes, hostCapabilities };
export { expandEffects } from './expand.mjs';
import { compileRegionBuild, compileRegionBuildBytes, brushProtocols, brushCapabilities } from './region.mjs';
export { compileRegionBuild, compileRegionBuildBytes, brushProtocols, brushCapabilities };
export { contractHandshake, geometryProfiles };
export const name = pkg.name;
/** Package identity is package.json; it is provenance, never a compatibility input. */
export const version = pkg.version;
export const serviceName = 'hanaworldsBrushV3';
/** protocol-handshake/v1: consumers decide compatibility by protocol major + capabilities. */
export const protocolHandshake = Object.freeze({ profileVersion:'protocol-handshake/v1', component:name, protocols:brushProtocols,
 capabilities:brushCapabilities, provenance:Object.freeze({ packageName:name, packageVersion:version, sourceRevision:null, artifactDigest:null }) });
export const invariants = Object.freeze([
 'PURE_COMPILER: no world connection, read/write, persistence, model access, clock or randomness',
 `STRICT_ADMISSION: contracts@${contractsVersion} strict raw UTF-8/duplicate-key/pure JSON and complete BUILD/V5 and region-build/v2 schemas`,
 'GEOMETRY_PROFILE: only voxel-grid/v1 builds, target facts and region blocks are expanded; any other profile is CAPABILITY_GAP/GEOMETRY_PROFILE_UNSUPPORTED before the schema',
 'DIGEST_BINDING: build, catalogue, frame, target facts, safety and compilation config bind their exact payloads',
 'IDENTITY_BINDING: request localContext names its world; observed facts name that world; PLANNED facts name a preceding build',
 'EXACT_GEOMETRY: exact union bounds, last writer wins, one effect per cell, numeric x/y/z order, no rounding or cropping',
 'STATIC_MATERIALS: materialRef in the request catalogue, placeable with a known definition revision, orientation among its declared orientations; materialRef and orientation pass through opaque',
 'KNOWN_TARGET_CELLS: unknown or unsampled cells are never treated as empty',
 'WITNESS_RECOMPUTE: coverage, body clearance and hazard witnesses checked against exact effects',
 'ZERO_OUTPUT_REJECTION: any failure produces no operations',
 'REGION_PURE: region-voxels/v2 build compiles to region-operations/v2 chunks cut along the request partition (from the world source) with contracts canonical encoding and digest; no world access',
 'EXPLICIT_CARVE: only an explicit palette entry of the request catalogue emptyMaterialRef carves; UNSPECIFIED (null) stays UNSPECIFIED and is never empty',
 'REGION_SELF_CHECK: every region result passes the public validateCompiledRegionSet exact equivalence before it is returned',
 'PROTOCOL_MAJOR: advertised protocol-handshake/v1 lets consumers decide by protocol major + capabilities; package version/hash are provenance only',
]);
export class BrushV3 {
 status() { return Object.freeze({ component:name, version, input:'BUILD/V5', output:'operations/v4', geometryProfiles,
  contracts:`hanaworlds-contracts@${contractsVersion}`, worldAccess:'NONE', persistence:'NONE', modelAccess:'NONE',
  contractHandshake, invariants, hostCapabilities,
  region: { input:'region-build/v2', output:'region-operations/v2', partition:'REQUEST' }, protocolHandshake }); }
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
