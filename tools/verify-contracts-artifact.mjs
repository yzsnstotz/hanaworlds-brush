// Local source admission only. Normal build must never acquire a supplier or pack recursively.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OWN_CONTRACTS, OWN_SOURCE_FILES } from './development-contracts.mjs';

export function verifyOwnContracts(root = fileURLToPath(new URL('..', import.meta.url))) {
  root = resolve(root);
  const read = path => readFileSync(join(root, path));
  const sha = path => createHash('sha256').update(read(path)).digest('hex');
  const schema = JSON.parse(read(OWN_CONTRACTS.schema));
  const metadata = JSON.parse(read(OWN_CONTRACTS.metadata));
  assert.equal(schema['x-contract'], OWN_CONTRACTS.contract, 'wrong local contract identity');
  assert.deepEqual(schema['x-roots'], ['BuildDocumentRequest', 'BuildDocumentResponse', 'CompileRegionBuildRequest', 'CompileRegionBuildResponse'], 'wrong local contract roots');
  assert.equal(Object.keys(schema.definitions).length, 102, 'incomplete local schema closure');
  for (const ref of JSON.stringify(schema).matchAll(/"\$ref":"([^"]+)"/g)) {
    assert.ok(ref[1].startsWith('#/definitions/'), 'external schema reference');
    assert.ok(Object.hasOwn(schema.definitions, ref[1].slice(14)), 'missing local schema definition');
  }
  assert.equal(createHash('sha256').update(JSON.stringify(schema)).digest('hex'), OWN_CONTRACTS.schemaContentSha256, 'changed local schema closure');
  assert.equal(createHash('sha256').update(JSON.stringify(metadata)).digest('hex'), OWN_CONTRACTS.metadataContentSha256, 'changed local metadata closure');
  assert.equal(sha(OWN_CONTRACTS.types), OWN_CONTRACTS.typesSha256, 'changed local declaration closure');
  const sourceFiles = readdirSync(join(root, 'src'), {recursive:true,withFileTypes:true}).filter(file=>file.isFile()).map(file=>join(file.parentPath,file.name).slice(root.length+1)).sort();
  assert.deepEqual(sourceFiles, OWN_SOURCE_FILES, 'unexpected local source closure');
  assert.equal(metadata.scope, 'EXISTING_BRUSH_PACKAGE_METADATA_ONLY_NOT_NEW_C_BRUSH_OPERATIONS', 'wrong metadata source');
  const pkg = JSON.parse(read('package.json')), lock = JSON.parse(read('package-lock.json'));
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    assert.equal(pkg[field]?.['hanaworlds-contracts'], undefined, 'retired supplier dependency: '+field);
    assert.deepEqual(lock.packages['']?.[field] ?? {}, pkg[field] ?? {}, 'local dependency lock mismatch: '+field);
  }
  assert.equal(lock.packages?.['node_modules/hanaworlds-contracts'], undefined, 'retired supplier lock');
  for (const path of readdirSync(join(root, 'types'), {recursive:true}).filter(path=>/\.d\.(mts|ts)$/.test(path)))
    assert.doesNotMatch(read('types/'+path).toString(), /(?:from\s*|import\s*\()\s*['"]hanaworlds-contracts(?:\/|['"])/, 'retired declaration supplier');
  for (const type of Object.keys(schema.definitions))
    assert.match(read(OWN_CONTRACTS.types).toString(), new RegExp('export type '+type+'\\s*='), 'missing local public type: '+type);
  return {match:true, contract:OWN_CONTRACTS.contract, definitions:Object.keys(schema.definitions).length,
    schemaSha256:sha(OWN_CONTRACTS.schema), metadataSha256:sha(OWN_CONTRACTS.metadata), typesSha256:sha(OWN_CONTRACTS.types),
    dependenciesIndependent:true, lockIndependent:true};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  console.log(JSON.stringify(verifyOwnContracts(process.argv[2]), null, 2));
