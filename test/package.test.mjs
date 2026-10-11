import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const suites = ['local-build', 'region', 'image-contracts', 'shapes'].map(name => join(root, `test/${name}.test.mjs`));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const run = (command, args, options = {}) => execFileSync(command, args, {
  cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options,
});

test('normal npm pack consumes published APIs without D-18 panels and preserves D-14 geometry/source/license', () => {
  assert.equal(existsSync(join(root, 'archive/brush-01')), false, 'D-18 archive must live outside the repository');
  const out = mkdtempSync(join(process.env.BRUSH_VERIFY_TMP ?? tmpdir(), 'brush-package-'));
  try {
    // Deliberately use normal pack: no --ignore-scripts or custom file filter.
    const [packed] = JSON.parse(run(npm, ['pack', '--pack-destination', out, '--json']));
    const files = packed.files.map(file => file.path);
    assert.ok(files.length > 0);
    for (const path of files) assert.doesNotMatch(path, /^(?:archive|preview|tools|test)\//, path);
    for (const path of ['NOTICE', 'types/index.d.mts', 'src/shapes/index.mjs', 'src/shapes/upstream/source.json',
      'src/shapes/upstream/primitives.lua', 'src/shapes/upstream/common.lua',
      'src/shapes/upstream/LICENSE.txt', 'src/shapes/upstream/LICENSE.AGPLv3.txt']) assert.ok(files.includes(path), path);

    const consumer = join(out, 'consumer');
    mkdirSync(consumer);
    writeFileSync(join(consumer, 'package.json'), JSON.stringify({ name: 'brush-packed-consumer', private: true, type: 'module' }));
    run(npm, ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', join(out, packed.filename)], { cwd: consumer });
    // Resolve the package root from a real external consumer, through exports.
    const entry = run(process.execPath, ['--input-type=module', '-e', "console.log(import.meta.resolve('hanaworlds-brush'))"], { cwd: consumer }).trim();
    const installed = dirname(dirname(fileURLToPath(entry)));
    for (const path of files) assert.deepEqual(readFileSync(join(installed, path)), readFileSync(join(root, path)), path);
    const env = { ...process.env, BRUSH_UNDER_TEST: entry };
    delete env.NODE_TEST_CONTEXT;
    const installedOutput = run(process.execPath, ['--test', '--test-reporter=tap', ...suites], { cwd: consumer, env });
    assert.match(installedOutput, /# fail 0\b/);
    const installedTests = Number(installedOutput.match(/# tests (\d+)/)?.[1]);
    assert.ok(installedTests > 0, 'the installed suites must actually execute tests');
    run(process.execPath, [join(root, 'tools/verify-contracts-artifact.mjs'), installed], { cwd: consumer });
    writeFileSync(join(consumer, 'consumer.mts'), readFileSync(join(root, 'test/consumer.mts')));
    run(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '--strict', '--module', 'nodenext',
      '--moduleResolution', 'nodenext', '--target', 'es2022', join(consumer, 'consumer.mts')], { cwd: consumer });
    console.log(JSON.stringify({ evidence: 'PACK/FIXTURE', entries: packed.entryCount,
      sha256: createHash('sha256').update(readFileSync(join(out, packed.filename))).digest('hex'),
      installedSuites: suites.length, installedTests, publicConsumerTypes: 'PASS', worldAccess: 'NONE' }));
  } catch (error) {
    // Preserve the actual child failure in the gate output; never retry it.
    if (error.stdout) process.stderr.write(error.stdout);
    if (error.stderr) process.stderr.write(error.stderr);
    throw error;
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
