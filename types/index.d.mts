import type { BuildDocumentRequest, BuildDocumentResponse, SetBox, MaterialMap, Effects, ContractHandshake, Catalogue, LocalWorldContext, NodeSpec, Position, Error as PublicError } from '#contracts';
export type { BuildDocumentRequest, BuildDocumentResponse } from '#contracts';
export declare function compileBuildDocument(value: BuildDocumentRequest): BuildDocumentResponse;
export declare function compileBuildDocumentBytes(bytes: Uint8Array): BuildDocumentResponse;
/** Caller validates geometry/materials before using the low-level expander. */
export declare function expandEffects(operations: readonly SetBox[], materials: MaterialMap): Effects;
export declare const name: 'hanaworlds-brush';
export declare const version: '0.4.0';
export declare const serviceName: 'hanaworldsBrushV3';
export declare const provide: typeof serviceName;
export declare const inject: readonly [];
export declare const invariants: readonly string[];
export declare const contractHandshake: ContractHandshake;
export declare const hostCapabilities: readonly {readonly limitKind:'COMPILER_EFFECT_CELLS';readonly limit:number;readonly source:string;readonly sourceRevision:string}[];
export declare class BrushV3 {
 status(): {readonly component:typeof name;readonly version:typeof version;readonly input:'BUILD/V3';readonly output:'operations/v3';readonly contracts:string;readonly worldAccess:'NONE';readonly persistence:'NONE';readonly modelAccess:'NONE';readonly contractHandshake:ContractHandshake;readonly invariants:typeof invariants;readonly hostCapabilities:typeof hostCapabilities;readonly region:{readonly input:'REGION/V1';readonly output:'region-chunks/v1';readonly protocol:RegionProtocol;readonly capabilities:readonly string[];readonly boundary:string}};
 handshake(): ContractHandshake;
 compile(request: BuildDocumentRequest): BuildDocumentResponse;
 compileBytes(bytes: Uint8Array): BuildDocumentResponse;
 regionProtocol(protocol: RegionProtocol, requiredCapabilities?: readonly string[]): ReturnType<typeof checkRegionProtocol>;
 compileRegion(request: RegionCompileRequest): RegionCompileResponse;
}
export declare function apply(ctx: {provide(name: typeof serviceName, service: BrushV3): void}): void;
declare const plugin: {name:typeof name;inject:typeof inject;provide:typeof provide;apply:typeof apply};
export default plugin;
/** FIXTURE shape pending contracts region v1. -1 = unspecified (untouched, never air). */
export type RegionCells = readonly number[] | {readonly encoding:'rle';readonly runs:readonly (readonly [number,number])[]};
export interface RegionProtocol {readonly name:'hanaworlds-region';readonly major:number;readonly minor:number}
export interface RegionCompileRequest {
 readonly contractVersion:'REGION/V1';readonly requestId:string;readonly protocol:RegionProtocol;readonly requiredCapabilities:readonly string[];
 readonly worldRef:string;readonly localContext:LocalWorldContext;readonly catalogue:Catalogue;
 readonly region:{readonly profileVersion:'region-voxel/v1';readonly origin:Position;readonly size:readonly [number,number,number];readonly axisOrder:'x,y,z';readonly palette:readonly NodeSpec[];readonly cells:RegionCells};
}
export interface RegionChunk {
 readonly profileVersion:'region-chunks/v1';readonly worldRef:string;readonly chunkPos:Position;readonly min:Position;readonly edge:16;readonly axisOrder:'x,y,z';
 readonly palette:readonly NodeSpec[];readonly cells:{readonly encoding:'rle';readonly runs:readonly (readonly [number,number])[]};
 readonly specifiedCells:number;readonly airCells:number;readonly chunkDigest:string;
}
export interface RegionCompileResult {
 readonly profileVersion:'region-chunks/v1';readonly worldRef:string;readonly catalogueDigest:string;readonly sourceRegionDigest:string;
 readonly regionBounds:{readonly min:Position;readonly max:Position};readonly chunkDigests:readonly (readonly [Position,string])[];
 readonly specifiedCells:number;readonly airCells:number;readonly compiledDigest:string;readonly chunks:readonly RegionChunk[];
}
export type RegionCompileResponse = {readonly contractVersion:'REGION/V1';readonly requestId:string}&({readonly result:RegionCompileResult;readonly error:null}|{readonly result:null;readonly error:PublicError});
export declare function compileRegion(request: RegionCompileRequest): RegionCompileResponse;
export declare function checkRegionProtocol(protocol: RegionProtocol, requiredCapabilities?: readonly string[]): {readonly result:'REGION_PROTOCOL_COMPATIBLE';readonly speaks:RegionProtocol;readonly requested:RegionProtocol};
export declare function chunkCells(chunk: RegionChunk): {position:Position;nodeName:string;param2:number}[];
export declare const regionProtocol: RegionProtocol;
export declare const regionCapabilities: readonly string[];
export declare const UNSPECIFIED: -1;
export declare const CHUNK_EDGE: 16;
export declare const AXIS_ORDER: 'x,y,z';
export declare const REGION_FIXTURE: string;
