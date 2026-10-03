// Verify that vendor/hanaworlds-contracts (or the directory given as argv[2],
// e.g. an installed copy) is byte-for-byte the independently admitted
// hanaworlds-contracts artifact named in tools/admitted-contracts.mjs: repack it with npm (deterministic tar)
// and compare SHA-256, then require the directory to contain exactly the
// packed files with identical bytes. Exit 0 only on an exact match.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADMITTED_CONTRACTS } from './admitted-contracts.mjs';

const pkgDir = resolve(process.argv[2] ?? fileURLToPath(new URL('../vendor/hanaworlds-contracts', import.meta.url)));
const listFiles = dir => readdirSync(dir, { recursive: true, withFileTypes: true })
  .filter(d => d.isFile()).map(d => relative(dir, join(d.parentPath, d.name))).sort();
const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
const out = mkdtempSync(join(process.env.BRUSH_VERIFY_TMP ?? tmpdir(), 'brush-contracts-pack-'));
try {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const [packed] = JSON.parse(execFileSync(npm, ['pack', pkgDir, '--ignore-scripts', '--pack-destination', out, '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }));
  const sha256 = createHash('sha256').update(readFileSync(join(out, packed.filename))).digest('hex');
  const extract = join(out, 'x');
  mkdirSync(extract);
  execFileSync('tar', ['-xzf', join(out, packed.filename), '-C', extract]);
  const packedFiles = listFiles(join(extract, 'package'));
  const presentFiles = listFiles(pkgDir);
  const mismatched = packedFiles.filter(f => !readFileSync(join(extract, 'package', f)).equals(readFileSync(join(pkgDir, f))));
  const extra = presentFiles.filter(f => !packedFiles.includes(f));
  const report = {
    admitted: ADMITTED_CONTRACTS, checkedDir: pkgDir, name: pkg.name, version: pkg.version,
    repackSha256: sha256, entries: packed.entryCount, mismatchedFiles: mismatched, extraFiles: extra,
    match: pkg.name === ADMITTED_CONTRACTS.name && pkg.version === ADMITTED_CONTRACTS.version &&
      sha256 === ADMITTED_CONTRACTS.sha256 && packed.entryCount === ADMITTED_CONTRACTS.entries &&
      mismatched.length === 0 && extra.length === 0,
  };
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.match ? 0 : 1;
} finally {
  rmSync(out, { recursive: true, force: true });
}
