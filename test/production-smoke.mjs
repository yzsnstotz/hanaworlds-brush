// Copied into a fresh consumer. No imports/paths back to the development tree.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const data=JSON.parse(readFileSync(new URL('./inputs.json',import.meta.url)));
for(const entry of data.entries) {
 const mod=await import(entry.specifier,{with:entry.file.endsWith('.json')?{type:'json'}:{}});
 assert.ok(mod);
}
const b=await import('hanaworlds-brush');
for(const name of ['hanaworlds-contracts','hanaworlds-contracts/schema','hanaworlds-contracts/fixtures/main','#contracts'])
 assert.throws(()=>import.meta.resolve(name),e=>['ERR_MODULE_NOT_FOUND','ERR_PACKAGE_IMPORT_NOT_DEFINED'].includes(e.code));
const json=x=>JSON.stringify(x),bytes=x=>new TextEncoder().encode(json(x));
const provided=[];b.default.apply({provide:(...v)=>provided.push(v)});
assert.equal(provided.length,1);assert.equal(provided[0][0],b.serviceName);
const service=provided[0][1];
for(const compile of [b.compileBuildDocument,service.compile.bind(service)]) {
 const out=compile(data.build);assert.equal(json(out),json(data.buildResponse));
 assert.deepEqual(JSON.parse(json(out.result.projection.effects)),[{geometryProfile:'voxel-grid/v1',position:[0,1,3],materialRef:'fixture:stone',orientation:0}]);
 const bad=structuredClone(data.build);bad.buildDigest='0'.repeat(64);
 const rejected=compile(bad);assert.equal(rejected.result,null);assert.equal(rejected.error.code,'NON_CANONICAL_AMBIGUITY');assert.equal(rejected.error.mutationState,'NONE');
}
assert.equal(json(b.compileBuildDocumentBytes(bytes(data.build))),json(data.buildResponse));
assert.equal(json(service.compileBytes(bytes(data.build))),json(data.buildResponse));
for(const compile of [b.compileRegionBuild,service.compileRegion.bind(service)]) {
 assert.equal(json(compile(data.region)),json(data.regionResponse));
 const bad=structuredClone(data.region);delete bad.partition;
 const out=compile(bad);assert.equal(out.result,null);assert.equal(out.error.code,'SCHEMA_INVALID');assert.equal(out.error.mutationState,'NONE');
 const gap=structuredClone(data.region);gap.build.block.geometryProfile='hex-grid/v1';
 const refused=compile(gap);assert.equal(refused.result,null);assert.equal(refused.error.code,'CAPABILITY_GAP');
}
assert.equal(json(b.compileRegionBuildBytes(bytes(data.region))),json(data.regionResponse));
assert.equal(json(service.compileRegionBytes(bytes(data.region))),json(data.regionResponse));
for(const output of [b.compileRegionBuild(data.customRegion),b.compileRegionBuildBytes(bytes(data.customRegion)),service.compileRegion(data.customRegion),service.compileRegionBytes(bytes(data.customRegion))]) {
 assert.equal(json(output),json(data.customResponse));
 assert.equal(json(output.result.projection.partition),json({edge:[2,3,4]}));
 const written=new Map();
 for(const chunk of output.result.projection.chunks) {
  const block=chunk.block,[sx,sy]=block.size;let i=0;
  for(const [count,paletteIndex] of block.runs)for(let n=0;n<count;n++,i++) {
   if(paletteIndex===null)continue;
   const position=[block.origin[0]+i%sx,block.origin[1]+Math.floor(i/sx)%sy,block.origin[2]+Math.floor(i/(sx*sy))];
   const key=json(position);assert.ok(!written.has(key),'duplicate written cell');
   written.set(key,json({...block.palette[paletteIndex]}));
  }
 }
 assert.deepEqual(written,new Map(data.customExpected.map(({position,...material})=>[json(position),json(material)])));
 assert.ok([...written.values()].some(x=>x.includes('source:empty-03')));
}
assert.throws(()=>b.compileBuildDocumentBytes(new TextEncoder().encode('{"x":1,"x":2}')),e=>e.code==='NON_CANONICAL_AMBIGUITY'&&e.reason==='DUPLICATE_DECODED_KEY'&&e.publicError.mutationState==='NONE');
let calls=0;const proxy=new Proxy(data.build,{get(){calls++;}});
assert.throws(()=>b.compileBuildDocument(proxy),e=>e.code==='SCHEMA_INVALID'&&e.publicError.mutationState==='NONE');assert.equal(calls,0);
assert.deepEqual(b.expandEffects([{op:'set_box',min:[-1,0,0],max:[0,0,0],materialRef:'x'}],{x:{materialRef:'opaque:external',orientation:23}}),[-1,0].map(x=>({geometryProfile:'voxel-grid/v1',position:[x,0,0],materialRef:'opaque:external',orientation:23})));
assert.deepEqual(service.protocolHandshake().capabilities,['BUILD/V5:per-cell-compile','region-build/v2:compile-partition-chunks']);
assert.deepEqual(service.protocolHandshake().protocols,[{protocol:'BUILD',major:5,minor:0},{protocol:'region-build',major:2,minor:1}]);
for(const key of ['worldAccess','persistence','modelAccess'])assert.equal(service.status()[key],'NONE');
console.log(JSON.stringify({production:'PASS',publicEntries:data.entries.map(x=>x.specifier),build:'operations/v4',region:'region-operations/v2',rawValueServiceErrors:'PASS',runtimeContracts:'ABSENT',worldAccess:'NONE'}));
