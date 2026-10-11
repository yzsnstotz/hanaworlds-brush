import plugin, {BrushV3,compileBuildDocument,compileBuildDocumentBytes,expandEffects, version, geometryProfiles, type BuildDocumentRequest, type BuildDocumentResponse} from 'hanaworlds-brush';
function consume(q:BuildDocumentRequest) {
 const out:BuildDocumentResponse=compileBuildDocument(q);
 const raw:BuildDocumentResponse=compileBuildDocumentBytes(new Uint8Array());
 const service=new BrushV3();service.compile(q);service.compileBytes(new Uint8Array());service.handshake();
 const input:'BUILD/V5'=service.status().input;
 const output:'operations/v4'=service.status().output;
 expandEffects(q.build.operations,q.build.materials);
 plugin.apply({provide(name,provided){const actual:BrushV3=provided;actual.compile(q);}});
 // @ts-expect-error old wire is not accepted
 compileBuildDocument({...q,contractVersion:'BUILD/V4'});
 return {out,raw,input,output};
}
void consume;

const packageVersion: string = version;
const profiles: readonly 'voxel-grid/v1'[] = geometryProfiles;
void packageVersion; void profiles;

import {compileRegionBuild,compileRegionBuildBytes,protocolHandshake,brushCapabilities,type CompileRegionBuildRequest,type CompileRegionBuildResponse,type ProtocolHandshake} from 'hanaworlds-brush';
function consumeRegion(q:CompileRegionBuildRequest) {
 const edge:readonly [number,number,number]=q.partition.edge;
 const emptyMaterialRef:string=q.catalogue.emptyMaterialRef;
 const capability:'region-build/v2:compile-partition-chunks'=brushCapabilities[1];
 compileRegionBuild({...q,partition:{edge:[2,3,4]}});
 const {partition,...withoutPartition}=q;
 // @ts-expect-error a world-source partition is required; there is no implicit edge
 compileRegionBuild(withoutPartition);
 // @ts-expect-error partition edges are a per-axis tuple, not an engine chunkEdge
 compileRegionBuild({...q,partition:{edge:16}});
 const out:CompileRegionBuildResponse=compileRegionBuild(q);
 if(out.result!==null){for(const c of out.result.projection.chunks){const edge:readonly number[]=out.result.projection.partition.edge;void c.block.runs;void edge;}}
 compileRegionBuildBytes(new Uint8Array());
 const service=new BrushV3();service.compileRegion(q);service.compileRegionBytes(new Uint8Array());
 const hs:ProtocolHandshake=service.protocolHandshake();const same:ProtocolHandshake=protocolHandshake;
 const regionInput:'region-build/v2'=service.status().region.input;
 // @ts-expect-error per-cell BUILD wire is not a region request
 compileRegionBuild({...q,contractVersion:'BUILD/V5'});
 return {out,hs,same,regionInput,edge,emptyMaterialRef,capability,partition};
}
void consumeRegion;
