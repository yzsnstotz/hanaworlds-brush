// Development-only verifier of the real tarball's runtime closure.
import assert from 'node:assert/strict';
import { parse } from 'acorn';
import { builtinModules } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { OWN_CONTRACTS } from './development-contracts.mjs';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const files = dir => readdirSync(dir,{recursive:true,withFileTypes:true}).filter(x=>x.isFile())
 .map(x=>relative(dir,join(x.parentPath,x.name))).sort();
const forbidden = /^(?:hanaworlds-contracts(?:\/|$)|#contracts(?:\/|$))/;
const strings = value => typeof value==='string' ? [value] : value && typeof value==='object'
 ? Object.entries(value).flatMap(([k,v])=>k==='types'?[]:strings(v)) : [];
export function publicEntries(pkg, allFiles) {
 const result=[];
 for(const [key,value] of Object.entries(pkg.exports)) for(const target of strings(value)) {
  assert.ok(target.startsWith('./'),'non-local export: '+target);
  if(target.includes('*')) {
   const [a,b]=target.slice(2).split('*');
   for(const f of allFiles.filter(f=>f.startsWith(a)&&f.endsWith(b))) result.push({specifier:pkg.name+key.slice(1).replace('*',f.slice(a.length,f.length-b.length)),file:f});
  } else result.push({specifier:pkg.name+key.slice(1),file:target.slice(2)});
 }
 assert.ok(result.length,'no public runtime entries');
 return result;
}
export function auditArtifact(root) {
 const allFiles=files(root),pkg=JSON.parse(readFileSync(join(root,'package.json')));
 for(const field of ['dependencies','devDependencies','peerDependencies','optionalDependencies']) for(const [name,source] of Object.entries(pkg[field]??{})) {
  assert.ok(!forbidden.test(name)&&!source.includes('hanaworlds-contracts'),'production contracts dependency: '+field);
  assert.ok(!/^(?:file:|link:|workspace:|git|https?:)/.test(source),'non-registry production dependency: '+name);
 }
 for(const [key,target] of Object.entries(pkg.imports??{})) {
  assert.ok(!forbidden.test(key),'contracts package import: '+key);
  for(const ref of strings(target)) assert.ok(!forbidden.test(ref),'contracts import target: '+ref);
 }
 assert.ok(!allFiles.some(f=>f.startsWith('licenses/hanaworlds-contracts.')),'retired supplier license artifact');
 for(const f of allFiles) {
  assert.ok(!/^(?:src|tools|archive|preview)\//.test(f)&&!/(?:^|\/)(?:tests?|fixtures|node_modules)\//.test(f),'non-artifact file: '+f);
  if(f!=='package.json'&&f.endsWith('/package.json'))assert.notEqual(JSON.parse(readFileSync(join(root,f))).name,'hanaworlds-contracts','nested contracts package: '+f);
 }
 const entries=publicEntries(pkg,allFiles),graph={};
 const checkFile=(from,target)=>{
  const full=resolve(dirname(join(root,from)),target),rel=relative(root,full);
  assert.ok(!rel.startsWith('..')&&!rel.startsWith('/'),'escaped local resource: '+target);
  assert.ok(allFiles.includes(rel),'unpacked local dependency: '+rel);
  return rel;
 };
 const dependency=(from,ref)=>{
  assert.ok(typeof ref==='string','computed runtime loader in '+from);
  assert.ok(!forbidden.test(ref),'runtime contracts load: '+ref);
  if(ref.startsWith('.')) return checkFile(from,ref);
  assert.ok(!ref.startsWith('/')&&!ref.includes('://'),'external runtime resource: '+ref);
  if(ref.startsWith('#')) {
   const mapped=pkg.imports?.[ref];assert.equal(typeof mapped,'string','unresolved package import: '+ref);
   return dependency('package.json',mapped);
  }
  if(ref.startsWith('node:')||builtinModules.includes(ref)) {
   assert.ok(['node:crypto','node:util','crypto','util'].includes(ref),'runtime I/O or indirect loader: '+ref);
   return ref;
  }
  const name=ref.startsWith('@')?ref.split('/').slice(0,2).join('/'):ref.split('/')[0];
  assert.ok(pkg.dependencies?.[name]||pkg.peerDependencies?.[name]||pkg.optionalDependencies?.[name],'undeclared runtime dependency: '+ref);
  return ref;
 };
 for(const target of Object.values(pkg.imports??{}))for(const ref of strings(target))dependency('package.json',ref);
 for(const entry of entries) assert.ok(allFiles.includes(entry.file),'unpacked public entry: '+entry.file);
 for(const file of allFiles.filter(f=>/\.(?:mjs|cjs|js)$/.test(f))) {
  const source=readFileSync(join(root,file),'utf8');
  const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),refs=[];
  const visit=(node,parent=null)=>{
   if(!node||typeof node!=='object')return;
   if(node.type==='MetaProperty'&&node.meta.name==='import')
    assert.ok(parent?.type==='MemberExpression'&&parent.object===node&&
     ((!parent.computed&&parent.property.type==='Identifier'&&parent.property.name==='url')||
      (parent.computed&&parent.property.type==='Literal'&&parent.property.value==='url')),'runtime resource resolver alias in '+file);
   if(node.type==='Identifier'&&node.name==='require')
    assert.ok(parent?.type==='CallExpression'&&parent.callee===node,'aliased runtime loader in '+file);
   if(node.type==='MemberExpression') {
    const prop=node.property.name??node.property.value;
    assert.ok(!['createRequire','getBuiltinModule','binding','_linkedBinding','eval','Function'].includes(prop),'indirect runtime loader in '+file);
   }
   if(['ImportDeclaration','ExportNamedDeclaration','ExportAllDeclaration'].includes(node.type)&&node.source)
    refs.push(dependency(file,node.source.value));
   if(node.type==='ImportExpression') refs.push(dependency(file,node.source.type==='Literal'?node.source.value:undefined));
   if(node.type==='CallExpression'||node.type==='NewExpression') {
    const callee=node.callee,prop=callee?.property?.name??callee?.property?.value;
    if(callee?.type==='Identifier'&&callee.name==='require') refs.push(dependency(file,node.arguments[0]?.type==='Literal'?node.arguments[0].value:undefined));
    assert.ok(!['eval','Function','fetch','XMLHttpRequest','WebSocket'].includes(callee?.name),'dynamic code or I/O in '+file);
    assert.ok(!['resolve','createRequire','getBuiltinModule','readFile','readFileSync','open','openSync','binding','_linkedBinding'].includes(prop),'runtime resource resolver/read in '+file);
    if(callee?.name==='URL') {
     assert.equal(node.arguments[0]?.type,'Literal','computed URL in '+file);
     refs.push(checkFile(file,node.arguments[0].value));
    }
   }
   for(const [key,v] of Object.entries(node)) if(key!=='start'&&key!=='end') {
    if(Array.isArray(v))v.forEach(child=>visit(child,node));else if(v&&typeof v==='object')visit(v,node);
   }
  };visit(ast);graph[file]=[...new Set(refs)].sort();
 }
 const reachable=new Set(),walk=f=>{if(reachable.has(f))return;reachable.add(f);for(const dep of graph[f]??[])if(allFiles.includes(dep))walk(dep);};
 entries.forEach(x=>walk(x.file));
 const provenance=JSON.parse(readFileSync(join(root,'build-provenance.json')));
 assert.equal(provenance.schema,2,'wrong provenance format');
 assert.equal(provenance.source.contract,OWN_CONTRACTS.contract,'wrong build source');
 assert.equal(provenance.builder.name,'source-copy','wrong local build method');
 assert.equal(provenance.builder.version,1,'wrong local build revision');
 assert.equal(provenance.source.schema,OWN_CONTRACTS.schema,'wrong local schema source');
 assert.equal(provenance.source.metadata,OWN_CONTRACTS.metadata,'wrong local metadata source');
 assert.equal(provenance.sourceInventorySha256,sha256(JSON.stringify(provenance.inputs)),'wrong source inventory hash');
 const expectedOutputs=allFiles.filter(f=>f.startsWith('dist/')||f.startsWith('types/')).sort();
 assert.deepEqual(Object.keys(provenance.outputs).sort(),expectedOutputs,'wrong artifact output inventory');
 const expectedInputs=expectedOutputs.map(f=>f.startsWith('dist/')?'src/'+f.slice(5):f).sort();
 assert.deepEqual(Object.keys(provenance.inputs).sort(),expectedInputs,'wrong owned source inventory');
 for(const f of expectedOutputs) {
  const hash=sha256(readFileSync(join(root,f)));
  assert.equal(provenance.outputs[f],hash,'generated artifact hash: '+f);
  assert.equal(provenance.inputs[f.startsWith('dist/')?'src/'+f.slice(5):f],hash,'copied source hash: '+f);
 }
 for(const [name,sourceField,expectedHash] of [
  ['contract-schema.json','schemaSha256',OWN_CONTRACTS.schemaContentSha256],
  ['contract-metadata.json','metadataSha256',OWN_CONTRACTS.metadataContentSha256]]) {
  const path='dist/'+name;
  assert.ok(allFiles.includes(path),'missing own contract resource: '+path);
  const bytes=readFileSync(join(root,path));
  assert.equal(provenance.source[sourceField],sha256(bytes),'wrong own contract resource hash: '+path);
  assert.equal(sha256(JSON.stringify(JSON.parse(bytes))),expectedHash,'changed document closure: '+path);
 }
 assert.equal(JSON.parse(readFileSync(join(root,'dist/contract-schema.json')))['x-contract'],OWN_CONTRACTS.contract,'wrong local contract identity');
 assert.equal(sha256(readFileSync(join(root,OWN_CONTRACTS.types))),OWN_CONTRACTS.typesSha256,'changed declaration closure');
 for(const f of allFiles.filter(f=>/^types\/.*\.d\.(mts|ts)$/.test(f))) {
  const text=readFileSync(join(root,f),'utf8');
  assert.ok(!/from\s*['"]hanaworlds-contracts(?:\/|['"])/.test(text),'retired type supplier: '+f);
  for(const match of text.matchAll(/(?:from\s*|import\s*\()\s*['"]([^'"]+)['"]/g)) {
   assert.ok(match[1].startsWith('.'),'external declaration dependency: '+match[1]);
   checkFile(f,match[1]);
  }
 }
 for(const file of ['LICENSE','NOTICE','dist/shapes/upstream/LICENSE.AGPLv3.txt','dist/shapes/upstream/LICENSE.txt'])
  assert.ok(allFiles.includes(file),'missing source license: '+file);
 return {entries,graph,reachable:[...reachable].sort(),files:allFiles,source:provenance.source};
}
