import plugin, {BrushV3,compileBuildDocument,compileBuildDocumentBytes,expandEffects, version, type BuildDocumentRequest, type BuildDocumentResponse} from 'hanaworlds-brush';
function consume(q:BuildDocumentRequest) {
 const out:BuildDocumentResponse=compileBuildDocument(q);
 const raw:BuildDocumentResponse=compileBuildDocumentBytes(new Uint8Array());
 const service=new BrushV3();service.compile(q);service.compileBytes(new Uint8Array());service.handshake();
 const input:'BUILD/V3'=service.status().input;
 const output:'operations/v3'=service.status().output;
 expandEffects(q.build.operations,q.build.materials);
 plugin.apply({provide(name,provided){const actual:BrushV3=provided;actual.compile(q);}});
 // @ts-expect-error old wire is not accepted
 compileBuildDocument({...q,contractVersion:'BUILD/V2'});
 return {out,raw,input,output};
}
void consume;

const packageVersion: "0.4.0" = version;
void packageVersion;

import {compileRegion,checkRegionProtocol,chunkCells,UNSPECIFIED,type RegionCompileRequest,type RegionCompileResponse} from 'hanaworlds-brush';
function consumeRegion(q:RegionCompileRequest) {
 const out:RegionCompileResponse=compileRegion(q);
 if(out.error===null){for(const c of out.result.chunks){const d:string=c.chunkDigest;chunkCells(c);void d;}}
 const service=new BrushV3();service.compileRegion(q);service.regionProtocol({name:'hanaworlds-region',major:1,minor:0});
 checkRegionProtocol({name:'hanaworlds-region',major:1,minor:3},['explicit-air-dig']);
 const unspecified:-1=UNSPECIFIED;
 const regionInput:'REGION/V1'=service.status().region.input;
 // @ts-expect-error per-cell BUILD wire is not a region request
 compileRegion({...q,contractVersion:'BUILD/V3'});
 return {out,unspecified,regionInput};
}
void consumeRegion;
