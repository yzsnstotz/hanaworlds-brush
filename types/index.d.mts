import type { BuildDocumentRequest, BuildDocumentResponse, SetBox, MaterialMap, Effects, ContractHandshake } from '#contracts';
export type { BuildDocumentRequest, BuildDocumentResponse } from '#contracts';
export declare function compileBuildDocument(value: BuildDocumentRequest): BuildDocumentResponse;
export declare function compileBuildDocumentBytes(bytes: Uint8Array): BuildDocumentResponse;
/** Caller validates geometry/materials before using the low-level expander. */
export declare function expandEffects(operations: readonly SetBox[], materials: MaterialMap): Effects;
export declare const name: 'hanaworlds-brush';
export declare const version: '0.3.1';
export declare const serviceName: 'hanaworldsBrushV3';
export declare const provide: typeof serviceName;
export declare const inject: readonly [];
export declare const invariants: readonly string[];
export declare const contractHandshake: ContractHandshake;
export declare const hostCapabilities: readonly {readonly limitKind:'COMPILER_EFFECT_CELLS';readonly limit:number;readonly source:string;readonly sourceRevision:string}[];
export declare class BrushV3 {
 status(): {readonly component:typeof name;readonly version:typeof version;readonly input:'BUILD/V3';readonly output:'operations/v3';readonly contracts:string;readonly worldAccess:'NONE';readonly persistence:'NONE';readonly modelAccess:'NONE';readonly contractHandshake:ContractHandshake;readonly invariants:typeof invariants;readonly hostCapabilities:typeof hostCapabilities};
 handshake(): ContractHandshake;
 compile(request: BuildDocumentRequest): BuildDocumentResponse;
 compileBytes(bytes: Uint8Array): BuildDocumentResponse;
}
export declare function apply(ctx: {provide(name: typeof serviceName, service: BrushV3): void}): void;
declare const plugin: {name:typeof name;inject:typeof inject;provide:typeof provide;apply:typeof apply};
export default plugin;
