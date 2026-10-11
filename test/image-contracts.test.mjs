import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const entry=import.meta.resolve(process.env.BRUSH_UNDER_TEST ?? '../dist/index.mjs');
const brush=await import(entry);
const pin=await import('../tools/development-contracts.mjs');
const a=await import(pin.contractsUrl);
test('per-cell consumer advertises the installed contracts handshake; same major accepted, other major refused',()=>{
 assert.equal(a.version,pin.ADMITTED_CONTRACTS.version);
 const own=JSON.parse(readFileSync(new URL('../package.json',entry)));
 assert.equal(own.devDependencies[pin.ADMITTED_CONTRACTS.name],pin.ADMITTED_CONTRACTS.dependency);
 assert.match(pin.ADMITTED_CONTRACTS.dependency,/^git\+https:\/\/github\.com\/yzsnstotz\/hanaworlds-contracts\.git#v\d+\.\d+\.\d+$/);
 assert.equal(brush.version,JSON.parse(readFileSync(new URL('../package.json',entry))).version);
 const service=new brush.BrushV3();
 assert.equal(service.status().contracts,`${pin.ADMITTED_CONTRACTS.name}@${a.version}`);
 assert.equal(a.checkContractHandshake(service.handshake()).result,'HANDSHAKE_VERSION_MATCH');
 assert.equal(a.checkContractHandshake({...service.handshake(),contracts:'hanaworlds-contracts@2.9.1'}).result,'HANDSHAKE_VERSION_MATCH');
 assert.throws(()=>a.checkContractHandshake({...service.handshake(),contracts:'hanaworlds-contracts@1.2.0'}),e=>e.code==='UNSUPPORTED_VERSION');
});
test('installed current package compiles the public BUILD/V5 path through library/raw/Cordis',()=>{
 const fixture=JSON.parse(readFileSync(new URL(pin.contractsFixtureUrl('main'))));
 const r=fixture.request,b=structuredClone(fixture.response.result.build);
 const D=(kind,value)=>a.digestValue(kind,value).sha256;
 const config={profileVersion:'compilation-config/v3',writeBackend:{profileId:'static-local',revision:'static-1'},overlapRule:'last-writer-wins',effectOrder:'numeric-x-y-z',compressionRule:'exact-final-effects-only'};
 const q={contractVersion:'BUILD/V5',sessionRef:r.sessionRef,requestId:'brush-image-contracts-smoke',worldRef:r.worldRef,localContext:r.localContext,build:b,buildDigest:D('build',b),catalogue:r.catalogue,catalogueDigest:b.catalogueDigest,targetFacts:r.targetFacts,targetFactsDigest:r.targetFactsDigest,safetyProfile:r.safetyProfile,safetyProfileDigest:r.safetyProfileDigest,compilationConfig:config,compilationConfigDigest:D('compilation-config',config),compilerRevision:'brush-image-fixture-1'};
 const out=brush.compileBuildDocument(q);
 assert.equal(out.error,null);assert.equal(out.result.projection.contractVersion,'operations/v4');
 assert.deepEqual(JSON.parse(JSON.stringify(out.result.projection.effects)),[{geometryProfile:'voxel-grid/v1',position:[0,1,3],materialRef:'fixture:stone',orientation:0}]);
 a.validateBoundResponse('BUILD/V5','BuildDocument',q,out);
 assert.equal(JSON.stringify(brush.compileBuildDocumentBytes(new TextEncoder().encode(JSON.stringify(q)))),JSON.stringify(out));
 const provided=[];brush.apply({provide:(...args)=>provided.push(args)});
 assert.equal(provided[0][0],'hanaworldsBrushV3');assert.equal(JSON.stringify(provided[0][1].compile(q)),JSON.stringify(out));
 assert.equal(a.digestProfile.domainPrefix,'HanaWorlds|contracts@0.4.0|'); // unchanged existing projection domains
 assert.equal(provided[0][1].status().worldAccess,'NONE');
 assert.equal(provided[0][1].status().modelAccess,'NONE');
});
test('version identity is read from package.json, and src names no engine literal (chunk edge, empty material, node or param2)',()=>{
 assert.equal(brush.version,JSON.parse(readFileSync(new URL('../package.json',entry))).version);
 for(const f of ['index.mjs','compile.mjs','expand.mjs','region.mjs','admit.mjs','contracts.mjs']){
  const src=readFileSync(f==='contracts.mjs'?new URL('../src/contracts.mjs',import.meta.url):new URL(f,entry),'utf8');
  for(const re of [/\bair\b/,/mapblock/i,/nodeName/,/param2/,/chunkEdge/,/\b16\b/,/luanti/i,/worldedit/i]) assert.doesNotMatch(src,re,`${f} names ${re}`);
 }
});
