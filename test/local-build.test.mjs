import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const entry=import.meta.resolve(process.env.BRUSH_UNDER_TEST ?? '../src/index.mjs');
const brush=await import(entry);
const pin=await import(new URL('./contracts.mjs',entry));
const a=await import(pin.contractsUrl);
const fixture=JSON.parse(readFileSync(new URL(pin.contractsFixtureUrl('main'))));
const D=(kind,value)=>a.digestValue(kind,value).sha256;
const WIRE='BUILD/V5';
const STONE={geometryProfile:'voxel-grid/v1',materialRef:'fixture:stone',orientation:0};
function request() {
 const r=fixture.request,b=structuredClone(fixture.response.result.build);
 const config={profileVersion:'compilation-config/v3',writeBackend:{profileId:'static-local',revision:'static-1'},overlapRule:'last-writer-wins',effectOrder:'numeric-x-y-z',compressionRule:'exact-final-effects-only'};
 return {contractVersion:WIRE,sessionRef:r.sessionRef,requestId:'brush-current-1',worldRef:r.worldRef,localContext:structuredClone(r.localContext),build:b,buildDigest:D('build',b),catalogue:structuredClone(r.catalogue),catalogueDigest:b.catalogueDigest,targetFacts:structuredClone(r.targetFacts),targetFactsDigest:r.targetFactsDigest,safetyProfile:structuredClone(r.safetyProfile),safetyProfileDigest:r.safetyProfileDigest,compilationConfig:config,compilationConfigDigest:D('compilation-config',config),compilerRevision:'brush-fixture-1'};
}
test('current BUILD/V5 compiles to exact operations/v4 through the public API; materialRef/orientation pass through opaque',()=>{
 const q=request(),out=brush.compileBuildDocument(q);
 assert.equal(out.error,null);assert.equal(out.contractVersion,WIRE);assert.equal(out.result.projection.contractVersion,'operations/v4');
 assert.deepEqual(JSON.parse(JSON.stringify(out.result.projection.effects)),[{...STONE,position:[0,1,3]}]);
 a.validateBoundResponse(WIRE,'BuildDocument',q,out);
});
test('a build or target facts in a geometry profile Brush does not expand is CAPABILITY_GAP with zero output (value and bytes)',()=>{
 const gap=out=>{assert.equal(out.result,null);assert.equal(out.error.code,'CAPABILITY_GAP');assert.equal(out.error.reason,'GEOMETRY_PROFILE_UNSUPPORTED');assert.equal(out.error.mutationState,'NONE');};
 const b=request();b.build.geometryProfile='hex-grid/v1';gap(brush.compileBuildDocument(b));gap(brush.compileBuildDocumentBytes(new TextEncoder().encode(JSON.stringify(b))));
 const f=request();f.targetFacts.geometryProfile='sparse-octree/v1';gap(brush.compileBuildDocument(f));
 // a missing or non-string profile is a schema fault, not a gap; an old wire is a version fault
 const m=request();delete m.build.geometryProfile;assert.equal(brush.compileBuildDocument(m).error.code,'SCHEMA_INVALID');
 const n=request();n.build.geometryProfile=7;assert.equal(brush.compileBuildDocument(n).error.code,'SCHEMA_INVALID');
 const o=request();o.contractVersion='BUILD/V4';o.build.geometryProfile='hex-grid/v1';assert.notEqual(brush.compileBuildDocument(o).error.code,'CAPABILITY_GAP');
 assert.deepEqual([...brush.geometryProfiles],['voxel-grid/v1']);
});
const plain=x=>JSON.parse(JSON.stringify(x));
function reject(q,code) {const out=brush.compileBuildDocument(q);assert.equal(out.result,null);assert.equal(out.error.code,code);assert.equal(out.error.mutationState,'NONE');}
function rebind(q) {
 q.targetFactsDigest=D('target-facts',q.targetFacts);q.build.targetFactsDigest=q.targetFactsDigest;
 q.buildDigest=D('build',q.build);return q;
}
test('value/bytes repeats are deterministic and do not mutate input',()=>{
 const q=request(),before=JSON.stringify(q),first=brush.compileBuildDocument(q);
 for(let i=0;i<3;i++) assert.equal(JSON.stringify(brush.compileBuildDocumentBytes(new TextEncoder().encode(before))),JSON.stringify(first));
 assert.equal(JSON.stringify(q),before);
 assert.equal(first.result.operationDigest,D('operations',first.result.projection));
 assert.equal(first.result.projection.compilerRevision,q.compilerRevision);
});
test('overlapping inclusive boxes retain exact last-writer effects and numeric order',()=>{
 const q=request(),empty={materialRef:q.catalogue.emptyMaterialRef,orientation:0},E={geometryProfile:'voxel-grid/v1',...empty};
 q.build.operations=[{op:'set_box',min:[-2,0,0],max:[1,0,0],materialRef:'stone'},{op:'set_box',min:[-1,0,0],max:[0,0,0],materialRef:'empty'}];
 q.build.materials.empty=empty;q.build.declaredBounds={min:[-2,0,0],max:[1,0,0]};
 const effects=[{...STONE,position:[-2,0,0]},{...E,position:[-1,0,0]},{...E,position:[0,0,0]},{...STONE,position:[1,0,0]}];
 const positions=effects.map(e=>e.position);
 q.targetFacts.sampledBounds=q.build.declaredBounds;q.targetFacts.occupiedCells=[];q.targetFacts.unknownCells=[];q.targetFacts.knownEmptyCells=positions;q.targetFacts.usableVolume=null;
 q.targetFacts.coverageDigest=D('coverage',{profileVersion:'coverage/v2',sampledBounds:q.targetFacts.sampledBounds,sampledPositions:positions});
 rebind(q);
 const finalDigest=D('final-effects',{profileVersion:'final-effects/v3',frameDigest:q.targetFacts.frameDigest,catalogueDigest:q.catalogueDigest,effects});
 for(const w of q.build.witnesses){w.targetFactsDigest=q.targetFactsDigest;w.finalEffectsDigest=finalDigest;w.facts.positions=positions;}
 q.buildDigest=D('build',q.build);
 const out=brush.compileBuildDocument(q);assert.equal(out.error,null);assert.deepEqual(plain(out.result.projection.effects),effects);assert.deepEqual(plain(out.result.writeBounds),q.build.declaredBounds);
 a.validateBoundResponse(WIRE,'BuildDocument',q,out);
});
test('localContext and observed facts reject a different request world',()=>{
 const q=request();q.localContext.worldRef='different';reject(q,'CURRENT_WORLD_MISMATCH');
 const f=request();f.targetFacts.worldRef='different';rebind(f);reject(f,'CURRENT_WORLD_MISMATCH');
});
test('payload/frame digests and invalid declared geometry reject with zero operations',()=>{
 const q=request();q.buildDigest='0'.repeat(64);reject(q,'NON_CANONICAL_AMBIGUITY');
 const f=request();f.build.coordinateFrame.origin[0]=1;f.buildDigest=D('build',f.build);reject(f,'NON_CANONICAL_AMBIGUITY');
 const g=request();g.build.declaredBounds.max[0]=1; // malformed geometry cannot be digest-bound
 const out=brush.compileBuildDocument(g);assert.equal(out.result,null);assert.equal(out.error.code,'SCHEMA_INVALID');
});
test('unknown target and a body-clearance witness that does not cover the final effects never yield operations',()=>{
 const q=request();q.targetFacts.unknownCells=[{position:[0,1,3],reason:'UNLOADED'}];q.targetFacts.knownEmptyCells=[];q.targetFacts.usableVolume=null;
 rebind(q);reject(q,'TARGET_FACTS_INCOMPLETE');
 const b=request();b.build.witnesses.find(w=>w.predicate==='BODY_CLEARANCE').facts.positions=[]; // no player geometry in witnesses; real bodies are engine-checked
 b.buildDigest=D('build',b.build);reject(b,'SAFETY_INVARIANT_FAILED');
});
test('raw duplicate keys and old/authority fields are strictly rejected',()=>{
 const raw=JSON.stringify(request()).replace('"requestId":"brush-current-1"','"requestId":"brush-current-1","requestId":"duplicate"');
 assert.throws(()=>brush.compileBuildDocumentBytes(new TextEncoder().encode(raw)),e=>e.code==='NON_CANONICAL_AMBIGUITY' && e.reason==='DUPLICATE_DECODED_KEY');
 const q=request();q.authorizationRef='invented';reject(q,'UNKNOWN_REQUIRED_FIELD');
 const old=request();old.contractVersion='BUILD/V4';const out=brush.compileBuildDocument(old);assert.equal(out.result,null);assert.ok(out.error);
});
test('current service advertises exact handshake and no world/persistence/model port',()=>{
 const provided=[];brush.apply({provide:(...args)=>provided.push(args)});assert.equal(provided.length,1);assert.equal(provided[0][0],'hanaworldsBrushV3');
 const service=provided[0][1],status=service.status();assert.equal(brush.BrushV2,undefined);assert.deepEqual(plain(service.handshake()),plain(a.contractHandshake));a.checkContractHandshake(service.handshake());
 assert.equal(status.input,WIRE);assert.equal(status.output,'operations/v4');assert.deepEqual([...status.geometryProfiles],['voxel-grid/v1']);assert.equal(status.worldAccess,'NONE');assert.equal(status.persistence,'NONE');assert.equal(status.modelAccess,'NONE');assert.deepEqual(brush.inject,[]);
 assert.deepEqual(plain(service.compile(request())),plain(brush.compileBuildDocument(request())));
 assert.deepEqual(plain(service.compileBytes(new TextEncoder().encode(JSON.stringify(request())))),plain(service.compile(request())));
});
test('rejected accessor/proxy input never executes caller-controlled getters or traps',()=>{
 let reads=0;const q=request();Object.defineProperty(q,'requestId',{enumerable:true,get(){reads++;return 'unsafe';}});
 assert.throws(()=>brush.compileBuildDocument(q),e=>e instanceof a.ContractError);assert.equal(reads,0);
 const proxy=new Proxy(request(),{getOwnPropertyDescriptor(){reads++;return undefined;},get(){reads++;return 'unsafe';}});
 assert.throws(()=>brush.compileBuildDocument(proxy),e=>e instanceof a.ContractError);assert.equal(reads,0);
});
