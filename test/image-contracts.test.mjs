import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const entry=import.meta.resolve(process.env.BRUSH_UNDER_TEST ?? '../src/index.mjs');
const brush=await import(entry);
const pin=await import(new URL('./contracts.mjs',entry));
const a=await import(pin.contractsUrl);
test('per-cell consumer advertises the installed contracts handshake; same major accepted, other major refused',()=>{
 assert.ok(pin.satisfiesCaret(a.version,pin.ADMITTED_CONTRACTS.range),`${a.version} outside ${pin.ADMITTED_CONTRACTS.range}`);
 assert.equal(brush.version,JSON.parse(readFileSync(new URL('../package.json',entry))).version);
 const service=new brush.BrushV3();
 assert.equal(service.status().contracts,`${pin.ADMITTED_CONTRACTS.name}@${a.version}`);
 assert.equal(a.checkContractHandshake(service.handshake()).result,'HANDSHAKE_VERSION_MATCH');
 assert.equal(a.checkContractHandshake({...service.handshake(),contracts:'hanaworlds-contracts@1.0.0'}).result,'HANDSHAKE_VERSION_MATCH');
 assert.throws(()=>a.checkContractHandshake({...service.handshake(),contracts:'hanaworlds-contracts@0.5.6'}),e=>e.code==='UNSUPPORTED_VERSION');
});
test('installed current package compiles the unchanged public BUILD path through library/raw/Cordis',()=>{
 const fixture=JSON.parse(readFileSync(new URL(pin.contractsFixtureUrl('main'))));
 const r=fixture.request,b=structuredClone(fixture.response.result.build);
 const D=(kind,value)=>a.digestValue(kind,value).sha256;
 const config={profileVersion:'compilation-config/v2',backendProfileId:'static-local',worldeditRevision:'static-1',nodeWriteSemantics:'explicit-nodeName-param2-static-v2',overlapRule:'last-writer-wins',effectOrder:'numeric-x-y-z',compressionRule:'exact-final-effects-only'};
 const q={contractVersion:'BUILD/V3',sessionRef:r.sessionRef,requestId:'brush-image-contracts-smoke',worldRef:r.worldRef,localContext:r.localContext,build:b,buildDigest:D('build',b),catalogue:r.catalogue,catalogueDigest:b.catalogueDigest,targetFacts:r.targetFacts,targetFactsDigest:r.targetFactsDigest,safetyProfile:r.safetyProfile,safetyProfileDigest:r.safetyProfileDigest,compilationConfig:config,compilationConfigDigest:D('compilation-config',config),compilerRevision:'brush-image-fixture-1'};
 const out=brush.compileBuildDocument(q);
 assert.equal(out.error,null);assert.equal(out.result.projection.contractVersion,'operations/v3');
 assert.deepEqual(JSON.parse(JSON.stringify(out.result.projection.effects)),[{position:[0,1,3],nodeName:'fixture:stone',param2:0}]);
 a.validateBoundResponse('BUILD/V3','BuildDocument',q,out);
 assert.equal(JSON.stringify(brush.compileBuildDocumentBytes(new TextEncoder().encode(JSON.stringify(q)))),JSON.stringify(out));
 const provided=[];brush.apply({provide:(...args)=>provided.push(args)});
 assert.equal(provided[0][0],'hanaworldsBrushV3');assert.equal(JSON.stringify(provided[0][1].compile(q)),JSON.stringify(out));
 assert.equal(a.digestProfile.domainPrefix,'HanaWorlds|contracts@0.4.0|'); // unchanged existing projection domains
 assert.equal(provided[0][1].status().worldAccess,'NONE');
 assert.equal(provided[0][1].status().modelAccess,'NONE');
});
