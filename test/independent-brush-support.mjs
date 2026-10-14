// Test-owned document reader and independent byte/cell/digest oracles. No SDK.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
export const documentPath = '/Users/yzliu/work/Docs/Projects/hana-world/contracts/C-brush.md';
export function readDocument(path = documentPath) {
  const text = readFileSync(path, 'utf8'), blocks = new Map();
  for (const m of text.matchAll(/```(\w+) (c-brush-[^\n]+)\n([\s\S]*?)\n```/g)) {
    assert.ok(!blocks.has(m[2]), `ambiguous document block ${m[2]}`);
    blocks.set(m[2], m[1] === 'json' ? JSON.parse(m[3]) : m[3]);
  }
  for (const key of ['schema','types','BuildDocument','CompileRegionBuild','admission','boundaries','digest-profile','package-metadata','publication','exception-cases'])
    assert.ok(blocks.has('c-brush-'+key), `document supply missing: ${key}`);
  return { text, sha256: sha(text), get: key => blocks.get('c-brush-'+key), blocks };
}
export const sha = bytes => createHash('sha256').update(bytes).digest('hex');
// RFC8785 oracle uses native ES number/string serialization and UTF16 key order;
// deliberately never imports canonicalize or the compiler's digest helper.
export function jcs(value) {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number') assert.ok(Number.isFinite(value));
    if (typeof value === 'string') assert.ok(value.isWellFormed());
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return '['+value.map(jcs).join(',')+']';
  return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+jcs(value[k])).join(',')+'}';
}
export function digest(doc, kind, value) {
  const p=doc.get('digest-profile');
  return sha((p.domainPrefixByKind?.[kind] ?? p.domainPrefix)+kind+p.domainSuffix+jcs(value));
}
export const at = (value,path) => path.split('.').reduce((v,k)=>v[k],value);
// Independent document schema interpreter, test-only. Domain/correlation is
// exercised through real installed compiler calls, not this structural oracle.
export function acceptsShape(doc,type,value) {
  const definitions=doc.get('schema').definitions;
  function check(s,v) {
    if(s===true)return true;if(s===false)return false;
    if(s.$ref)return check(definitions[s.$ref.slice(14)],v);
    if(s.anyOf&&!s.anyOf.some(b=>check(b,v)))return false;
    if(s.oneOf&&s.oneOf.filter(b=>check(b,v)).length!==1)return false;
    if(Object.hasOwn(s,'const')&&JSON.stringify(v)!==JSON.stringify(s.const))return false;
    if(s.enum&&!s.enum.includes(v))return false;
    if(s.type) {
      const types=Array.isArray(s.type)?s.type:[s.type];
      if(!types.some(t=>t==='null'?v===null:t==='array'?Array.isArray(v):t==='object'?v!==null&&typeof v==='object'&&!Array.isArray(v):t==='integer'?Number.isInteger(v):typeof v===t))return false;
    }
    if(typeof v==='string') {
      if(!v.isWellFormed())return false;
      if(s.minLength!==undefined&&v.length<s.minLength)return false;
      if(s.pattern&&!new RegExp(s.pattern,'u').test(v))return false;
    }
    if(typeof v==='number') {
      if(!Number.isFinite(v))return false;
      if(s.minimum!==undefined&&v<s.minimum||s.maximum!==undefined&&v>s.maximum||s.exclusiveMinimum!==undefined&&v<=s.exclusiveMinimum)return false;
    }
    if(Array.isArray(v)) {
      if(s.minItems!==undefined&&v.length<s.minItems||s.maxItems!==undefined&&v.length>s.maxItems)return false;
      if(s.uniqueItems&&new Set(v.map(x=>JSON.stringify(x))).size!==v.length)return false;
      if(s.items&&v.some((x,i)=>!check(Array.isArray(s.items)?s.items[i]??s.additionalItems??true:s.items,x)))return false;
      // The three metadata reference sets have explicit sorted-string domains.
      if(['FactProfiles','RefSet','WireVersions'].includes(s['x-typeName'])&&v.some((x,i)=>i&&v[i-1]>=x))return false;
    }
    if(v!==null&&typeof v==='object'&&!Array.isArray(v)) {
      const keys=Object.keys(v);
      if(s.minProperties!==undefined&&keys.length<s.minProperties)return false;
      if(s.required?.some(k=>!Object.hasOwn(v,k)))return false;
      for(const k of keys) {
        if(!k.isWellFormed()||s.propertyNames&&!check(s.propertyNames,k))return false;
        if(Object.hasOwn(s.properties??{},k)) {if(!check(s.properties[k],v[k]))return false;}
        else if(s.additionalProperties!==undefined&&!check(s.additionalProperties,v[k]))return false;
      }
    }
    return true;
  }
  assert.ok(definitions[type],type);return check(definitions[type],value);
}
export const comparePosition = (a,b)=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2];
export function cellsOfBlock(block) {
  const cells=[]; let index=0;
  for(const [count,paletteIndex] of block.runs) {
    for(let n=0;n<count;n++,index++) {
      if(paletteIndex===null) continue;
      const [sx,sy]=block.size;
      const position=[block.origin[0]+index%sx,block.origin[1]+Math.floor(index/sx)%sy,block.origin[2]+Math.floor(index/(sx*sy))];
      cells.push({position,...block.palette[paletteIndex]});
    }
  }
  assert.equal(index,block.size.reduce((a,b)=>a*b,1));
  return cells.sort((a,b)=>comparePosition(a.position,b.position));
}
export function expectedBuildCells(request) {
  const map=new Map();
  for(const op of request.build.operations)
    for(let x=op.min[0];x<=op.max[0];x++) for(let y=op.min[1];y<=op.max[1];y++) for(let z=op.min[2];z<=op.max[2];z++) {
      const position=[x,y,z];map.set(JSON.stringify(position),{position,...request.build.materials[op.materialRef]});
    }
  return [...map.values()].sort((a,b)=>comparePosition(a.position,b.position));
}
export function assertReadback(doc,sample,response) {
  assert.equal(jcs(response),jcs(sample.expected),`${sample.id}: complete response`);
  if(response.result===null) {
    assert.deepEqual(Object.keys(response.error).sort(),['code','phase','retryability','mutationState','transactionRef','causeCode','reason'].sort());
    assert.equal(response.error.mutationState,'NONE');assert.equal(response.error.transactionRef,null);assert.equal(response.error.causeCode,null);
    return;
  }
  const q=sample.request,p=response.result.projection;
  for(const field of ['worldRef','buildDigest','catalogueDigest','compilerRevision']) assert.equal(p[field],q[field]);
  const region=q.contractVersion==='region-build/v2';
  assert.equal(response.result.operationDigest,digest(doc,region?'region-operations':'operations',p));
  const cells=region ? p.chunks.flatMap(c=>{
    assert.equal(c.blockDigest,digest(doc,'region-block',c.block));
    for(let a=0;a<3;a++) {
      assert.equal(Math.floor(c.block.origin[a]/q.partition.edge[a]),c.chunkPos[a]);
      assert.equal(Math.floor((c.block.origin[a]+c.block.size[a]-1)/q.partition.edge[a]),c.chunkPos[a]);
    }
    return cellsOfBlock(c.block);
  }).sort((a,b)=>comparePosition(a.position,b.position)) : p.effects.map(({geometryProfile,...c})=>{assert.equal(geometryProfile,'voxel-grid/v1');return c;});
  assert.equal(new Set(cells.map(c=>JSON.stringify(c.position))).size,cells.length,'duplicate emitted cell');
  assert.deepEqual(cells,region?cellsOfBlock(q.build.block):expectedBuildCells(q),'independent input cell readback');
  assert.deepEqual(cells,sample.readback.effects);
  if(region) assert.equal(jcs(p.partition),jcs(q.partition));
  else {
    assert.equal(jcs(response.result.readBounds),jcs(q.targetFacts.sampledBounds));
    assert.equal(p.compilationConfigDigest,q.compilationConfigDigest);
    assert.equal(p.targetFactsDigest,q.targetFactsDigest);
    assert.equal(p.frameDigest,q.targetFacts.frameDigest);
  }
  const boxes=region?p.chunks.map(c=>({min:c.block.origin,max:c.block.origin.map((o,a)=>o+c.block.size[a]-1)})):q.build.operations;
  assert.equal(jcs(response.result.writeBounds),jcs({min:[0,1,2].map(a=>Math.min(...boxes.map(b=>b.min[a]))),max:[0,1,2].map(a=>Math.max(...boxes.map(b=>b.max[a])))}));
  for(const d of sample.readback.digests) {
    assert.equal(jcs(d.value),d.canonicalJSON);assert.equal(sha(d.preimage),d.sha256);
    assert.equal(digest(doc,d.kind,d.value),d.sha256);assert.equal(at(response,d.path),d.sha256);
  }
}
export function inputFor(sample) {
  let q=structuredClone(sample.request),reads=0;
  switch(sample.valueForm) {
    case undefined: break;
    case 'proxy':q=new Proxy(q,{get(){reads++;throw Error('proxy executed');},getOwnPropertyDescriptor(){reads++;throw Error('proxy executed');},ownKeys(){reads++;throw Error('proxy executed');}});break;
    case 'requestId-getter':Object.defineProperty(q,'requestId',{enumerable:true,get(){reads++;throw Error('getter executed');}});break;
    case 'sparse-array':if(q.contractVersion==='BUILD/V5')delete q.build.operations[0];else delete q.build.block.runs[0];break;
    case 'cycle':q.loop=q;break;
    default:assert.fail(`unhandled document valueForm ${sample.valueForm}`);
  }
  return {q,assertUnread:()=>assert.equal(reads,0)};
}
export function assertThrown(fn,expected) {
  let output;
  assert.throws(()=>{output=fn();},e=>{
    for(const k of ['code','phase','reason']) assert.equal(e[k],expected[k]);
    assert.equal(jcs(e.publicError),jcs(expected.publicError));return true;
  });
  assert.equal(output,undefined,'throw must not return output');
}
export function runSample(doc,brush,service,operation,sample) {
  const spec=doc.get(operation),isValue=sample.valueForm!==undefined;
  for(const route of ['value','bytes','service','serviceBytes']) {
    if(isValue && (route==='bytes'||route==='serviceBytes')) continue; // JS-only forms have no raw JSON representation.
    const raw=route==='bytes'||route==='serviceBytes',owner=route.startsWith('service')?service:brush;
    const {q,assertUnread}=inputFor(sample);
    const bytes=Uint8Array.from(sample.rawBytes??new TextEncoder().encode(sample.raw??JSON.stringify(sample.request)));
    const before=Buffer.from(bytes),inputBefore=isValue?null:JSON.stringify(q);
    const invoke=()=>owner[spec.binding[route]](raw?bytes:q);
    const thrown=raw?sample.thrown:sample.valueThrown;
    if(thrown) assertThrown(invoke,thrown);
    else {
      const expected=(!raw&&sample.valueExpected)||sample.expected||sample.sourceExpected;
      const actual=invoke();assert.equal(jcs(actual),jcs(expected),`${sample.id} ${route}: complete returned value`);
      if(expected.result!==null) assertReadback(doc,{...sample,expected},actual);
      else {assert.equal(actual.result,null);assert.equal(jcs(actual.error),jcs(expected.error));}
      assert.equal(jcs(invoke()),jcs(actual),'deterministic repeat');
    }
    assert.deepEqual(Buffer.from(bytes),before,'original request bytes mutated');
    if(inputBefore!==null) assert.equal(JSON.stringify(q),inputBefore,'request mutated');
    assertUnread();
  }
}
