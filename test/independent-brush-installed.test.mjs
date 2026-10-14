// POST-REVIEW ONLY. Explicit command: node --test test/independent-brush-installed.test.mjs
// Not imported by the review-phase card command; no skip or production bypass.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { readDocument, runSample, digest, cellsOfBlock, sha, assertReadback, comparePosition, expectedBuildCells, jcs } from './independent-brush-support.mjs';
const root=realpathSync(fileURLToPath(new URL('..',import.meta.url))),runRoot=dirname(root),doc=readDocument();
const TEST_PROCESS_BUDGET_MS=300000; // Named test execution budget, no compiler limit/retry.
let consumer,installed,brush,service,local;
test('normal prepack, strict production tgz install, public load and exact packed bytes',async()=>{
  mkdirSync(join(runRoot,'tmp'),{recursive:true});
  const stage=mkdtempSync(join(runRoot,'tmp/independent-installed-'));
  const packDir=join(stage,'pack');consumer=join(stage,'consumer');
  mkdirSync(packDir);mkdirSync(consumer);
  const home=join(stage,'home');mkdirSync(home);
  const env={PATH:dirname(process.execPath)+':'+process.env.PATH,HOME:home,XDG_CONFIG_HOME:join(home,'config'),XDG_DATA_HOME:join(home,'data'),XDG_CACHE_HOME:join(home,'cache'),npm_config_cache:join(stage,'npm-cache'),BRUSH_VERIFY_TMP:stage};
  const command=(phase,cmd,args,cwd)=>{
    try {
      const output=execFileSync(cmd,args,{cwd,env,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:TEST_PROCESS_BUDGET_MS});
      writeFileSync(join(stage,phase+'.log'),output);return output;
    } catch(cause) {
      writeFileSync(join(stage,phase+'.log'),String(cause.stdout??'')+String(cause.stderr??''));
      writeFileSync(join(stage,'failure.json'),JSON.stringify({phase,status:cause.status,signal:cause.signal,retryCount:0,message:cause.message},null,2));
      throw new Error('PREREQUISITE_FAILED '+phase,{cause});
    }
  };
  const output=command('normal-pack','npm',['pack','--pack-destination',packDir,'--json'],root);
  const json=output.match(/(?:^|\n)(\[\s*\{\s*"id"[\s\S]*)$/)?.[1]??output;
  const [pack]=JSON.parse(json),tgz=join(packDir,pack.filename),extracted=join(stage,'extract');mkdirSync(extracted);
  command('extract','tar',['-xzf',tgz,'-C',extracted],stage);
  const pnpm=join(root,'node_modules/pnpm/bin/pnpm.mjs');
  assert.equal(command('pnpm-version',process.execPath,[pnpm,'--version'],consumer).trim(),'11.28.5');
  for(const setting of ['blockExoticSubdeps','strictDepBuilds'])assert.ok(['true','undefined'].includes(command(setting,process.execPath,[pnpm,'config','get',setting],consumer).trim()));
  writeFileSync(join(consumer,'package.json'),JSON.stringify({name:'independent-brush-consumer',private:true,type:'module',dependencies:{'hanaworlds-brush':'file:'+tgz}},null,2));
  command('install',process.execPath,[pnpm,'install','--prod','--reporter=append-only','--store-dir',join(stage,'pnpm-store')],consumer);
  const graph=command('production-graph',process.execPath,[pnpm,'list','--prod','--depth','Infinity','--json'],consumer);
  assert.doesNotMatch(graph,/hanaworlds-contracts|typescript|esbuild|acorn/);
  assert.doesNotMatch(readFileSync(join(consumer,'pnpm-lock.yaml'),'utf8'),/hanaworlds-contracts|git\+|github\.com/);
  assert.equal(existsSync(join(consumer,'node_modules/hanaworlds-contracts')),false);
  const require=createRequire(join(consumer,'package.json'));
  installed=realpathSync(dirname(require.resolve('hanaworlds-brush/package.json')));
  assert.ok(installed.startsWith(realpathSync(join(consumer,'node_modules'))+'/'));
  assert.ok(!installed.startsWith(root+'/'));
  const manifest=JSON.parse(readFileSync(join(installed,'package.json')));
  const entry=command('resolve-public-root',process.execPath,['--input-type=module','-e',"console.log(import.meta.resolve('hanaworlds-brush'))"],consumer).trim();
  for(const f of pack.files) assert.equal(sha(readFileSync(join(installed,f.path))),sha(readFileSync(join(extracted,'package',f.path))),f.path);
  for(const group of ['dependencies','devDependencies','peerDependencies','optionalDependencies'])assert.equal(manifest[group]?.['hanaworlds-contracts'],undefined);
  // Parse every installed runtime loader and resolve the actual graph; no ancestor supply.
  const {parse}=await import(pathToFileURL(createRequire(join(root,'package.json')).resolve('acorn')));
  const installBase=realpathSync(join(consumer,'node_modules')),seen=new Set(),queue=pack.files.filter(f=>/\.(mjs|cjs|js)$/.test(f.path)).map(f=>join(installed,f.path));
  while(queue.length) {
    const file=realpathSync(queue.shift());if(seen.has(file))continue;seen.add(file);
    assert.ok(file.startsWith(installBase+'/'),'runtime resolved outside consumer: '+file);
    if(!/\.(mjs|cjs|js)$/.test(file))continue;
    const tree=parse(readFileSync(file,'utf8'),{ecmaVersion:'latest',sourceType:'module'}),refs=[];
    function walk(node) {
      if(!node||typeof node!=='object')return;
      if(['ImportDeclaration','ExportNamedDeclaration','ExportAllDeclaration'].includes(node.type)&&node.source)refs.push(node.source.value);
      if(node.type==='ImportExpression') {assert.equal(node.source.type,'Literal','computed runtime import');refs.push(node.source.value);}
      if(node.type==='CallExpression'&&node.callee?.name==='require') {assert.equal(node.arguments[0]?.type,'Literal','computed require');refs.push(node.arguments[0].value);}
      for(const value of Object.values(node))if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);
    }
    walk(tree);
    for(const ref of refs)assert.doesNotMatch(ref,/hanaworlds-contracts/);
    const resolved=JSON.parse(command('resolve-'+seen.size,process.execPath,['--experimental-import-meta-resolve','--input-type=module','-e',
      'console.log(JSON.stringify(JSON.parse(process.argv[1]).map(ref=>import.meta.resolve(ref,process.argv[2]))))',JSON.stringify(refs),pathToFileURL(file).href],consumer));
    for(const url of resolved)if(!url.startsWith('node:'))queue.push(fileURLToPath(url));
  }
  writeFileSync(join(stage,'runtime-graph.json'),JSON.stringify([...seen],null,2));
  assert.ok([...seen].some(f=>f.includes('/canonicalize/')),'real canonicalize dependency must remain');
  for(const f of readdirSync(join(installed,'types'),{recursive:true}).filter(f=>/\.(mts|ts)$/.test(f)))assert.doesNotMatch(readFileSync(join(installed,'types',f),'utf8'),/from\s*['"]hanaworlds-contracts['"]/);
  // Existing strict consumer assertions remain unchanged, but only Brush is installed here.
  writeFileSync(join(consumer,'consumer.mts'),readFileSync(join(root,'test/consumer.mts')));
  command('strict-types',process.execPath,[join(root,'node_modules/typescript/bin/tsc'),'--noEmit','--strict','--module','nodenext','--moduleResolution','nodenext','--target','es2022',join(consumer,'consumer.mts')],consumer);
  brush=await import(entry);
  local=await import(pathToFileURL(join(installed,'dist/contracts.mjs')));
  const provided=[];brush.default.apply({provide:(...args)=>provided.push(args)});
  assert.equal(provided.length,1);assert.equal(provided[0][0],'hanaworldsBrushV3');service=provided[0][1];
  assert.deepEqual(brush.inject,[]);assert.equal(jcs(brush.contractHandshake),jcs(doc.get('package-metadata').legacyContractHandshake));
  assert.deepEqual(brush.brushProtocols,doc.get('package-metadata').brushProtocols);assert.deepEqual(brush.brushCapabilities,doc.get('package-metadata').capabilities);
  assert.equal(brush.version,manifest.version);assert.equal(service.status().worldAccess,'NONE');assert.equal(service.status().modelAccess,'NONE');assert.equal(service.status().persistence,'NONE');
  // This simulated registration establishes the provider's local service, not REAL_HOST.
  writeFileSync(join(stage,'C-brush.md'),doc.text);
  const faultOutput=command('original-exceptions',process.execPath,[join(root,'test/independent-brush-faults.mjs'),consumer,join(stage,'C-brush.md')],consumer);
  assert.ok(JSON.parse(faultOutput).records.length>0);
  env.BRUSH_UNDER_TEST=entry;
  command('retained-shapes',process.execPath,['--test',join(root,'test/shapes.test.mjs')],root);
});
test('real installed two operations: all full document cases and 356 nested admission requests',()=>{
  assert.ok(brush,'normal installed prerequisite must pass; no fixture fallback');
  for(const operation of ['BuildDocument','CompileRegionBuild'])for(const sample of doc.get(operation).cases)runSample(doc,brush,service,operation,sample);
  for(const sample of doc.get('admission'))runSample(doc,brush,service,sample.operation,sample);
});
test('real compiled-set validator rejects changed identity, digest and exact voxel correspondence',()=>{
  assert.ok(local,'normal installed prerequisite must pass');
  const c=doc.get('CompileRegionBuild').cases[0],q=structuredClone(c.request),out=brush.compileRegionBuild(q);
  assertReadback(doc,c,out);assert.deepEqual(local.validateCompiledRegionSet(q,out),out);
  const id=structuredClone(out);id.requestId='different';
  assert.throws(()=>local.validateCompiledRegionSet(q,id),e=>e.code==='TRANSACTION_CONFLICT'&&e.reason==='PAYLOAD_CHANGED');
  const hash=structuredClone(out);hash.result.operationDigest='0'.repeat(64);
  assert.throws(()=>local.validateCompiledRegionSet(q,hash),e=>e.code==='NON_CANONICAL_AMBIGUITY');
  // Remove a whole emitted chunk, rebinding the projection digest and bounds;
  // schema-valid data must still fail exact request cell equivalence.
  const missing=structuredClone(out);assert.ok(missing.result.projection.chunks.length>1);
  missing.result.projection.chunks.pop();
  const chunks=missing.result.projection.chunks;
  missing.result.writeBounds={min:[0,1,2].map(a=>Math.min(...chunks.map(c=>c.block.origin[a]))),max:[0,1,2].map(a=>Math.max(...chunks.map(c=>c.block.origin[a]+c.block.size[a]-1)))};
  missing.result.operationDigest=digest(doc,'region-operations',missing.result.projection);
  assert.throws(()=>local.validateCompiledRegionSet(q,missing),e=>e.code==='BUILD_INVALID'&&e.reason==='INVALID_GEOMETRY');
});
test('request partition and source empty material govern non-cubic negative-coordinate writes',()=>{
  assert.ok(brush,'normal installed prerequisite must pass');
  const c=doc.get('CompileRegionBuild').cases[0],q=structuredClone(c.request);
  q.partition.edge=[3,2,5];
  const out=brush.compileRegionBuild(q);assert.equal(out.error,null);assert.equal(jcs(out.result.projection.partition),jcs(q.partition));
  const actual=out.result.projection.chunks.flatMap(c=>cellsOfBlock(c.block)).sort((a,b)=>comparePosition(a.position,b.position));
  assert.deepEqual(actual,cellsOfBlock(q.build.block));
  assert.ok(actual.some(c=>c.materialRef===q.catalogue.emptyMaterialRef),'explicit carve preserved');
  for(const chunk of out.result.projection.chunks)for(const cell of cellsOfBlock(chunk.block))assert.deepEqual(chunk.chunkPos,cell.position.map((v,a)=>Math.floor(v/q.partition.edge[a])));
});
test('full BUILD compilation preserves overlap, numeric order, bounds, six bindings and opaque carve',()=>{
  assert.ok(brush,'normal installed prerequisite must pass');
  const q=structuredClone(doc.get('BuildDocument').cases[0].request);
  q.requestId='independent-overlap';
  q.build.materials.empty={materialRef:q.catalogue.emptyMaterialRef,orientation:0};
  q.build.operations=[{op:'set_box',min:[-2,0,0],max:[1,0,0],materialRef:'solid'},{op:'set_box',min:[-1,0,0],max:[0,0,0],materialRef:'empty'}];
  q.build.declaredBounds={min:[-2,0,0],max:[1,0,0]};
  const cells=expectedBuildCells(q),effects=cells.map(c=>({geometryProfile:'voxel-grid/v1',...c}));
  const positions=cells.map(c=>c.position);
  q.targetFacts.sampledBounds=structuredClone(q.build.declaredBounds);q.targetFacts.knownEmptyCells=positions;
  q.targetFacts.occupiedCells=[];q.targetFacts.unknownCells=[];q.targetFacts.usableVolume=null;
  q.targetFacts.coverageDigest=digest(doc,'coverage',{profileVersion:'coverage/v2',sampledBounds:q.targetFacts.sampledBounds,sampledPositions:positions});
  q.targetFactsDigest=digest(doc,'target-facts',q.targetFacts);q.build.targetFactsDigest=q.targetFactsDigest;
  const finalDigest=digest(doc,'final-effects',{profileVersion:'final-effects/v3',frameDigest:q.targetFacts.frameDigest,catalogueDigest:q.catalogueDigest,effects});
  for(const w of q.build.witnesses){w.targetFactsDigest=q.targetFactsDigest;w.finalEffectsDigest=finalDigest;w.facts.positions=positions;}
  q.buildDigest=digest(doc,'build',q.build);
  const projection={contractVersion:'operations/v4',buildDigest:q.buildDigest,compilerRevision:q.compilerRevision,compilationConfigDigest:q.compilationConfigDigest,worldRef:q.worldRef,frameDigest:q.targetFacts.frameDigest,catalogueDigest:q.catalogueDigest,targetFactsDigest:q.targetFactsDigest,effects};
  const expected={contractVersion:'BUILD/V5',requestId:q.requestId,error:null,result:{projection,operationDigest:digest(doc,'operations',projection),readBounds:q.targetFacts.sampledBounds,writeBounds:q.build.declaredBounds}};
  runSample(doc,brush,service,'BuildDocument',{id:q.requestId,request:q,expected,readback:{effects:cells,digests:[]}});
});
