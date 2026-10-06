// region-build/v1 CompileRegionBuild through the public entry only (source, or
// the installed package via BRUSH_UNDER_TEST). Requests are built from the
// admitted contracts@0.5.0 public region fixture and public helpers; catalogue
// and world context are that SOURCE/FIXTURE. No world, model, Painter or other
// peer is involved.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const entry=import.meta.resolve(process.env.BRUSH_UNDER_TEST ?? '../src/index.mjs');
const brush=await import(entry);
const c=await import(new URL('../vendor/hanaworlds-contracts/dist/local/index.mjs',entry));
const fixture=JSON.parse(readFileSync(new URL('../vendor/hanaworlds-contracts/fixtures/local/region.json',entry)));
const AIR={nodeName:'air',param2:0},DIRT={nodeName:'fixture:dirt',param2:0},STONE={nodeName:'fixture:stone',param2:0};
const D=(kind,v)=>c.digestValue(kind,v).sha256;
const json=v=>JSON.stringify(v);
/** Request for an arbitrary block over the public fixture session/world/catalogue. */
function request(origin,size,palette,indices,requestId='brush-region-test'){
 const block=c.encodeRegionBlock({origin,size,palette,indices});
 const build={...fixture.compileRequest.build,block,declaredBounds:c.regionBlockBox(block)};
 return {...fixture.compileRequest,requestId,build,buildDigest:D('region-build',build)};
}
/** Independent oracle: declared cells in x-fastest order; -1 is UNSPECIFIED. */
function oracle(origin,size,palette,indices){const m=new Map();let i=0;
 for(let z=0;z<size[2];z++)for(let y=0;y<size[1];y++)for(let x=0;x<size[0];x++,i++)
  if(indices[i]!==-1)m.set(json([origin[0]+x,origin[1]+y,origin[2]+z]),json(palette[indices[i]]));return m;}
/** Read back what the compiled chunks would write, cell by cell. */
function readback(out){const m=new Map();
 for(const ch of out.result.projection.chunks){const e=c.expandRegionBlock(ch.block);const [sx,sy]=e.size;
  for(let i=0;i<e.indices.length;i++){if(e.indices[i]===-1)continue;
   const p=[e.box.min[0]+i%sx,e.box.min[1]+Math.floor(i/sx)%sy,e.box.min[2]+Math.floor(i/(sx*sy))];
   assert.ok(!m.has(json(p)),'cell emitted twice');m.set(json(p),json(e.palette[e.indices[i]]));}}return m;}
const rejects=(q,code)=>{const out=brush.compileRegionBuild(q);assert.equal(out.result,null);assert.equal(out.error.code,code,json(out.error));assert.equal(out.error.mutationState,'NONE');return out;};

test('public contracts fixture: compile reproduces the published region-operations byte-for-byte via library, raw bytes and Cordis',()=>{
 const out=brush.compileRegionBuild(fixture.compileRequest);
 assert.equal(out.error,null);
 assert.equal(json(out),json(fixture.compileResponse));
 c.validateCompiledRegionSet(fixture.compileRequest,out);
 assert.equal(json(brush.compileRegionBuildBytes(new TextEncoder().encode(json(fixture.compileRequest)))),json(out));
 const provided=[];brush.apply({provide:(...a)=>provided.push(a)});
 assert.equal(provided[0][0],'hanaworldsBrushV3');
 assert.equal(json(provided[0][1].compileRegion(fixture.compileRequest)),json(out));
 assert.equal(json(brush.compileRegionBuild(structuredClone(fixture.compileRequest))),json(out));
});

test('fill: every specified cell reads back exactly once with its node; repeat compile is identical and input unchanged',()=>{
 const indices=new Array(3*2*2).fill(1),q=request([0,1,3],[3,2,2],[AIR,STONE],indices);
 const before=json(q),a=brush.compileRegionBuild(q),b=brush.compileRegionBuild(structuredClone(q));
 assert.equal(a.error,null);assert.equal(json(a),json(b));assert.equal(json(q),before);
 assert.deepEqual(readback(a),oracle([0,1,3],[3,2,2],[AIR,STONE],indices));
 assert.equal(a.result.projection.chunks.length,1);
 assert.equal(json(a.result.projection.chunks[0].block.palette),json([STONE]));
 assert.equal(json(a.result.writeBounds),json({min:[0,1,3],max:[2,2,4]}));
 assert.equal(a.result.operationDigest,D('region-operations',a.result.projection));
});

test('carve: only explicit air carves, UNSPECIFIED stays UNSPECIFIED, an all-UNSPECIFIED mapblock emits no chunk',()=>{
 // 18 wide: x 0..15 in mapblock 0, x 16..17 in mapblock 1; mapblock 1 is entirely unspecified.
 const size=[18,1,1],indices=Array.from({length:18},(_,x)=>x>=16?-1:x%3===0?0:x%3===1?1:-1);
 const out=brush.compileRegionBuild(request([0,0,0],size,[AIR,STONE],indices));
 assert.equal(out.error,null);
 assert.equal(json(out.result.projection.chunks.map(ch=>ch.chunkPos)),json([[0,0,0]]));
 const got=readback(out);assert.deepEqual(got,oracle([0,0,0],size,[AIR,STONE],indices));
 assert.equal([...got.values()].filter(v=>v===json(AIR)).length,6);
 for(let x=0;x<18;x++) if(indices[x]===-1) assert.ok(!got.has(json([x,0,0])),`unspecified ${x} emitted`);
 // Carve and unspecified are not conflated: turning the carves into UNSPECIFIED changes the operations.
 const noCarve=brush.compileRegionBuild(request([0,0,0],size,[AIR,STONE],indices.map(v=>v===0?-1:v)));
 assert.notEqual(noCarve.result.operationDigest,out.result.operationDigest);
 assert.ok(![...readback(noCarve).values()].includes(json(AIR)));
 assert.equal(json(out.result.writeBounds),json({min:[0,0,0],max:[15,0,0]}));
});

test('cross-mapblock with negative coordinates: ascending mapblock order, chunks inside their mapblock, exact readback',()=>{
 const origin=[-20,-3,5],size=[40,20,30],n=size[0]*size[1]*size[2];
 let s=7;const indices=Array.from({length:n},()=>{s=(s*1103515245+12345)%2147483648;const r=s%7;return r<2?-1:r<3?0:r<5?1:2;});
 const out=brush.compileRegionBuild(request(origin,size,[AIR,DIRT,STONE],indices));
 assert.equal(out.error,null);
 const pos=out.result.projection.chunks.map(ch=>ch.chunkPos);
 assert.equal(json(pos),json([...pos].sort((a,b)=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2])));
 assert.equal(pos.length,4*3*3); // x -20..19 → mapblocks -2..1, y -3..16 → -1..1, z 5..34 → 0..2
 for(const ch of out.result.projection.chunks){const box=c.regionBlockBox(ch.block);
  box.min.forEach((v,a)=>assert.ok(v>=ch.chunkPos[a]*16&&box.max[a]<ch.chunkPos[a]*16+16));}
 assert.deepEqual(readback(out),oracle(origin,size,[AIR,DIRT,STONE],indices));
});

test('per-cell BUILD/V3 path and region path are both advertised; Brush stays pure',()=>{
 const s=new brush.BrushV3().status();
 assert.equal(s.input,'BUILD/V3');assert.equal(s.output,'operations/v3');
 assert.equal(s.region.input,'region-build/v1');assert.equal(s.region.output,'region-operations/v1');
 assert.equal(s.worldAccess,'NONE');assert.equal(s.persistence,'NONE');assert.equal(s.modelAccess,'NONE');
 assert.equal(typeof brush.compileBuildDocument,'function');assert.equal(typeof brush.expandEffects,'function');
 assert.deepEqual([...brush.protocolHandshake.capabilities].map(String),['BUILD/V3:per-cell-compile','region-build/v1:compile-mapblock-chunks']);
});

test('protocol: same major with other patch/hash is consumable; wrong major, low minor, missing capability, old exact handshake and v2 wire are rejected',()=>{
 // ProtocolRequirements are ordered by protocol (UTF-16 ascending), as the contract schema requires.
 const need=[c.protocolRequirement('BUILD/V3',['BUILD/V3:per-cell-compile']),c.protocolRequirement('region-build/v1',['region-build/v1:compile-mapblock-chunks'])];
 assert.equal(c.checkProtocolCompatibility(brush.protocolHandshake,need).result,'PROTOCOL_COMPATIBLE');
 assert.equal(new brush.BrushV3().protocolHandshake(),brush.protocolHandshake);
 const otherBuild={...brush.protocolHandshake,provenance:{packageName:'hanaworlds-brush',packageVersion:'0.4.7',sourceRevision:'f'.repeat(40),artifactDigest:'a'.repeat(64)}};
 assert.equal(c.checkProtocolCompatibility(otherBuild,need).result,'PROTOCOL_COMPATIBLE');
 const err=(fn,code)=>assert.throws(fn,e=>e.code===code);
 err(()=>c.checkProtocolCompatibility(brush.protocolHandshake,[c.protocolRequirement('region-build/v2')]),'UNSUPPORTED_VERSION');
 err(()=>c.checkProtocolCompatibility(brush.protocolHandshake,[c.protocolRequirement('region-build/v1',[],1)]),'UNSUPPORTED_VERSION');
 err(()=>c.checkProtocolCompatibility(brush.protocolHandshake,[c.protocolRequirement('region-build/v1',['canvas-region/v1:whole-region-undo'])]),'CAPABILITY_UNAVAILABLE');
 err(()=>c.checkProtocolCompatibility(brush.contractHandshake,need),'UNSUPPORTED_VERSION');
 rejects({...fixture.compileRequest,contractVersion:'region-build/v2'},'UNSUPPORTED_VERSION'); // typed error response, zero output
});

test('validation: catalogue, param2, world binding, digest binding and pure input; every failure has zero output',()=>{
 const q=request([0,0,0],[2,1,1],[AIR,STONE],[1,0]);
 rejects(request([0,0,0],[2,1,1],[AIR,{nodeName:'fixture:missing',param2:0}],[1,0]),'CATALOGUE_MISMATCH');
 rejects(request([0,0,0],[2,1,1],[AIR,{nodeName:'fixture:stone',param2:3}],[1,0]),'UNSUPPORTED_MUTATION_SEMANTICS');
 rejects({...q,localContext:{...q.localContext,worldRef:'other-world'}},'CURRENT_WORLD_MISMATCH');
 rejects({...q,buildDigest:'0'.repeat(64)},'NON_CANONICAL_AMBIGUITY');
 rejects({...q,build:{...q.build,block:{...q.build.block,runs:[[1,1],[1,1]]}}},'SCHEMA_INVALID');
 assert.throws(()=>brush.compileRegionBuild(request([0,0,0],[2,1,1],[AIR],[-1,-1])),e=>e.code==='SCHEMA_INVALID'); // all-UNSPECIFIED block is not encodable
 let called=0;const g={...q};Object.defineProperty(g,'build',{enumerable:true,get(){called++;return q.build;}});
 rejects(g,'SCHEMA_INVALID');assert.equal(called,0);
 assert.throws(()=>brush.compileRegionBuild(new Proxy(q,{})),e=>e.code==='SCHEMA_INVALID');
});
