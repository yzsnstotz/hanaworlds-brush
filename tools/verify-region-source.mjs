// Region source boundary check (run from the repository): the per-cell compiler
// and expander are byte-identical to the 0.3.1 baseline, and the region module
// imports only node built-ins, canonicalize and the admitted contracts.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const BASE = 'ca99967b65c3f991b0dac28cc76ae313e7e2a33d';
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' });
const results = {};
for (const f of ['src/compile.mjs', 'src/expand.mjs']) results[f] = git('show', `${BASE}:${f}`) === readFileSync(f, 'utf8') ? 'UNCHANGED' : 'CHANGED';
const imports = [...readFileSync('src/region.mjs', 'utf8').matchAll(/^import .* from '([^']+)';$/gm)].map(m => m[1]);
results['src/region.mjs imports'] = imports;
const allowed = new Set(['node:util', 'node:crypto', 'canonicalize', '#contracts']);
const forbidden = /\b(fetch|require|process\.env|Date\.now|Math\.random|readFile|writeFile|net\.|http)\b/;
results.regionForbiddenApis = forbidden.test(readFileSync('src/region.mjs', 'utf8')) ? 'FOUND' : 'NONE';
console.log(JSON.stringify(results, null, 1));
if (Object.values(results).includes('CHANGED') || !imports.every(i => allowed.has(i)) || results.regionForbiddenApis !== 'NONE') process.exit(1);
