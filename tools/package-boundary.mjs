import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { auditArtifact } from './artifact-boundary.mjs';
import { root } from './package-harness.mjs';

// A boundary invocation packs normally, which invokes prepack/build again.
// Only that inner pack uses a staging audit to end the recursion; scripts still run.
// Every outer build, test:package-boundary and prepack executes the real tgz tests.
if(process.env.BRUSH_BOUNDARY_NESTED_PACK)throw new Error('Boolean boundary bypass is not supported');
if(process.env.BRUSH_BOUNDARY_PACK_RECEIPT) {
 const {receipt,nonce}=JSON.parse(process.env.BRUSH_BOUNDARY_PACK_RECEIPT);
 const owner=JSON.parse(readFileSync(receipt));
 assert.equal(owner.nonce,nonce,'wrong nested pack nonce');assert.equal(owner.root,root,'wrong nested pack root');
 assert.equal(owner.consumed,false,'nested pack receipt already consumed');
 process.kill(owner.ownerPid,0); // the issuing real-tgz gate must still be alive
 const stage=mkdtempSync(join(process.env.BRUSH_VERIFY_TMP??tmpdir(),'brush-pack-stage-'));
 const pkg=JSON.parse(readFileSync(join(root,'package.json')));
 for(const f of ['package.json',...pkg.files])cpSync(join(root,f),join(stage,f),{recursive:true});
 const audit=auditArtifact(stage);
 writeFileSync(receipt,JSON.stringify({...owner,consumed:true,stage}));
 console.log(JSON.stringify({nestedPackStagingAudit:'PASS',publicEntries:audit.entries.map(x=>x.specifier)}));
} else {
 execFileSync(process.execPath,['--test','test/package-boundary.test.mjs'],{cwd:root,env:process.env,stdio:'inherit'});
}
