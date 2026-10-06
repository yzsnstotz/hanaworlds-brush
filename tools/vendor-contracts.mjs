// Regenerate vendor only from the admitted actual npm tar, never another source build.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADMITTED_CONTRACTS as admitted } from './admitted-contracts.mjs';
const tar = process.argv[2];
if (!tar) throw new Error('Usage: node tools/vendor-contracts.mjs /absolute/admitted-contracts.tgz');
if (createHash('sha256').update(readFileSync(tar)).digest('hex') !== admitted.sha256) throw new Error('Unadmitted contracts tar');
const vendor = fileURLToPath(new URL('../vendor/', import.meta.url));
mkdirSync(vendor, {recursive:true});
const work=mkdtempSync(join(vendor,'.contracts-'));
try {
 execFileSync('tar',['-xzf',tar,'-C',work]);
 const pkg=JSON.parse(readFileSync(join(work,'package/package.json')));
 if(pkg.name!==admitted.name||pkg.version!==admitted.version) throw new Error('Unadmitted identity');
 rmSync(join(vendor,'hanaworlds-contracts'),{recursive:true,force:true});
 renameSync(join(work,'package'),join(vendor,'hanaworlds-contracts'));
 console.log(JSON.stringify({vendored:pkg.name,version:pkg.version,sha256:admitted.sha256}));
} finally {rmSync(work,{recursive:true,force:true});}
