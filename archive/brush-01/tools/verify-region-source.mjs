// Region source boundary check (run from the repository): the per-cell compiler
// is identical to the 0.3.1 baseline except comment lines (contracts version
// wording, and the wire identifier renamed by contracts 1.0.0: BUILD/V3 -> BUILD/V4),
// the expander is byte-identical, and the region module
// imports only node built-ins, canonicalize and the admitted contracts.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const BASE = 'ca99967b65c3f991b0dac28cc76ae313e7e2a33d';
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' });
const results = {};
const code = t => t.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*\*)/.test(l)).join('\n');
results['src/expand.mjs'] = git('show', `${BASE}:src/expand.mjs`) === readFileSync('src/expand.mjs', 'utf8') ? 'UNCHANGED' : 'CHANGED';
results['src/compile.mjs (code lines)'] = code(git('show', `${BASE}:src/compile.mjs`)).replaceAll("'BUILD/V3'", "'BUILD/V4'") === code(readFileSync('src/compile.mjs', 'utf8')) ? 'UNCHANGED' : 'CHANGED';
results['src/compile.mjs changed lines'] = git('diff', '--numstat', BASE, '--', 'src/compile.mjs').trim() || '0\t0\tsrc/compile.mjs';
const imports = [...readFileSync('src/region.mjs', 'utf8').matchAll(/^import\b[^;]*?from '([^']+)';/gm)].map(m => m[1]);
results['src/region.mjs imports'] = imports;
const allowed = new Set(['node:util', 'node:crypto', 'canonicalize', '#contracts']);
const forbidden = /\b(fetch|require|process\.env|Date\.now|Math\.random|readFile|writeFile|net\.|http)\b/;
results.regionForbiddenApis = forbidden.test(readFileSync('src/region.mjs', 'utf8')) ? 'FOUND' : 'NONE';
console.log(JSON.stringify(results, null, 1));
if (Object.values(results).includes('CHANGED') || !imports.every(i => allowed.has(i)) || results.regionForbiddenApis !== 'NONE') process.exit(1);
