import plugin, {BrushV3,compileBuildDocument,compileBuildDocumentBytes,expandEffects, type BuildDocumentRequest, type BuildDocumentResponse} from 'hanaworlds-brush';
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
