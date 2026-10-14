// Explicit real-tgz regression runner. Build/prepack perform a local artifact
// audit; this command alone packs normally and tests the isolated installation.
import { execFileSync } from 'node:child_process';
import { root } from './package-harness.mjs';
if(process.env.BRUSH_BOUNDARY_NESTED_PACK || process.env.BRUSH_BOUNDARY_PACK_RECEIPT)
 throw new Error('Boolean boundary bypass and retired pack receipt are not supported');
execFileSync(process.execPath,['--test','test/package-boundary.test.mjs'],{cwd:root,env:process.env,stdio:'inherit'});
