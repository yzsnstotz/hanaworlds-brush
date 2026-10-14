import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalPack, installAndSmoke, root, run, cleanEnv, verificationRoot } from '../tools/package-harness.mjs';
import { sha256 } from '../tools/artifact-boundary.mjs';

test('normal npm pack preserves every geometry/document/safety/type consumer gate and legal source',async()=>{
 assert.equal(existsSync(join(root,'archive/brush-01')),false,'D-18 archive remains outside repository');
 const out=mkdtempSync(join(verificationRoot,'brush-package-'));
 const candidate=normalPack(join(out,'pack'));
 const files=candidate.packed.files.map(f=>f.path);
 for(const f of files)assert.doesNotMatch(f,/^(?:archive|preview|tools|test|src)\//);
 for(const f of ['NOTICE','types/index.d.mts','dist/shapes/index.mjs','dist/shapes/upstream/source.json',
 'dist/shapes/upstream/primitives.lua','dist/shapes/upstream/common.lua','dist/shapes/upstream/LICENSE.txt',
 'dist/shapes/upstream/LICENSE.AGPLv3.txt'])assert.ok(files.includes(f),f);
 const {consumer,env}=await installAndSmoke(candidate,join(out,'production'));
 const installed=join(consumer,'node_modules/hanaworlds-brush');
 for(const f of files)assert.deepEqual(readFileSync(join(installed,f)),readFileSync(join(root,f)),f);
 const entry=run(process.execPath,['--input-type=module','-e',"console.log(import.meta.resolve('hanaworlds-brush'))"],{cwd:consumer,env}).trim();
 const suites=['local-build','region','image-contracts','shapes'].map(n=>join(root,`test/${n}.test.mjs`));
 const fixtureEnv={...process.env,BRUSH_UNDER_TEST:entry};delete fixtureEnv.NODE_TEST_CONTEXT;
 const output=run(process.execPath,['--test','--test-reporter=tap',...suites],{cwd:consumer,env:fixtureEnv});
 writeFileSync(join(out,'installed-document-suites.log'),output);assert.match(output,/# fail 0\b/);
 const tests=Number(output.match(/# tests (\d+)/)?.[1]);assert.ok(tests>0);
 // Public declarations are complete in the Brush artifact; no supplier is installed.
 const types=join(out,'types-consumer');mkdirSync(types);
 writeFileSync(join(types,'package.json'),JSON.stringify({private:true,type:'module',dependencies:{'hanaworlds-brush':'file:'+candidate.tgz},devDependencies:{typescript:'5.8.3'}}));
 run('npm',['install','--no-audit','--no-fund'],{cwd:types,env:cleanEnv(types)});
 writeFileSync(join(types,'consumer.mts'),readFileSync(join(root,'test/consumer.mts')));
 run(process.execPath,[join(types,'node_modules/typescript/bin/tsc'),'--noEmit','--strict','--module','nodenext','--moduleResolution','nodenext','--target','es2022',join(types,'consumer.mts')],{cwd:types});
 console.log(JSON.stringify({evidence:'PACK/PRODUCTION + DOCUMENT_REGRESSIONS/SELF_OWNED_TYPES',directory:out,sha256:sha256(readFileSync(candidate.tgz)),installedSuites:suites.length,installedTests:tests,publicConsumerTypes:'PASS',worldAccess:'NONE'}));
});
