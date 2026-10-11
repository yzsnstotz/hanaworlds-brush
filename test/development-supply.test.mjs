import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('the exact development SDK is admitted with the current npm compression toolchain', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  // This failed under the self-check's Node 25/npm 11.9 despite identical release files.
  // Run the real verifier and normal npm pack, without a toolchain override.
  const report = JSON.parse(execFileSync(process.execPath,
    [fileURLToPath(new URL('../tools/verify-contracts-artifact.mjs', import.meta.url))],
    { cwd: root, encoding: 'utf8' }));
  assert.equal(report.match, true);
  assert.equal(report.entries, 39);
  assert.equal(report.lockMatchesRelease, true);
});
