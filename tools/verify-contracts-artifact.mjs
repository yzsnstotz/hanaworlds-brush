// Verify that the installed hanaworlds-contracts package is byte-for-byte the
// independently admitted 0.2.1 artifact: repack the installed directory with
// npm (deterministic tar) and compare SHA-256, then compare every packed file
// with the installed bytes. Exit 0 only on an exact match.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';

const ADMITTED = {
  name: 'hanaworlds-contracts', version: '0.2.1',
  source: 'https://github.com/yzsnstotz/hanaworlds-contracts@5ecfce1ba47530b42bba60a674bd16f7bc39c665',
  sha256: 'd91b8950a07d6f5fb2a3b8b614c3157487e2e67e2b108a6599a2e05d0b452945',
};

const require = createRequire(import.meta.url);
const pkgDir = dirname(require.resolve('hanaworlds-contracts/package.json'));
const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
const out = mkdtempSync(join(process.env.BRUSH_VERIFY_TMP ?? tmpdir(), 'brush-contracts-pack-'));
try {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const [packed] = JSON.parse(execFileSync(npm, ['pack', pkgDir, '--ignore-scripts', '--pack-destination', out, '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }));
  const tar = readFileSync(join(out, packed.filename));
  const sha256 = createHash('sha256').update(tar).digest('hex');
  const mismatched = [];
  const extract = join(out, 'x');
  mkdirSync(extract);
  execFileSync('tar', ['-xzf', join(out, packed.filename), '-C', extract]);
  for (const f of packed.files) {
    const a = readFileSync(join(extract, 'package', f.path)), b = readFileSync(join(pkgDir, f.path));
    if (!a.equals(b)) mismatched.push(f.path);
  }
  const report = {
    admitted: ADMITTED, installed: { name: pkg.name, version: pkg.version, dir: 'node_modules/hanaworlds-contracts' },
    repackSha256: sha256, entries: packed.entryCount, installedBytesMatchTar: mismatched.length === 0,
    match: pkg.name === ADMITTED.name && pkg.version === ADMITTED.version && sha256 === ADMITTED.sha256 && mismatched.length === 0,
  };
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.match ? 0 : 1;
} finally {
  rmSync(out, { recursive: true, force: true });
}
