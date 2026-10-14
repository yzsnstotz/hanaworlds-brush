// Review phase: no build, pack, retired supplier loading, or installed suite import.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDocument, assertReadback, digest, sha, jcs, acceptsShape } from './independent-brush-support.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),doc=readDocument();
test('C-brush all versions retained; v3 four-root closure has no external schema refs',()=>{
  assert.match(doc.text,/大版本：2/);assert.match(doc.text,/破坏性：D-105/);
  assert.equal(doc.get('schema')['x-contract'],'C-brush/v3');
  assert.deepEqual(doc.get('schema')['x-roots'],['BuildDocumentRequest','BuildDocumentResponse','CompileRegionBuildRequest','CompileRegionBuildResponse']);
  const definitions=doc.get('schema').definitions;
  for(const m of JSON.stringify(definitions).matchAll(/"\$ref":"([^"]+)"/g)) {
    assert.ok(m[1].startsWith('#/definitions/'));assert.ok(Object.hasOwn(definitions,m[1].slice(14)));
  }
  assert.equal(Object.keys(definitions).length,102);
  assert.deepEqual(new Set(doc.get('boundaries').map(x=>x.type)),new Set(Object.keys(definitions)));
  assert.equal(doc.get('boundaries').length,2237);assert.equal(doc.get('admission').length,356);
});
test('all 2237 structural examples agree with the complete independent document schema',()=>{
  for(const c of doc.get('boundaries'))assert.equal(acceptsShape(doc,c.type,c.value),c.accepted,c.id);
});
for(const operation of ['BuildDocument','CompileRegionBuild']) {
  const spec=doc.get(operation);
  test(`${operation}: complete documented cases, four routes and operation-specific errors`,()=>{
    assert.deepEqual(spec.roles,{provider:'brush',receiver:'workshop'});
    assert.deepEqual(spec.access,{world:'NONE',persistence:'NONE',model:'NONE'});
    assert.equal(spec.contractDocumentMajor,3);assert.equal(spec.registration.serviceName,'hanaworldsBrushV3');
    assert.equal(spec.proposedPublicCodes.length,operation==='BuildDocument'?14:11);
    assert.equal(spec.cases.length,operation==='BuildDocument'?39:28);
    assert.deepEqual(Object.keys(spec.binding),['value','bytes','service','serviceBytes']);
    for(const c of spec.cases) {
      const errors=[c.expected?.error,c.valueExpected?.error,c.thrown?.publicError,c.valueThrown?.publicError].filter(Boolean);
      for(const e of errors) {
        assert.deepEqual(Object.keys(e).sort(),['code','phase','retryability','mutationState','transactionRef','causeCode','reason'].sort());
        assert.ok(spec.proposedPublicCodes.includes(e.code));assert.equal(e.mutationState,'NONE');
      }
      if(c.expected?.result) assertReadback(doc,c,c.expected);
    }
  });
}
test('independent digest oracle checks its RFC8785 number and UTF16 ordering assumptions',()=>{
  assert.equal(jcs({z:-0,a:1e30,b:0.000001,c:'€'}),'{"a":1e+30,"b":0.000001,"c":"€","z":0}');
  assert.equal(jcs({'\uE000':1,'😀':2}),'{'+'"😀":2,"\uE000":1}');
  assert.throws(()=>jcs('\ud800'));assert.throws(()=>jcs(Infinity));
  const q=doc.get('BuildDocument').cases[0].request;
  for(const [kind,key] of [['build','build'],['catalogue','catalogue'],['target-facts','targetFacts'],['safety-profile','safetyProfile'],['compilation-config','compilationConfig']])
    assert.equal(digest(doc,kind,q[key]),q[key+'Digest']);
});
test('SOURCE RED: public declaration closure supports an independent consumer without retired contract types',()=>{
  const files=readdirSync(join(root,'types'),{recursive:true}).filter(f=>/\.d\.(?:mts|ts)$/.test(f));
  const dependent=files.filter(f=>/\bfrom\s*['"]hanaworlds-contracts['"]|import\s*\(['"]hanaworlds-contracts['"]\)/.test(readFileSync(join(root,'types',f),'utf8')));
  assert.deepEqual(dependent,[],'independent type consumer still requires retired contract package');
});
test('SOURCE RED: runtime and normal build no longer acquire retired contract supply',()=>{
  const dependent=[];
  for(const dir of ['src','tools'])for(const f of readdirSync(join(root,dir),{recursive:true}).filter(f=>/\.mjs$/.test(f))) {
    const text=readFileSync(join(root,dir,f),'utf8');
    if(/(?:from\s*|import\s*\(|(?:\.resolve|\.contractsFixtureUrl)\s*\()[^\n;]*['"]hanaworlds-contracts(?:\/|['"])/.test(text)) dependent.push(dir+'/'+f);
  }
  const pkg=JSON.parse(readFileSync(join(root,'package.json'))),lock=JSON.parse(readFileSync(join(root,'package-lock.json')));
  for(const field of ['dependencies','devDependencies','peerDependencies','optionalDependencies'])if(pkg[field]?.['hanaworlds-contracts'])dependent.push('package.json:'+field);
  if(lock.packages?.['node_modules/hanaworlds-contracts'])dependent.push('package-lock.json');
  assert.deepEqual(dependent,[],'compiler/build supply is not self-owned yet');
});
test('D-14 pinned geometry bytes and licensing remain present',()=>{
  const base=join(root,'src/shapes/upstream'),source=JSON.parse(readFileSync(join(base,'source.json')));
  assert.equal(source.commit,'62ffafe3bcb386600c431ef3840d91c3c8f85639');assert.equal(source.license,'AGPL-3.0-only');
  for(const [file,hash] of Object.entries(source.sha256))assert.equal(sha(readFileSync(join(base,file))),hash,file);
  const notice=readFileSync(join(root,'NOTICE'),'utf8');assert.ok(notice.includes(source.commit));assert.match(notice,/AGPL-3\.0/);
  assert.match(readFileSync(join(root,'src/expand.mjs'),'utf8'),/import\s*\{\s*cuboid\s*\}\s*from\s*['"]\.\/shapes\/index\.mjs['"]/);
});
