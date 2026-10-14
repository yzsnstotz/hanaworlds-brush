import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('the self-owned C-brush document source closure is verified by the real local verifier', () => {
  const root=fileURLToPath(new URL('..',import.meta.url));
  const report=JSON.parse(execFileSync(process.execPath,
    [fileURLToPath(new URL('../tools/verify-contracts-artifact.mjs',import.meta.url))],
    {cwd:root,encoding:'utf8'}));
  assert.equal(report.match,true);assert.equal(report.contract,'C-brush/v3');
  assert.ok(report.definitions>0);assert.equal(report.dependenciesIndependent,true);
  assert.equal(report.lockIndependent,true);
  for(const key of ['schemaSha256','metadataSha256','typesSha256'])assert.match(report[key],/^[a-f0-9]{64}$/);
});
