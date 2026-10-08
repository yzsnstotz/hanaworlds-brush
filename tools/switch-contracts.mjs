// Re-pin Brush to an installed hanaworlds-contracts package (first used to drop the vendored copy).
// Usage: node tools/switch-contracts.mjs --tar /abs/hanaworlds-contracts-X.tgz --spec <npm dependency spec> --revision <contracts commit>
// The identity (name, version, SHA-256, entry count) is read from the given npm tar, which must be
// the exact package --spec installs; verify:contracts then checks the installed copy against it.
// Rewrites package.json imports/dependency/files, the ADMITTED_CONTRACTS block in src/contracts.mjs,
// and deletes vendor/ and the vendoring tool. Run `npm install` afterwards.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values: a } = parseArgs({ options: { tar: { type: 'string' }, spec: { type: 'string' }, revision: { type: 'string' },
  source: { type: 'string', default: 'https://github.com/yzsnstotz/hanaworlds-contracts' } } });
if (!a.tar || !a.spec || !/^[0-9a-f]{40}$/.test(a.revision ?? '')) throw new Error('Usage: --tar <abs tgz> --spec <npm spec> --revision <40-hex commit>');
const root = new URL('..', import.meta.url);
const at = p => new URL(p, root);

const sha256 = createHash('sha256').update(readFileSync(a.tar)).digest('hex');
const entries = execFileSync('tar', ['-tzf', a.tar], { encoding: 'utf8' }).split('\n').filter(l => l && !l.endsWith('/')).length;
const tarPkg = JSON.parse(execFileSync('tar', ['-xOzf', a.tar, 'package/package.json'], { encoding: 'utf8' }));
if (tarPkg.name !== 'hanaworlds-contracts') throw new Error(`Not a contracts package: ${tarPkg.name}`);
const admitted = { name: tarPkg.name, version: tarPkg.version, source: a.source, revision: a.revision, sha256, entries };

const pkg = JSON.parse(readFileSync(at('package.json'), 'utf8'));
pkg.imports = { '#contracts': tarPkg.name, '#contracts/package.json': `${tarPkg.name}/package.json`, '#contracts/fixtures/*': `${tarPkg.name}/fixtures/*` };
pkg.dependencies = { ...pkg.dependencies, [tarPkg.name]: a.spec };
pkg.files = pkg.files.filter(f => f !== 'vendor/');
delete pkg.scripts['vendor:contracts'];
writeFileSync(at('package.json'), JSON.stringify(pkg, null, 2) + '\n');

const src = readFileSync(at('src/contracts.mjs'), 'utf8');
const block = /export const ADMITTED_CONTRACTS = Object\.freeze\(\{[\s\S]*?\n\}\);/;
if (!block.test(src)) throw new Error('ADMITTED_CONTRACTS block not found in src/contracts.mjs');
const literal = `export const ADMITTED_CONTRACTS = Object.freeze({
  name: '${admitted.name}', version: '${admitted.version}',
  source: '${admitted.source}',
  revision: '${admitted.revision}',
  sha256: '${admitted.sha256}',
  entries: ${admitted.entries},
});`;
writeFileSync(at('src/contracts.mjs'), src.replace(block, literal));

rmSync(at('vendor/'), { recursive: true, force: true });
rmSync(at('tools/vendor-contracts.mjs'), { force: true });
console.log(JSON.stringify({ switched: true, admitted, spec: a.spec, next: 'npm install, then build/test/typecheck/test:image/test:region/verify:contracts' }));
