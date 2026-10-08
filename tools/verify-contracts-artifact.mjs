// Verify that the hanaworlds-contracts package a Brush resolves through #contracts
// (this repository, or the installed Brush root given as argv[2]) is byte-for-byte
// the admitted package named by that Brush's src/contracts.mjs: repack it with npm
// (deterministic tar) and compare name, version, SHA-256 and entry count, then
// require the directory to hold exactly the packed files with identical bytes.
// Where the package lives (vendored or installed) is not part of the check.
// Exit 0 only on an exact match.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const brushRoot = resolve(process.argv[2] ?? fileURLToPath(new URL('..', import.meta.url)));
const { ADMITTED_CONTRACTS, contractsPackageUrl } = await import(pathToFileURL(join(brushRoot, 'src/contracts.mjs')).href);
const pkgDir = dirname(fileURLToPath(contractsPackageUrl));
const listFiles = dir => readdirSync(dir, { recursive: true, withFileTypes: true })
  .filter(d => d.isFile()).map(d => relative(dir, join(d.parentPath, d.name))).sort();
const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
const out = mkdtempSync(join(process.env.BRUSH_VERIFY_TMP ?? tmpdir(), 'brush-contracts-pack-'));
try {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const [packed] = JSON.parse(execFileSync(npm, ['pack', pkgDir, '--ignore-scripts', '--pack-destination', out, '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], env: { ...process.env, NPM_CONFIG_CACHE: join(out, 'npm-cache'), npm_config_cache: join(out, 'npm-cache') } }));
  const sha256 = createHash('sha256').update(readFileSync(join(out, packed.filename))).digest('hex');
  const extract = join(out, 'x');
  mkdirSync(extract);
  execFileSync('tar', ['-xzf', join(out, packed.filename), '-C', extract]);
  const packedFiles = listFiles(join(extract, 'package'));
  const presentFiles = listFiles(pkgDir);
  const mismatched = packedFiles.filter(f => !readFileSync(join(extract, 'package', f)).equals(readFileSync(join(pkgDir, f))));
  const extra = presentFiles.filter(f => !packedFiles.includes(f));
  const report = {
    admitted: ADMITTED_CONTRACTS, brushRoot, checkedDir: pkgDir, name: pkg.name, version: pkg.version,
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
