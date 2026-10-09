import plugin, {BrushV3,compileBuildDocument,compileBuildDocumentBytes,expandEffects, version, type BuildDocumentRequest, type BuildDocumentResponse} from 'hanaworlds-brush';
function consume(q:BuildDocumentRequest) {
 const out:BuildDocumentResponse=compileBuildDocument(q);
 const raw:BuildDocumentResponse=compileBuildDocumentBytes(new Uint8Array());
 const service=new BrushV3();service.compile(q);service.compileBytes(new Uint8Array());service.handshake();
 const input:'BUILD/V4'=service.status().input;
 const output:'operations/v3'=service.status().output;
 expandEffects(q.build.operations,q.build.materials);
 plugin.apply({provide(name,provided){const actual:BrushV3=provided;actual.compile(q);}});
 // @ts-expect-error old wire is not accepted
 compileBuildDocument({...q,contractVersion:'BUILD/V2'});
 return {out,raw,input,output};
}
void consume;

const packageVersion: "0.6.0" = version;
void packageVersion;

import {compileRegionBuild,compileRegionBuildBytes,protocolHandshake,type CompileRegionBuildRequest,type CompileRegionBuildResponse,type ProtocolHandshake} from 'hanaworlds-brush';
function consumeRegion(q:CompileRegionBuildRequest) {
 const out:CompileRegionBuildResponse=compileRegionBuild(q);
 if(out.result!==null){for(const c of out.result.projection.chunks){const edge:16=out.result.projection.chunkEdge;void c.block.runs;void edge;}}
 compileRegionBuildBytes(new Uint8Array());
 const service=new BrushV3();service.compileRegion(q);service.compileRegionBytes(new Uint8Array());
 const hs:ProtocolHandshake=service.protocolHandshake();const same:ProtocolHandshake=protocolHandshake;
 const regionInput:'region-build/v1'=service.status().region.input;
 // @ts-expect-error per-cell BUILD wire is not a region request
 compileRegionBuild({...q,contractVersion:'BUILD/V4'});
 return {out,hs,same,regionInput};
}
void consumeRegion;
