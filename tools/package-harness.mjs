import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { parse } from 'acorn';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditArtifact, sha256 } from './artifact-boundary.mjs';
import { contractsFixtureUrl } from './development-contracts.mjs';
import * as c from 'hanaworlds-contracts';

export const root=fileURLToPath(new URL('..',import.meta.url));
export const run=(command,args,options={})=>execFileSync(command,args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],...options});
export const pnpm=join(root,'node_modules/pnpm/bin/pnpm.mjs');
export function cleanEnv(base) {
 // Package-manager config is isolated from old Profiles; credentials are not read/copied.
 const env={PATH:dirname(process.execPath)+':'+process.env.PATH,HOME:base,
  XDG_DATA_HOME:join(process.env.HOME,'.local/share'),XDG_CONFIG_HOME:join(base,'config'),XDG_CACHE_HOME:join(base,'cache'),PNPM_HOME:join(base,'pnpm-home'),
  npm_config_cache:process.env.npm_config_cache??join(process.env.HOME,'.npm')};
 return env;
}
export function normalPack(out) {
 mkdirSync(out,{recursive:true});
 const receipt=join(out,'nested-pack-receipt.json'),nonce=randomUUID();
 writeFileSync(receipt,JSON.stringify({nonce,ownerPid:process.pid,root,consumed:false}),{flag:'wx',mode:0o600});
 const raw=run('npm',['pack','--pack-destination',out,'--json'],{env:{...process.env,BRUSH_BOUNDARY_PACK_RECEIPT:JSON.stringify({receipt,nonce})}});
 assert.equal(JSON.parse(readFileSync(receipt)).consumed,true,'normal npm pack must execute the inner prepack audit');
 writeFileSync(join(out,'normal-prepack.log'),raw);
 const [packed]=JSON.parse(raw.match(/(?:^|\n)(\[\s*\{\s*"id"[\s\S]*)$/)?.[1]??raw);
 const tgz=join(out,packed.filename),extracted=join(out,'extract');mkdirSync(extracted);
 run('tar',['-xzf',tgz,'-C',extracted]);
 const artifact=join(extracted,'package'),audit=auditArtifact(artifact);
 writeFileSync(join(out,'artifact-graph.json'),JSON.stringify(audit,null,2)+'\n');
 writeFileSync(join(out,'artifact-sha256.txt'),sha256(readFileSync(tgz))+'\n');
 return {packed,tgz,artifact,audit,out};
}
export function smokeInputs(entries) {
 const fixture=JSON.parse(readFileSync(new URL(contractsFixtureUrl('main'))));
 const r=fixture.request,b=structuredClone(fixture.response.result.build);
 const config={profileVersion:'compilation-config/v3',writeBackend:{profileId:'static-local',revision:'static-1'},overlapRule:'last-writer-wins',effectOrder:'numeric-x-y-z',compressionRule:'exact-final-effects-only'};
 const q={contractVersion:'BUILD/V5',sessionRef:r.sessionRef,requestId:'brush-packed-production',worldRef:r.worldRef,localContext:r.localContext,build:b,buildDigest:c.digestValue('build',b).sha256,catalogue:r.catalogue,catalogueDigest:b.catalogueDigest,targetFacts:r.targetFacts,targetFactsDigest:r.targetFactsDigest,safetyProfile:r.safetyProfile,safetyProfileDigest:r.safetyProfileDigest,compilationConfig:config,compilationConfigDigest:c.digestValue('compilation-config',config).sha256,compilerRevision:'brush-packed-production'};
 const region=JSON.parse(readFileSync(new URL(contractsFixtureUrl('brush-placement')))).region;
 const base=region.compileRequest;
 const empty={materialRef:'source:empty-03',orientation:0},stone={materialRef:'fixture:stone',orientation:0};
 const catalogue=structuredClone(base.catalogue);
 catalogue.materials[empty.materialRef]=catalogue.materials[catalogue.emptyMaterialRef];
 delete catalogue.materials[catalogue.emptyMaterialRef];catalogue.emptyMaterialRef=empty.materialRef;
 const origin=[-3,-2,-1],size=[9,5,7],palette=[empty,stone];
 const indices=Array.from({length:9*5*7},(_,i)=>i%5===0?-1:i%3===0?0:1);
 const block=c.encodeRegionBlock({origin,size,palette,indices}),catalogueDigest=c.digestValue('catalogue',catalogue).sha256;
 const build={...base.build,catalogueDigest,block,declaredBounds:c.regionBlockBox(block)};
 const custom={...base,requestId:'brush-production-source-facts',build,buildDigest:c.digestValue('region-build',build).sha256,catalogue,catalogueDigest,partition:{edge:[2,3,4]}};
 const expected=[];let i=0;
 for(let z=0;z<size[2];z++)for(let y=0;y<size[1];y++)for(let x=0;x<size[0];x++,i++)
  if(indices[i]!==-1)expected.push({position:[origin[0]+x,origin[1]+y,origin[2]+z],...palette[indices[i]]});
 return {build:q,region,customRegion:custom,customExpected:expected,entries};
}
function installedResolutionGraph(candidate,consumer) {
 const graph={},queue=candidate.audit.entries.map(e=>realpathSync(join(consumer,'node_modules/hanaworlds-brush',e.file)));
 while(queue.length) {
  const file=queue.shift();if(graph[file])continue;
  assert.ok(file.startsWith(join(consumer,'node_modules')+'/'),'production resolved outside isolated install: '+file);
  const bytes=readFileSync(file),refs=[];
  if(/\.(?:mjs|cjs|js)$/.test(file)) {
   const ast=parse(bytes.toString(),{ecmaVersion:'latest',sourceType:'module'});
   const walk=node=>{if(!node||typeof node!=='object')return;
    if(['ImportDeclaration','ExportNamedDeclaration','ExportAllDeclaration'].includes(node.type)&&node.source)refs.push(node.source.value);
    for(const v of Object.values(node)){if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}
   };walk(ast);
  }
  const require=createRequire(file),resolved=Object.fromEntries(refs.map(ref=>[ref,ref.startsWith('node:')?ref:realpathSync(require.resolve(ref))]));
  graph[file]={sha256:sha256(bytes),imports:resolved};
  for(const path of Object.values(resolved))if(!path.startsWith('node:'))queue.push(path);
 }
 writeFileSync(join(consumer,'runtime-resolution-graph.json'),JSON.stringify(graph,null,2)+'\n');
 assert.ok(Object.keys(graph).some(f=>f.includes('canonicalize')&&f.endsWith('/lib/canonicalize.js')),'actual canonicalize runtime closure was not resolved');
}
export async function installAndSmoke(candidate,consumer,{expectFailure=false}={}) {
 mkdirSync(consumer,{recursive:true});const env=cleanEnv(consumer);
 const invoke=args=>run(process.execPath,[pnpm,...args],{cwd:consumer,env});
 assert.equal(invoke(['--version']).trim(),'11.28.5');
 for(const setting of ['blockExoticSubdeps','strictDepBuilds']) {
  const actual=invoke(['config','get',setting]).trim();
  assert.ok(['true','undefined'].includes(actual),'non-default strict setting '+setting+': '+actual);
  writeFileSync(join(consumer,setting+'.txt'),actual+'\n');
 }
 writeFileSync(join(consumer,'package.json'),JSON.stringify({name:'brush-production-consumer',private:true,type:'module',dependencies:{'hanaworlds-brush':'file:'+candidate.tgz}},null,2));
 let installation;
 try { installation=invoke(['install','--prod','--reporter=append-only','--store-dir',join(process.env.HOME,'.local/share/pnpm/store')]); }
 catch(error){writeFileSync(join(consumer,'install-failed.log'),String(error.stdout??'')+String(error.stderr??''));throw error;}
 writeFileSync(join(consumer,'install.log'),installation);
 const graph=invoke(['list','--prod','--depth','Infinity','--json']);writeFileSync(join(consumer,'production-graph.json'),graph);
 const lock=readFileSync(join(consumer,'pnpm-lock.yaml'),'utf8');
 assert.doesNotMatch(graph,/hanaworlds-contracts|typescript|esbuild/);assert.doesNotMatch(lock,/hanaworlds-contracts|git\+|github.com/);
 assert.ok(!existsSync(join(consumer,'node_modules/hanaworlds-contracts')));
 if(!expectFailure)installedResolutionGraph(candidate,consumer);
 const data=smokeInputs(candidate.audit.entries);
 // Expected responses are independently admitted by the public development validators.
 const b=await import('../dist/index.mjs');
 data.buildResponse=b.compileBuildDocument(data.build);c.validateBoundResponse('BUILD/V5','BuildDocument',data.build,data.buildResponse);
 data.regionResponse=data.region.compileResponse;data.region=data.region.compileRequest;
 data.customResponse=b.compileRegionBuild(data.customRegion);c.validateCompiledRegionSet(data.customRegion,data.customResponse);
 writeFileSync(join(consumer,'inputs.json'),JSON.stringify(data));
 cpSync(join(root,'test/production-smoke.mjs'),join(consumer,'smoke.mjs'));
 let output,error;
 try { output=run(process.execPath,['smoke.mjs'],{cwd:consumer,env}); }
 catch(e){error=e;output=String(e.stdout??'')+String(e.stderr??'');}
 writeFileSync(join(consumer,'smoke.log'),output);
 if(expectFailure) {assert.ok(error,'fault-injected artifact must fail actual loading');assert.match(output,/ERR_MODULE_NOT_FOUND|ERR_PACKAGE_IMPORT_NOT_DEFINED|Cannot find/);}
 else {if(error)throw error;assert.match(output,/"production":"PASS"/);}
 return {consumer,env,output};
}
