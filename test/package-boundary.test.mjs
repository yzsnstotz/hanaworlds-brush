import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { root } from '../tools/package-harness.mjs';
import { auditArtifact } from '../tools/artifact-boundary.mjs';
import { normalPack, installAndSmoke, run, pnpm, cleanEnv } from '../tools/package-harness.mjs';

const out=mkdtempSync(join(process.env.BRUSH_VERIFY_TMP??tmpdir(),'brush-boundary-'));
const candidate=normalPack(join(out,'normal-pack'));
const negative=(name,edit)=>{
 const dir=join(out,name);mkdirSync(dir);cpSync(candidate.artifact,join(dir,'package'),{recursive:true});
 edit(join(dir,'package'));
 const tgz=join(dir,name+'.tgz');run('tar',['-czf',tgz,'-C',dir,'package']);
 const extract=join(dir,'extract');mkdirSync(extract);run('tar',['-xzf',tgz,'-C',extract]);
 return {...candidate,tgz,artifact:join(extract,'package')};
};
const manifest=(dir,edit)=>{const path=join(dir,'package.json'),p=JSON.parse(readFileSync(path));edit(p);writeFileSync(path,JSON.stringify(p,null,2));};
test('real normal tgz installs under pnpm 11.28.5 default strict policy and compiles through every public runtime entry without a contracts runtime',async()=>{
 const result=await installAndSmoke(candidate,join(out,'production'));
 console.log(JSON.stringify({evidence:'REAL_TGZ/PRODUCTION/PURE_CAPABILITY',directory:out,output:result.output.trim()}));
});
for(const field of ['dependencies','peerDependencies','optionalDependencies'])test('tgz rejects contracts in '+field,()=>{
 const bad=negative(field,dir=>manifest(dir,p=>{p[field]??={};p[field]['hanaworlds-contracts']=p.devDependencies['hanaworlds-contracts'];}));
 assert.throws(()=>auditArtifact(bad.artifact),/production contracts dependency/);
});
for(const [name,source,pattern] of [
 ['bare-sdk',"import 'hanaworlds-contracts';",/runtime contracts load/],
 ['value-sdk',"const sdk=await import('hanaworlds-contracts');",/runtime contracts load/],
 ['hash-sdk',"import '#contracts';",/runtime contracts load/],
 ['schema-load',"await import('hanaworlds-contracts/schema',{with:{type:'json'}});",/runtime contracts load/],
 ['fixture-resolve',"import.meta.resolve('hanaworlds-contracts/fixtures/main');",/runtime resource resolver/],
 ['aliased-resolve',"const locate=import.meta.resolve;locate('hanaworlds-contracts/schema');",/runtime resource resolver/],
 ['destructured-resolve',"const {resolve:locate}=import.meta;locate('hanaworlds-contracts/package.json');",/runtime resource resolver/],
 ['computed-resolve',"const url='resolve';const locate=import.meta[url];locate('hanaworlds-contracts/package.json');",/runtime resource resolver/],
 ['aliased-require',"const load=require;load('hanaworlds-contracts');",/aliased runtime loader/],
 ['aliased-builtin',"const load=process.getBuiltinModule;load('fs');",/indirect runtime loader/],
 ['package-read',"import {readFileSync} from 'node:fs';readFileSync('/dev/sdk/package.json');",/runtime I\/O/],
 ['computed-import',"await import(process.env.SDK_ENTRY);",/computed runtime loader/],
 ['require-sdk',"require('hanaworlds-contracts');",/runtime contracts load/],
 ['unpacked-local',"import './missing.mjs';",/unpacked local dependency/],
 ['escaped-local',"import '../../dev/fixture.mjs';",/escaped local resource/],
 ['undeclared-local',"import 'missing-local-package';",/undeclared runtime dependency/],
])test('real mutated tgz rejects '+name,()=>{
 const bad=negative(name,dir=>writeFileSync(join(dir,'dist/index.mjs'),source));
 assert.throws(()=>auditArtifact(bad.artifact),pattern);
});
test('wrong build-source commit is rejected in the real tgz',()=>{
 const bad=negative('wrong-source',dir=>{const path=join(dir,'build-provenance.json'),p=JSON.parse(readFileSync(path));p.sourceCommit='0'.repeat(40);writeFileSync(path,JSON.stringify(p));});
 assert.throws(()=>auditArtifact(bad.artifact),/wrong build source/);
});
test('wrong resolved repository source is rejected in the real tgz',()=>{
 const bad=negative('wrong-resolved-source',dir=>{const path=join(dir,'build-provenance.json'),p=JSON.parse(readFileSync(path));p.resolved=p.resolved.replace('github.com/yzsnstotz','github.com/wrong-provider');writeFileSync(path,JSON.stringify(p));});
 assert.throws(()=>auditArtifact(bad.artifact),/wrong resolved source/);
});
test('package imports cannot retain dormant contracts runtime mapping',()=>{
 const bad=negative('imports-map',dir=>manifest(dir,p=>p.imports={'#contracts':'hanaworlds-contracts'}));
 assert.throws(()=>auditArtifact(bad.artifact),/contracts package import/);
});
test('dormant package imports cannot reference an unpacked local resource',()=>{
 const bad=negative('imports-missing',dir=>manifest(dir,p=>p.imports={'#resource':'./missing.json'}));
 assert.throws(()=>auditArtifact(bad.artifact),/unpacked local dependency/);
});
test('production dependency aliases cannot hide the contracts package',()=>{
 const bad=negative('dependency-alias',dir=>manifest(dir,p=>p.dependencies.sdk='npm:hanaworlds-contracts@2.2.1'));
 assert.throws(()=>auditArtifact(bad.artifact),/production contracts dependency/);
});
test('a nested SDK fixture directory cannot be distributed as a local artifact',()=>{
 const bad=negative('nested-fixtures',dir=>{mkdirSync(join(dir,'dist/sdk/fixtures'),{recursive:true});writeFileSync(join(dir,'dist/sdk/fixtures/main.json'),'{}');});
 assert.throws(()=>auditArtifact(bad.artifact),/non-artifact file/);
});
test('a nested resolvable SDK package cannot be distributed',()=>{
 const bad=negative('nested-sdk-package',dir=>{mkdirSync(join(dir,'dist/sdk'),{recursive:true});writeFileSync(join(dir,'dist/sdk/package.json'),JSON.stringify({name:'hanaworlds-contracts',version:'2.2.1'}));});
 assert.throws(()=>auditArtifact(bad.artifact),/nested contracts package/);
});
test('actual strict pnpm install rejects the old transitive git SDK dependency',()=>{
 const bad=negative('exotic-runtime',dir=>manifest(dir,p=>p.dependencies['hanaworlds-contracts']=p.devDependencies['hanaworlds-contracts']));
 const consumer=join(out,'exotic-production');mkdirSync(consumer);writeFileSync(join(consumer,'package.json'),JSON.stringify({private:true,dependencies:{'hanaworlds-brush':'file:'+bad.tgz}}));
 let error;try{run(process.execPath,[pnpm,'install','--prod','--reporter=append-only'],{cwd:consumer,env:cleanEnv(consumer)});}catch(e){error=e;}
 assert.ok(error,'pnpm must reject transitive git');
 const log=String(error.stdout??'')+String(error.stderr??'');writeFileSync(join(consumer,'install-failed.log'),log);
 assert.match(log,/ERR_PNPM.*EXOTIC|exotic.*subdepend|not.*allowed.*git/is);
});
test('actual production installation and loading fail if the generated SDK bundle is omitted',async()=>{
 const bad=negative('missing-bundle',dir=>rmSync(join(dir,'dist/contracts.mjs')));
 assert.throws(()=>auditArtifact(bad.artifact),/unpacked local dependency/);
 await installAndSmoke(bad,join(out,'missing-production'),{expectFailure:true});
});
test('actual production value-loading fails for an unbundled SDK import',async()=>{
 const bad=negative('unbundled-value',dir=>writeFileSync(join(dir,'dist/contracts.mjs'),"export * from 'hanaworlds-contracts';\n"));
 assert.throws(()=>auditArtifact(bad.artifact),/runtime contracts load/);
 await installAndSmoke(bad,join(out,'value-production'),{expectFailure:true});
});
test('strictDepBuilds actually rejects a dependency with an unapproved install script',()=>{
 const bad=negative('unapproved-build',dir=>manifest(dir,p=>p.scripts.postinstall='node -e "process.exit(0)"'));
 const consumer=join(out,'unapproved-production');mkdirSync(consumer);
 writeFileSync(join(consumer,'package.json'),JSON.stringify({private:true,dependencies:{'hanaworlds-brush':'file:'+bad.tgz}}));
 let error;try{run(process.execPath,[pnpm,'install','--prod','--reporter=append-only','--store-dir',join(process.env.HOME,'.local/share/pnpm/store')],{cwd:consumer,env:cleanEnv(consumer)});}catch(e){error=e;}
 assert.ok(error,'default strictDepBuilds must reject unapproved dependency scripts');
 const log=String(error.stdout??'')+String(error.stderr??'');writeFileSync(join(consumer,'install-failed.log'),log);
 assert.match(log,/ERR_PNPM_IGNORED_BUILDS|unreviewed|not.*approved|not.*allowed.*build/is);
});
for(const name of ['missing-sdk','wrong-dev-source','wrong-lock-source','edited-sdk'])test('development supply validation actually rejects '+name,()=>{
 const dev=join(out,name);mkdirSync(join(dev,'tools'),{recursive:true});
 for(const f of ['package.json','package-lock.json','tools/development-contracts.mjs','tools/verify-contracts-artifact.mjs'])cpSync(join(root,f),join(dev,f));
 if(name!=='missing-sdk')cpSync(join(root,'node_modules/hanaworlds-contracts'),join(dev,'node_modules/hanaworlds-contracts'),{recursive:true});
 if(name==='wrong-dev-source')manifest(dev,p=>p.devDependencies['hanaworlds-contracts']=p.devDependencies['hanaworlds-contracts'].replace('v2.2.1','v2.2.0'));
 if(name==='wrong-lock-source'){const path=join(dev,'package-lock.json'),lock=JSON.parse(readFileSync(path));lock.packages['node_modules/hanaworlds-contracts'].resolved=lock.packages['node_modules/hanaworlds-contracts'].resolved.replace('github.com/yzsnstotz','github.com/wrong-provider');writeFileSync(path,JSON.stringify(lock));}
 if(name==='edited-sdk'){const f=join(dev,'node_modules/hanaworlds-contracts/dist/local/index.mjs');writeFileSync(f,readFileSync(f,'utf8')+'\n// deliberately edited SDK\n');}
 let error;try{run(process.execPath,[join(dev,'tools/verify-contracts-artifact.mjs'),dev]);}catch(e){error=e;}
 assert.ok(error,'bad development supply must fail');
 const log=String(error.stdout??'')+String(error.stderr??'');writeFileSync(join(dev,'verify-failed.log'),log);
 if(name==='missing-sdk')assert.match(log,/ERR_MODULE_NOT_FOUND/);else assert.match(log,/"match": false/);
});

test('a boolean environment switch cannot bypass the real tgz gate',()=>{
 assert.throws(()=>run(process.execPath,[join(root,'tools/package-boundary.mjs')],{env:{...process.env,BRUSH_BOUNDARY_NESTED_PACK:'1'}}),/Boolean boundary bypass/);
});
