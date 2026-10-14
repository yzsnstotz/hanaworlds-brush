// Normal prepack copies only Brush-owned runtime source. Real tgz installation is an outer gate.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OWN_CONTRACTS } from './development-contracts.mjs';
import { auditArtifact, sha256 } from './artifact-boundary.mjs';
import { verifyOwnContracts } from './verify-contracts-artifact.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const admitted = verifyOwnContracts(root);
const files = dir => readdirSync(dir, {recursive:true, withFileTypes:true}).filter(x=>x.isFile())
  .map(x=>relative(dir, join(x.parentPath,x.name))).sort();
for (const file of files(join(root,'src')).filter(file=>file.endsWith('.mjs')))
  execFileSync(process.execPath,['--check',join(root,'src',file)],{stdio:'inherit'});
rmSync(join(root,'dist'),{recursive:true,force:true});
cpSync(join(root,'src'),join(root,'dist'),{recursive:true});
const inputs = Object.fromEntries(['src','types'].flatMap(dir=>files(join(root,dir)).map(file=>dir+'/'+file)).sort()
  .map(file=>[file,sha256(readFileSync(join(root,file)))]));
const outputs = Object.fromEntries(['dist','types'].flatMap(dir=>files(join(root,dir)).map(file=>dir+'/'+file)).sort()
  .map(file=>[file,sha256(readFileSync(join(root,file)))]));
const provenance = {schema:2, source:{contract:OWN_CONTRACTS.contract, schema:OWN_CONTRACTS.schema,
  schemaSha256:admitted.schemaSha256, metadata:OWN_CONTRACTS.metadata, metadataSha256:admitted.metadataSha256},
  builder:{name:'source-copy',version:1}, inputs, outputs,
  sourceInventorySha256:sha256(JSON.stringify(inputs)), external:['canonicalize','node:*']};
writeFileSync(join(root,'build-provenance.json'),JSON.stringify(provenance,null,2)+'\n');
// Audit exactly the pack file allowlist locally. No npm pack from within a prepack build.
const tmp = join(dirname(root),'tmp'); mkdirSync(tmp,{recursive:true});
const stage = mkdtempSync(join(tmp,'brush-artifact-audit-'));
try {
  const pkg = JSON.parse(readFileSync(join(root,'package.json')));
  for (const file of ['package.json',...pkg.files]) cpSync(join(root,file),join(stage,file),{recursive:true});
  const audit = auditArtifact(stage);
  console.log(JSON.stringify({build:'PASS',contract:OWN_CONTRACTS.contract,files:Object.keys(outputs).length,
    artifactAudit:'PASS',publicEntries:audit.entries.map(x=>x.specifier)}));
} finally { rmSync(stage,{recursive:true,force:true}); }
