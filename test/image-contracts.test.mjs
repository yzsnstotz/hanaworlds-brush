import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { buildRequest, metadata, checkContractHandshake } from './legacy-document-fixtures.mjs';
const entry=import.meta.resolve(process.env.BRUSH_UNDER_TEST ?? '../dist/index.mjs');
const brush=await import(entry);
const a=await import(new URL('contracts.mjs',entry));
test('per-cell consumer preserves documented legacy metadata and owns its contract without a supplier dependency',()=>{
 const own=JSON.parse(readFileSync(new URL('../package.json',entry)));
 for(const field of ['dependencies','devDependencies','peerDependencies','optionalDependencies'])
  assert.equal(own[field]?.['hanaworlds-contracts'],undefined);
 assert.equal(brush.version,own.version);
 const service=new brush.BrushV3();
 assert.deepEqual(JSON.parse(JSON.stringify(service.handshake())),metadata.legacyContractHandshake);
 assert.equal(service.status().contracts,metadata.legacyContractHandshake.contracts);
 assert.equal(checkContractHandshake(service.handshake()).result,'HANDSHAKE_VERSION_MATCH');
 assert.equal(checkContractHandshake({...service.handshake(),contracts:'hanaworlds-contracts@2.9.1'}).result,'HANDSHAKE_VERSION_MATCH');
 assert.throws(()=>checkContractHandshake({...service.handshake(),contracts:'hanaworlds-contracts@1.2.0'}),e=>e.code==='UNSUPPORTED_VERSION');
});
test('installed current package compiles the public BUILD/V5 path through library/raw/Cordis',()=>{
 const q=buildRequest();
 const out=brush.compileBuildDocument(q);
 assert.equal(out.error,null);assert.equal(out.result.projection.contractVersion,'operations/v4');
 assert.deepEqual(JSON.parse(JSON.stringify(out.result.projection.effects)),[{geometryProfile:'voxel-grid/v1',position:[-1,0,2],materialRef:'doc:solid',orientation:0}]);
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
