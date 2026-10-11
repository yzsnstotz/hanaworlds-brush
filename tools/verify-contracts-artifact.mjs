// Exact dev-only published tag/lock/package byte admission; never run against production consumers.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const brushRoot = resolve(process.argv[2] ?? fileURLToPath(new URL('..', import.meta.url)));
const { ADMITTED_CONTRACTS, contractsPackageUrl } = await import(pathToFileURL(join(brushRoot, 'tools/development-contracts.mjs')).href);
const pkgDir = dirname(fileURLToPath(contractsPackageUrl));
const listFiles = dir => readdirSync(dir, { recursive: true, withFileTypes: true })
  .filter(d => d.isFile()).map(d => relative(dir, join(d.parentPath, d.name))).sort();
const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
const brushPkg = JSON.parse(readFileSync(join(brushRoot, 'package.json'), 'utf8'));
for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
 if (brushPkg[field]?.[ADMITTED_CONTRACTS.name]) throw new Error('Production contracts dependency: ' + field);
}
const declared = brushPkg.devDependencies?.[ADMITTED_CONTRACTS.name] ?? null;
let lockResolved = null;
let lockDeclared = null;
let lockVersion = null;
try {
  const lock = JSON.parse(readFileSync(join(brushRoot, 'package-lock.json'), 'utf8'));
  lockResolved = lock.packages?.[`node_modules/${ADMITTED_CONTRACTS.name}`]?.resolved ?? null;
  lockVersion = lock.packages?.[`node_modules/${ADMITTED_CONTRACTS.name}`]?.version ?? null;
  lockDeclared = lock.packages?.['']?.devDependencies?.[ADMITTED_CONTRACTS.name] ?? null;
}
catch (error) { if (error.code !== 'ENOENT') throw error; } // Missing development lock is a failed admission, never production validation.
const lockMatchesRelease = (lockDeclared === ADMITTED_CONTRACTS.dependency && lockVersion === ADMITTED_CONTRACTS.version && lockResolved === 'git+ssh://git@github.com/yzsnstotz/hanaworlds-contracts.git#ee53aed37117bc859d9cbb2aedee9ea7d8dfc8b1');
const out = mkdtempSync(join(process.env.BRUSH_VERIFY_TMP ?? tmpdir(), 'brush-contracts-pack-'));
try {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const [packed] = JSON.parse(execFileSync(npm, ['pack', pkgDir, '--pack-destination', out, '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }));
  const sha256 = createHash('sha256').update(readFileSync(join(out, packed.filename))).digest('hex');
  // All 39 release paths and byte hashes admitted from the fresh locked v2.2.1 install.
  // This equals the original build-provenance sdkFilesSha256. npm/Node gzip encoders
  // can produce different compressed bytes for the very same tar; admission must
  // pin release contents, rather than compressor output or a self-comparison.
  const expectedSdkFilesSha256 = 'd6bc03848d95ea94ba07b0cbe05bd67f1031aca84a7ce0c154e41238324199b6';
  const extract = join(out, 'x');
  mkdirSync(extract);
  execFileSync('tar', ['-xzf', join(out, packed.filename), '-C', extract]);
  const packedFiles = listFiles(join(extract, 'package'));
  const sdkFiles = Object.fromEntries(packedFiles.map(f => [f,
    createHash('sha256').update(readFileSync(join(extract, 'package', f))).digest('hex')]));
  const sdkFilesSha256 = createHash('sha256').update(JSON.stringify(sdkFiles)).digest('hex');
  const presentFiles = listFiles(pkgDir);
  const mismatched = packedFiles.filter(f => !readFileSync(join(extract, 'package', f)).equals(readFileSync(join(pkgDir, f))));
  const extra = presentFiles.filter(f => !packedFiles.includes(f));
  const report = {
    admitted: ADMITTED_CONTRACTS, brushRoot, declared, lockResolved, lockMatchesRelease, checkedDir: pkgDir, name: pkg.name, version: pkg.version,
    repackSha256: sha256, sdkFilesSha256, expectedSdkFilesSha256, entries: packed.entryCount, mismatchedFiles: mismatched, extraFiles: extra,
    declaredIsReleaseTag: declared === ADMITTED_CONTRACTS.dependency,
    versionIsRelease: pkg.version === ADMITTED_CONTRACTS.version,
    match: lockMatchesRelease && sdkFilesSha256 === expectedSdkFilesSha256 && declared === ADMITTED_CONTRACTS.dependency && pkg.name === ADMITTED_CONTRACTS.name &&
      pkg.version === ADMITTED_CONTRACTS.version && mismatched.length === 0 && extra.length === 0,
  };
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.match ? 0 : 1;
} finally {
  rmSync(out, { recursive: true, force: true });
}
