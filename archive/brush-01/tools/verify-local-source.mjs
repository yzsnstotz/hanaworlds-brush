import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
for(const f of ['index.mjs','compile.mjs','expand.mjs']) {
 const s=readFileSync(new URL(`../src/${f}`,import.meta.url),'utf8');
 assert.doesNotMatch(s,/node:(?:fs|child_process|net|http|https)|\bfetch\s*\(|\bDate\b|Math\.random|hanaworlds-(?:canvas|workshop|adapter|building|desktop)/);
 assert.doesNotMatch(s,/BUILD\/V2|operations\/v2|authorizationRef|grantEpoch|PROTECTION/);
}
// Original algorithm retained exactly, except protocol name in a comment.
const baseline=execFileSync('git',['show','dfbf8e0:src/expand.mjs'],{encoding:'utf8'}).replaceAll('BUILD/V2','BUILD/V3');
assert.equal(readFileSync(new URL('../src/expand.mjs',import.meta.url),'utf8'),baseline);
console.log(JSON.stringify({evidence:'SOURCE',pureCompiler:true,peerImports:0,unchangedExpander:'dfbf8e0',worldWrites:0}));
