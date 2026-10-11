// Compile only the SDK exports Brush uses. Host/peer packages remain external.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADMITTED_CONTRACTS, contractsPackageUrl } from './development-contracts.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const sdk = dirname(fileURLToPath(contractsPackageUrl));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const files = dir => readdirSync(dir, {recursive:true, withFileTypes:true}).filter(x=>x.isFile())
  .map(x=>relative(dir, join(x.parentPath,x.name))).sort();
const lock = JSON.parse(readFileSync(join(root,'package-lock.json')));
const resolved = lock.packages['node_modules/hanaworlds-contracts'].resolved;
const sourceCommit = 'ee53aed37117bc859d9cbb2aedee9ea7d8dfc8b1';
if (resolved !== 'git+ssh://git@github.com/yzsnstotz/hanaworlds-contracts.git#'+sourceCommit || !lock.packages['node_modules/hanaworlds-contracts'].dev)
  throw new Error('Expected exact development SDK lock identity');
for(const f of files(join(root,'src')).filter(f=>f.endsWith('.mjs')))
  execFileSync(process.execPath,['--check',join(root,'src',f)],{stdio:'inherit'});
rmSync(join(root,'dist'),{recursive:true,force:true});
cpSync(join(root,'src'),join(root,'dist'),{recursive:true});
const result = await build({absWorkingDir:root,entryPoints:['src/contracts.mjs'],outfile:'dist/contracts.mjs',
  bundle:true,platform:'node',format:'esm',target:'node24',packages:'bundle',external:['canonicalize','node:*'],
  metafile:true,legalComments:'inline',write:true});
mkdirSync(join(root,'licenses'),{recursive:true});
for (const f of ['LICENSE','NOTICE']) cpSync(join(sdk,f),join(root,'licenses/hanaworlds-contracts.'+f));
const outputs = Object.fromEntries(files(join(root,'dist')).map(f=>['dist/'+f,sha(readFileSync(join(root,'dist',f)))]));
const inputs = Object.fromEntries(Object.keys(result.metafile.inputs).sort().map(f=>[f,sha(readFileSync(join(root,f)))]));
const sdkFiles = Object.fromEntries(files(sdk).map(f=>[f,sha(readFileSync(join(sdk,f)))]));
const provenance = {schema:1,supplier:ADMITTED_CONTRACTS,sourceCommit,resolved,
  sdkFilesSha256:sha(JSON.stringify(sdkFiles)),builder:{name:'esbuild',version:JSON.parse(readFileSync(join(root,'node_modules/esbuild/package.json'))).version},
  inputs,outputs,external:['canonicalize','node:*']};
writeFileSync(join(root,'build-provenance.json'),JSON.stringify(provenance,null,2)+'\n');
console.log(JSON.stringify({build:'PASS',sourceCommit,generated:outputs['dist/contracts.mjs'],sdkInputs:Object.keys(inputs).length}));
