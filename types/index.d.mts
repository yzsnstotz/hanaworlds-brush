/** Type consumers install the admitted contracts tag as a direct devDependency. No value import is supported. */
import type { BuildDocumentRequest, BuildDocumentResponse, SetBox, MaterialMap, Effects, ContractHandshake, CompileRegionBuildRequest, CompileRegionBuildResponse, ProtocolHandshake, ProtocolDescriptor, GeometryProfile } from 'hanaworlds-contracts';
export type { BuildDocumentRequest, BuildDocumentResponse } from 'hanaworlds-contracts';
export declare function compileBuildDocument(value: BuildDocumentRequest): BuildDocumentResponse;
export declare function compileBuildDocumentBytes(bytes: Uint8Array): BuildDocumentResponse;
/** Caller validates geometry/materials before using the low-level expander. */
export declare function expandEffects(operations: readonly SetBox[], materials: MaterialMap): Effects;
export declare const name: 'hanaworlds-brush';
/** Read from package.json at load; provenance only. */
export declare const version: string;
/** Geometry profiles Brush expands; any other profile in a request is CAPABILITY_GAP. */
export declare const geometryProfiles: readonly GeometryProfile[];
export declare const serviceName: 'hanaworldsBrushV3';
export declare const provide: typeof serviceName;
export declare const inject: readonly [];
export declare const invariants: readonly string[];
export declare const contractHandshake: ContractHandshake;
export declare const hostCapabilities: readonly {readonly limitKind:'COMPILER_EFFECT_CELLS';readonly limit:number;readonly source:string;readonly sourceRevision:string}[];
export declare class BrushV3 {
 status(): {readonly component:typeof name;readonly version:typeof version;readonly input:'BUILD/V5';readonly output:'operations/v4';readonly geometryProfiles:typeof geometryProfiles;readonly contracts:string;readonly worldAccess:'NONE';readonly persistence:'NONE';readonly modelAccess:'NONE';readonly contractHandshake:ContractHandshake;readonly invariants:typeof invariants;readonly hostCapabilities:typeof hostCapabilities;readonly region:{readonly input:'region-build/v2';readonly output:'region-operations/v2';readonly partition:'REQUEST'};readonly protocolHandshake:ProtocolHandshake};
 handshake(): ContractHandshake;
 compile(request: BuildDocumentRequest): BuildDocumentResponse;
 compileBytes(bytes: Uint8Array): BuildDocumentResponse;
 protocolHandshake(): ProtocolHandshake;
 compileRegion(request: CompileRegionBuildRequest): CompileRegionBuildResponse;
 compileRegionBytes(bytes: Uint8Array): CompileRegionBuildResponse;
}
export declare function apply(ctx: {provide(name: typeof serviceName, service: BrushV3): void}): void;
declare const plugin: {name:typeof name;inject:typeof inject;provide:typeof provide;apply:typeof apply};
export default plugin;
/** region-build/v2 CompileRegionBuild: region-operations/v2 chunks cut along the request partition. */
export type { CompileRegionBuildRequest, CompileRegionBuildResponse, ProtocolHandshake } from 'hanaworlds-contracts';
export declare function compileRegionBuild(request: CompileRegionBuildRequest): CompileRegionBuildResponse;
export declare function compileRegionBuildBytes(bytes: Uint8Array): CompileRegionBuildResponse;
export declare const protocolHandshake: ProtocolHandshake;
export declare const brushProtocols: readonly ProtocolDescriptor[];
export declare const brushCapabilities: readonly ['BUILD/V5:per-cell-compile','region-build/v2:compile-partition-chunks'];
