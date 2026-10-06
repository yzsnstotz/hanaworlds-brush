// Region voxel block + palette compile. Public entry only (source or installed
// package via BRUSH_UNDER_TEST). Region envelope is the explicit Brush-local
// FIXTURE pending contracts region v1; catalogue/world context come from the
// admitted contracts fixture. No world, model or peer is involved.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const entry=import.meta.resolve(process.env.BRUSH_UNDER_TEST ?? '../src/index.mjs');
const brush=await import(entry);
const fixture=JSON.parse(readFileSync(new URL('../vendor/hanaworlds-contracts/fixtures/local/main.json',entry)));
const AIR={nodeName:'air',param2:0},STONE={nodeName:'fixture:stone',param2:0};
const U=brush.UNSPECIFIED;
const request=(region,over={})=>({contractVersion:'REGION/V1',requestId:'region-1',protocol:{name:'hanaworlds-region',major:1,minor:0},
 requiredCapabilities:['region-voxel-palette','explicit-air-dig','chunk-digest'],worldRef:fixture.request.worldRef,
 localContext:fixture.request.localContext,catalogue:fixture.request.catalogue,
 region:{profileVersion:'region-voxel/v1',axisOrder:'x,y,z',palette:[AIR,STONE],...region},...over});
const cellsOf=out=>out.result.chunks.flatMap(brush.chunkCells).map(c=>JSON.stringify(c)).sort();
// Independent oracle: walk the declared region in x-fastest order.
const expected=(origin,size,palette,cells)=>{const r=[];let i=0;
 for(let z=0;z<size[2];z++)for(let y=0;y<size[1];y++)for(let x=0;x<size[0];x++,i++)
  if(cells[i]!==U)r.push(JSON.stringify({position:[origin[0]+x,origin[1]+y,origin[2]+z],...palette[cells[i]]}));return r.sort();};
const rejects=(q,code)=>{const out=brush.compileRegion(q);assert.equal(out.result,null);assert.equal(out.error.code,code,JSON.stringify(out.error));return out;};

test('fill: region compiles to per-chunk palette blocks that read back exactly and repeat byte-identically',()=>{
 const cells=new Array(3*2*2).fill(1),q=request({origin:[0,1,3],size:[3,2,2],cells});
 const frozen=JSON.stringify(q);
 const a=brush.compileRegion(q),b=brush.compileRegion(structuredClone(q));
 assert.equal(a.error,null);assert.equal(JSON.stringify(a),JSON.stringify(b));assert.equal(JSON.stringify(q),frozen);
 assert.equal(a.result.chunks.length,1);
 const [c]=a.result.chunks;
 assert.deepEqual(c.chunkPos,[0,0,0]);assert.deepEqual(c.palette,[STONE]);assert.equal(c.specifiedCells,12);assert.equal(c.airCells,0);
 assert.deepEqual(cellsOf(a),expected([0,1,3],[3,2,2],[AIR,STONE],cells));
 assert.match(c.chunkDigest,/^[0-9a-f]{64}$/);assert.match(a.result.compiledDigest,/^[0-9a-f]{64}$/);
 assert.deepEqual(a.result.chunkDigests,[[[0,0,0],c.chunkDigest]]);
 assert.deepEqual(a.result.regionBounds,{min:[0,1,3],max:[2,2,4]});
});

test('dig: only explicit air digs; unspecified cells are never air and never emitted',()=>{
 const cells=[0,0,U,1, U,0,1,U],q=request({origin:[5,5,5],size:[2,2,2],cells});
 const out=brush.compileRegion(q);assert.equal(out.error,null);
 assert.equal(out.result.specifiedCells,5);assert.equal(out.result.airCells,3);
 const got=cellsOf(out);assert.deepEqual(got,expected([5,5,5],[2,2,2],[AIR,STONE],cells));
 for(const p of [[5,6,5],[5,5,6],[6,6,6]]) assert.ok(!got.some(s=>JSON.parse(s).position.join()===p.join()),`unspecified ${p} emitted`);
 // A region whose dig cells became unspecified compiles to different digests: the two are not conflated.
 const noDig=brush.compileRegion(request({origin:[5,5,5],size:[2,2,2],cells:cells.map(v=>v===0?U:v)}));
 assert.notEqual(noDig.result.compiledDigest,out.result.compiledDigest);assert.equal(noDig.result.airCells,0);
 // An all-unspecified region produces zero output, not an all-air dig.
 rejects(request({origin:[0,0,0],size:[2,1,1],cells:[U,U]}),'BUILD_INVALID');
});

test('cross-chunk with negative coordinates: aligned 16^3 chunks, numeric x/y/z chunk order, dense and rle identical',()=>{
 const origin=[14,-2,15],size=[4,4,3],n=48,cells=Array.from({length:n},(_,i)=>i%5===0?U:i%3===0?0:1);
 const dense=brush.compileRegion(request({origin,size,cells}));
 const runs=[];for(const v of cells){const l=runs.at(-1);if(l&&l[0]===v)l[1]++;else runs.push([v,1]);}
 const rle=brush.compileRegion(request({origin,size,cells:{encoding:'rle',runs}}));
 assert.equal(dense.error,null);
 assert.deepEqual(dense.result.chunks.map(c=>c.chunkPos),[[0,-1,0],[0,-1,1],[0,0,0],[0,0,1],[1,-1,0],[1,-1,1],[1,0,0],[1,0,1]]);
 for(const c of dense.result.chunks){assert.deepEqual(c.min,c.chunkPos.map(v=>v*16));
  for(const cell of brush.chunkCells(c))cell.position.forEach((p,i)=>assert.ok(p>=c.min[i]&&p<c.min[i]+16));}
 assert.deepEqual(cellsOf(dense),expected(origin,size,[AIR,STONE],cells));
 assert.equal(dense.result.specifiedCells,cells.filter(v=>v!==U).length);
 // rle input differs only in sourceRegionDigest/compiledDigest; every chunk block and digest is identical.
 assert.equal(JSON.stringify(rle.result.chunks),JSON.stringify(dense.result.chunks));
});

test('per-cell BUILD/V3 path is retained next to the region path',()=>{
 const service=new brush.BrushV3(),s=service.status();
 assert.equal(s.input,'BUILD/V3');assert.equal(s.output,'operations/v3');
 assert.equal(s.region.input,'REGION/V1');assert.equal(s.region.output,'region-chunks/v1');assert.match(s.region.boundary,/^FIXTURE/);
 assert.equal(typeof brush.compileBuildDocument,'function');assert.equal(typeof brush.expandEffects,'function');
 assert.equal(s.worldAccess,'NONE');assert.equal(s.persistence,'NONE');assert.equal(s.modelAccess,'NONE');
 const provided=[];brush.apply({provide:(...a)=>provided.push(a)});
 const q=request({origin:[0,0,0],size:[1,1,2],cells:[1,0]});
 assert.equal(provided[0][0],'hanaworldsBrushV3');
 assert.equal(JSON.stringify(provided[0][1].compileRegion(q)),JSON.stringify(brush.compileRegion(q)));
});

test('protocol: same major with any minor and provided capabilities is consumable; wrong major or missing capability is rejected before compile',()=>{
 const ok=brush.checkRegionProtocol({name:'hanaworlds-region',major:1,minor:9},['explicit-air-dig']);
 assert.equal(ok.result,'REGION_PROTOCOL_COMPATIBLE');
 const base={origin:[0,0,0],size:[1,1,1],cells:[1]};
 assert.equal(brush.compileRegion(request(base,{protocol:{name:'hanaworlds-region',major:1,minor:7}})).error,null);
 rejects(request(base,{protocol:{name:'hanaworlds-region',major:2,minor:0}}),'UNSUPPORTED_VERSION');
 rejects(request(base,{protocol:{name:'hanaworlds-region',major:0,minor:1}}),'UNSUPPORTED_VERSION');
 rejects(request(base,{requiredCapabilities:['region-voxel-palette','entity-motion']}),'CAPABILITY_UNAVAILABLE');
 rejects(request({...base,profileVersion:'region-voxel/v2'}),'UNSUPPORTED_VERSION');
});

test('validation: geometry, axis order, materials, palette, world binding and pure input; every failure has zero output',()=>{
 const base={origin:[0,0,0],size:[2,1,1],cells:[1,0]};
 rejects(request({...base,axisOrder:'z,y,x'}),'AMBIGUOUS_GEOMETRY');
 rejects(request({...base,cells:[1]}),'SCHEMA_INVALID');
 rejects(request({...base,cells:[1,2]}),'SCHEMA_INVALID');
 rejects(request({...base,cells:[1,-2]}),'SCHEMA_INVALID');
 rejects(request({...base,cells:[1,0.5]}),'SCHEMA_INVALID');
 rejects(request({...base,size:[2,0,1]}),'SCHEMA_INVALID');
 rejects(request({...base,origin:[Number.MAX_SAFE_INTEGER,0,0]}),'AMBIGUOUS_GEOMETRY');
 rejects(request({...base,cells:{encoding:'rle',runs:[[1,1]]}}),'SCHEMA_INVALID');
 rejects(request({...base,palette:[AIR,{nodeName:'fixture:missing',param2:0}]}),'CATALOGUE_MISMATCH');
 rejects(request({...base,palette:[AIR,{nodeName:'fixture:stone',param2:3}]}),'UNSUPPORTED_MUTATION_SEMANTICS');
 rejects(request({...base,palette:[AIR,STONE,{...STONE}]}),'NON_CANONICAL_AMBIGUITY');
 rejects(request(base,{worldRef:'other-world'}),'CURRENT_WORLD_MISMATCH');
 rejects(request(base,{extra:true}),'SCHEMA_INVALID');
 rejects(request(base,{contractVersion:'BUILD/V3'}),'SCHEMA_INVALID');
 let called=0;const q=request(base);Object.defineProperty(q.region,'cells',{enumerable:true,get(){called++;return [1,0];}});
 rejects(q,'SCHEMA_INVALID');assert.equal(called,0);
 assert.throws(()=>brush.compileRegion(new Proxy(request(base),{})),e=>e.code==='SCHEMA_INVALID');
});
