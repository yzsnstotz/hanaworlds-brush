// Maintainer tool: (re)create vendor/hanaworlds-contracts from the exact
// independently admitted hanaworlds-contracts artifact.
//
//   node tools/vendor-contracts.mjs
//
// Downloads the pinned public source tarball, packs it with npm (deterministic
// tar, --ignore-scripts), refuses unless the pack SHA-256 and entry count equal
// the admitted values, extracts the pack's `package/` into a sibling staging
// directory under vendor/ (same volume), then swaps it in with renames: the old
// copy is moved aside first and removed only after the new one is in place.
// Needs network and npm; never runs at install or runtime.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADMITTED_CONTRACTS } from './admitted-contracts.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = mkdtempSync(join(process.env.BRUSH_VERIFY_TMP ?? tmpdir(), 'brush-vendor-contracts-'));
try {
  const response = await fetch(ADMITTED_CONTRACTS.sourceTarball);
  if (!response.ok) throw new Error(`download failed: HTTP ${response.status}`);
  writeFileSync(join(work, 'source.tar.gz'), Buffer.from(await response.arrayBuffer()));
  mkdirSync(join(work, 'source'));
  execFileSync('tar', ['-xzf', join(work, 'source.tar.gz'), '-C', join(work, 'source'), '--strip-components', '1']);
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const [packed] = JSON.parse(execFileSync(npm, ['pack', join(work, 'source'), '--ignore-scripts', '--pack-destination', work, '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }));
  const sha256 = createHash('sha256').update(readFileSync(join(work, packed.filename))).digest('hex');
  if (sha256 !== ADMITTED_CONTRACTS.sha256) throw new Error(`pack ${sha256} != admitted ${ADMITTED_CONTRACTS.sha256}`);
  if (packed.entryCount !== ADMITTED_CONTRACTS.entries) throw new Error(`pack entries ${packed.entryCount} != admitted ${ADMITTED_CONTRACTS.entries}`);
  const vendor = join(root, 'vendor');
  mkdirSync(vendor, { recursive: true });
  const staging = mkdtempSync(join(vendor, '.hanaworlds-contracts-staging-'));
  try {
    execFileSync('tar', ['-xzf', join(work, packed.filename), '-C', staging]);
    const target = join(vendor, 'hanaworlds-contracts');
    const previous = `${target}.previous`;
    rmSync(previous, { recursive: true, force: true });
    if (existsSync(target)) renameSync(target, previous);
    try {
      renameSync(join(staging, 'package'), target);
    } catch (error) {
      if (existsSync(previous)) renameSync(previous, target);   // restore the old copy, then report
      throw error;
    }
    rmSync(previous, { recursive: true, force: true });
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
  console.log(JSON.stringify({ vendored: 'vendor/hanaworlds-contracts', sha256, entries: packed.entryCount }));
} finally {
  rmSync(work, { recursive: true, force: true });
}
