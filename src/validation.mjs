// C-brush v3 self-owned admission closure. Schema and domain rules are compiled
// from contracts/C-brush.md (2026-10-14, D-137), never from the retired SDK.
import { types as utilTypes } from 'node:util';
import schema from './contract-schema.json' with { type: 'json' };

export class ContractError extends Error {
  constructor(code, phase, reason, retryability = phase === 'decode' || phase === 'replay' ? 'NEVER' : 'AFTER_NEW_FACTS') {
    super(`${code}: ${reason}`);
    this.name = 'ContractError';
    Object.assign(this, { code, phase, retryability, mutationState: 'NONE', transactionRef: null, causeCode: null, reason });
    this.publicError = Object.freeze({ code, phase, retryability, mutationState: 'NONE', transactionRef: null, causeCode: null, reason });
  }
}
export function fail(code, reason, phase = 'validate', retryability) { throw new ContractError(code, phase, reason, retryability); }
const shape = (phase = 'decode') => fail('SCHEMA_INVALID', 'INVALID_SHAPE', phase);
const geometry = () => fail('SCHEMA_INVALID', 'INVALID_GEOMETRY');
function scalar(s) {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xD800 && c <= 0xDBFF) { const d = s.charCodeAt(++i); if (!(d >= 0xDC00 && d <= 0xDFFF)) fail('SCHEMA_INVALID', 'LONE_SURROGATE', 'decode'); }
    else if (c >= 0xDC00 && c <= 0xDFFF) fail('SCHEMA_INVALID', 'LONE_SURROGATE', 'decode');
  }
  return s;
}
export function snapshot(value) {
  const ancestors = new Set();
  function copy(v) {
    if (v === null || typeof v === 'boolean') return v;
    if (typeof v === 'string') return scalar(v);
    if (typeof v === 'number') { if (!Number.isFinite(v)) fail('SCHEMA_INVALID', 'INVALID_NUMBER', 'decode'); return v; }
    if (typeof v !== 'object' || utilTypes.isProxy(v)) shape();
    if (ancestors.has(v)) shape();
    const array = Array.isArray(v), proto = Object.getPrototypeOf(v);
    if (array ? proto !== Array.prototype : proto !== Object.prototype && proto !== null) shape();
    const descriptors = Object.getOwnPropertyDescriptors(v), keys = Reflect.ownKeys(descriptors);
    if (keys.some(k => typeof k !== 'string')) shape();
    const out = array ? [] : {};
    if (array) {
      const length = descriptors.length.value;
      if (keys.length !== length + 1) shape();
      for (let i = 0; i < length; i++) if (!Object.hasOwn(descriptors, String(i))) shape();
    }
    ancestors.add(v);
    for (const key of keys) {
      if (array && key === 'length') continue;
      scalar(key);
      const d = descriptors[key];
      if (!Object.hasOwn(d, 'value') || !d.enumerable) shape();
      if (array && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= descriptors.length.value)) shape();
      Object.defineProperty(out, key, { value: copy(d.value), enumerable: true, writable: true, configurable: true });
    }
    ancestors.delete(v);
    return out;
  }
  return copy(value);
}
export function decodeRawJSON(bytes) {
  if (utilTypes.isProxy(bytes) || !(bytes instanceof Uint8Array)) shape();
  let source;
  try { source = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
  catch { fail('SCHEMA_INVALID', 'INVALID_UTF8', 'decode'); }
  let i = 0;
  const whitespace = () => { while (/[\x20\x09\x0A\x0D]/.test(source[i] ?? '') && i < source.length) i++; };
  function string() {
    const start = i++;
    while (i < source.length) {
      const c = source[i++];
      if (c === '"') { let v; try { v = JSON.parse(source.slice(start, i)); } catch { shape(); } return scalar(v); }
      if (c.charCodeAt(0) < 32) shape();
      if (c === '\\') {
        const escape = source[i++];
        if (escape === 'u') { if (!/^[0-9a-fA-F]{4}$/.test(source.slice(i, i + 4))) shape(); i += 4; }
        else if (!['"', '\\', '/', 'b', 'f', 'n', 'r', 't'].includes(escape)) shape();
      }
    }
    shape();
  }
  function value() {
    whitespace(); const c = source[i];
    if (c === '"') return string();
    if (c === '{') {
      i++; const out = {}, seen = new Set(); whitespace();
      if (source[i] === '}') { i++; return out; }
      while (true) {
        whitespace(); if (source[i] !== '"') shape(); const key = string();
        if (seen.has(key)) fail('NON_CANONICAL_AMBIGUITY', 'DUPLICATE_DECODED_KEY', 'decode'); seen.add(key);
        whitespace(); if (source[i++] !== ':') shape();
        Object.defineProperty(out, key, { value: value(), writable: true, enumerable: true, configurable: true });
        whitespace(); const end = source[i++]; if (end === '}') return out; if (end !== ',') shape();
      }
    }
    if (c === '[') {
      i++; const out = []; whitespace(); if (source[i] === ']') { i++; return out; }
      while (true) { out.push(value()); whitespace(); const end = source[i++]; if (end === ']') return out; if (end !== ',') shape(); }
    }
    for (const [token, v] of [['true', true], ['false', false], ['null', null]]) if (source.startsWith(token, i)) { i += token.length; return v; }
    if (c === '-' || c >= '0' && c <= '9' || source.startsWith('NaN', i) || source.startsWith('Infinity', i)) {
      const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(source.slice(i));
      if (!match) fail('SCHEMA_INVALID', 'INVALID_NUMBER', 'decode');
      i += match[0].length; const n = Number(match[0]); if (!Number.isFinite(n)) fail('SCHEMA_INVALID', 'INVALID_NUMBER', 'decode'); return n;
    }
    shape();
  }
  const result = value(); whitespace(); if (i !== source.length) shape(); return result;
}
const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
const equal = (a, b) => {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a); return keys.length === Object.keys(b).length && keys.every(k => Object.hasOwn(b, k) && equal(a[k], b[k]));
};
const contains = (box, p) => p.every((n, a) => n >= box.min[a] && n <= box.max[a]);
const union = boxes => {
  if (!boxes.length) shape('validate');
  const min = [...boxes[0].min], max = [...boxes[0].max];
  for (const b of boxes) for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a], b.min[a]); max[a] = Math.max(max[a], b.max[a]); }
  return { min, max };
};
const blockBox = b => ({ min: b.origin, max: b.origin.map((o, a) => o + b.size[a] - 1) });
function arrayDomain(s, v) {
  if (s.uniqueItems) { const seen = new Set(); for (const item of v) { const key = JSON.stringify(item); if (seen.has(key)) shape('validate'); seen.add(key); } }
  const by = s['x-uniqueBy'];
  if (by) { const fields = by.split(','), seen = new Set(); for (const item of v) { const key = JSON.stringify(fields.map(k => item[k])); if (seen.has(key)) shape('validate'); seen.add(key); } }
  let compare;
  switch (s['x-order']) {
    case 'numeric x,y,z': compare = cmp; break;
    case 'position numeric x,y,z': compare = (a,b) => cmp(a.position,b.position); break;
    case 'chunkPos numeric x,y,z': compare = (a,b) => cmp(a.chunkPos,b.chunkPos); break;
    case 'numeric ascending': compare = (a,b) => a-b; break;
    case 'UTF16 ascending': compare = (a,b) => a < b ? -1 : a > b ? 1 : 0; break;
    case 'portalRef UTF16 ascending': compare = (a,b) => a.portalRef < b.portalRef ? -1 : a.portalRef > b.portalRef ? 1 : 0; break;
    case 'witnessId UTF16 ascending': compare = (a,b) => a.witnessId < b.witnessId ? -1 : a.witnessId > b.witnessId ? 1 : 0; break;
    case 'protocol UTF16 ascending': compare = (a,b) => a.protocol < b.protocol ? -1 : a.protocol > b.protocol ? 1 : 0; break;
    case 'materialRef UTF16 then orientation numeric': compare = (a,b) => (a.materialRef < b.materialRef ? -1 : a.materialRef > b.materialRef ? 1 : 0) || a.orientation-b.orientation; break;
  }
  if (compare && v.some((item, i) => i > 0 && compare(v[i-1], item) >= 0)) shape('validate');
}
function domain(name, v) {
  switch (name) {
    case 'Box': case 'SetBox': if (v.min.some((n,a) => n > v.max[a])) geometry(); break;
    case 'Axes': if (new Set(v.map(a => a.slice(1))).size !== 3) geometry(); break;
    case 'MaterialTags': if (!equal(v.unknownFields, Object.keys(v).filter(k => k !== 'unknownFields' && v[k] === null).sort())) shape('validate'); break;
    case 'Catalogue': if (!Object.hasOwn(v.materials,v.emptyMaterialRef)) shape('validate'); break;
    case 'TargetFacts': {
      const actual = ['worldRef','objectRef','worldRevision','objectRevision'], planned = ['buildDigest','planRevision'];
      if (v.source === 'REGION_INSPECTED') {
        if (v.worldRef === null || v.worldRevision === null || ['objectRef','objectRevision',...planned].some(k => v[k] !== null)) shape();
      } else if (v.source === 'INSPECTED') { if (actual.some(k => v[k] === null) || planned.some(k => v[k] !== null)) shape('validate'); }
      else if (actual.some(k => v[k] !== null) || planned.some(k => v[k] === null)) shape('validate');
      const seen = new Set();
      for (const p of [...v.occupiedCells.map(c=>c.position),...v.knownEmptyCells,...v.unknownCells.map(c=>c.position)]) {
        const key = JSON.stringify(p); if (seen.has(key)) shape('validate'); seen.add(key); if (!contains(v.sampledBounds,p)) geometry();
      }
      if (v.unknownCells.length && v.usableVolume !== null) fail('TARGET_FACTS_INCOMPLETE','REQUIRED_FACT_UNKNOWN');
      break;
    }
    case 'Coverage': if (v.sampledPositions.some(p=>!contains(v.sampledBounds,p))) geometry(); break;
    case 'Portal': if (!v.positions.length || ![0,1,2].some(a=>v.positions.every(p=>p[a]===v.positions[0][a]))) geometry(); break;
    case 'EntranceWitness': {
      const usable = new Set(v.usablePositions.map(p=>JSON.stringify(p)));
      if (!v.path.length || v.path.some((p,i)=>!usable.has(JSON.stringify(p)) || i>0 && p.reduce((n,x,a)=>n+Math.abs(x-v.path[i-1][a]),0)!==1)) geometry(); break;
    }
    case 'BodyWitness': if (v.evidence.worldRef === null || v.evidence.worldRevision === null) shape('validate'); break;
    case 'BuildProjection':
      if (!equal(v.declaredBounds,union(v.operations))) shape('validate');
      if (v.operations.some(op=>!Object.hasOwn(v.materials,op.materialRef))) fail('CATALOGUE_MISMATCH','CATALOGUE_UNRESOLVED'); break;
    case 'RegionVoxelBlock': {
      let volume = 1n;
      for (let a=0;a<3;a++) { volume *= BigInt(v.size[a]); const corner = BigInt(v.origin[a])+BigInt(v.size[a])-1n; if (corner>BigInt(Number.MAX_SAFE_INTEGER)||corner<BigInt(Number.MIN_SAFE_INTEGER)) geometry(); }
      if (volume>BigInt(Number.MAX_SAFE_INTEGER)) geometry();
      let total=0n, previous, specified=false; const used=new Set();
      for (const [count,index] of v.runs) {
        if (index !== null && index >= v.palette.length || index===previous) shape('validate');
        previous=index; total+=BigInt(count); if (index!==null) { specified=true;used.add(index); }
      }
      if (total>BigInt(Number.MAX_SAFE_INTEGER)||total!==volume||!specified||used.size!==v.palette.length) shape('validate'); break;
    }
    case 'RegionBuildProjection': if (!equal(v.declaredBounds,blockBox(v.block))) shape('validate'); break;
    case 'CompileRegionBuildRequest':
      if (v.worldRef!==v.localContext.worldRef || v.worldRef!==v.build.worldRef) fail('CURRENT_WORLD_MISMATCH','SCOPE_DENIED');
      if (v.build.catalogueDigest!==v.catalogueDigest) shape('validate'); break;
    case 'RegionOperationsProjection':
      for (const c of v.chunks) {
        const box=blockBox(c.block);
        if (box.min.some((n,a)=>Math.floor(n/v.partition.edge[a])!==c.chunkPos[a] || Math.floor(box.max[a]/v.partition.edge[a])!==c.chunkPos[a])) geometry();
      } break;
    case 'CompiledOperationSet': if (!equal(v.writeBounds,union(v.projection.effects.map(e=>({min:e.position,max:e.position}))))) shape('validate'); break;
    case 'CompiledRegionSet': if (!equal(v.writeBounds,union(v.projection.chunks.map(c=>blockBox(c.block))))) shape('validate'); break;
  }
}
export function validateType(type, value) {
  if (!Object.hasOwn(schema.definitions,type)) throw new TypeError(`Unknown C-brush type: ${type}`);
  const out = snapshot(value), visited = [];
  function check(s,v,key,context) {
    if (s===true || s===undefined) return;
    if (s===false) shape();
    if (s.$ref) { const name=s.$ref.slice('#/definitions/'.length), def=schema.definitions[name]; if (!def) throw new TypeError(`Broken C-brush schema reference: ${name}`); check(def,v,key,context); visited.push([name,v]); return; }
    if (s.anyOf || s.oneOf) {
      let branches = s.anyOf ?? s.oneOf;
      if (s['x-discriminator']) { const k=s['x-discriminator']; branches=branches.filter(b=>b.properties?.[k]?.const===v?.[k]); if (!branches.length) shape(); }
      if (s.anyOf && branches.length===2 && branches.some(b=>b.type==='null')) branches = branches.filter(b=> v===null ? b.type==='null' : b.type!=='null');
      const errors=[], matches=[];
      for (const b of branches) {
        const start=visited.length;
        try { check(b,v,key,context); matches.push(visited.splice(start)); }
        catch (e) { visited.length=start; if (!(e instanceof ContractError)) throw e; errors.push(e); }
      }
      if (!matches.length) { if (branches.length===1) throw errors[0]; shape(); }
      if (s.oneOf && matches.length!==1) shape();
      visited.push(...matches[0]);
    }
    if (Object.hasOwn(s,'const')&&!equal(v,s.const)) {
      if (key==='contractVersion'||key==='profileVersion') fail('UNSUPPORTED_VERSION','VERSION_UNSUPPORTED','decode'); shape();
    }
    if (s.enum&&!s.enum.includes(v)) shape();
    if (s.type) {
      const list=Array.isArray(s.type)?s.type:[s.type];
      const ok=list.some(t=>t==='null'?v===null:t==='array'?Array.isArray(v):t==='object'?v!==null&&typeof v==='object'&&!Array.isArray(v):t==='integer'?typeof v==='number':typeof v===t);
      if (!ok) shape();
    }
    if (typeof v==='number') {
      if (s.type==='integer'&&!Number.isInteger(v)||s.minimum!==undefined&&v<s.minimum||s.maximum!==undefined&&v>s.maximum||s.exclusiveMinimum!==undefined&&v<=s.exclusiveMinimum) {
        if (context==='Position') geometry(); shape('validate');
      }
    }
    if (typeof v==='string') {
      if (s.minLength!==undefined&&v.length<s.minLength||s.pattern&&!new RegExp(s.pattern,'u').test(v)) shape();
    }
    if (Array.isArray(v)) {
      if (s.minItems!==undefined&&v.length<s.minItems||s.maxItems!==undefined&&v.length>s.maxItems) shape();
      for (let i=0;i<v.length;i++) check(Array.isArray(s.items)?s.items[i]??s.additionalItems??true:s.items,v[i],String(i),s['x-typeName']??context);
      visited.push([s,v]);
    } else if (v!==null&&typeof v==='object') {
      const keys=Object.keys(v);
      if (s.minProperties!==undefined&&keys.length<s.minProperties||s.required?.some(k=>!Object.hasOwn(v,k))) shape();
      for (const k of keys) {
        if (s.propertyNames) check(s.propertyNames,k,k,context);
        if (Object.hasOwn(s.properties??{},k)) check(s.properties[k],v[k],k,context);
        else if (s.additionalProperties===false) fail('UNKNOWN_REQUIRED_FIELD','UNKNOWN_FIELD','decode');
        else if (s.additionalProperties) check(s.additionalProperties,v[k],k,context);
      }
    }
  }
  check({$ref:'#/definitions/'+type},out);
  // Domains run only after complete structural admission, nested first as in
  // the published census; no defaults, coercion, or removal of source fields.
  for (const [name,v] of visited) if (typeof name==='string') domain(name,v); else arrayDomain(name,v);
  function freeze(v) { if (v&&typeof v==='object') { for (const x of Object.values(v)) freeze(x); Object.freeze(v); } return v; }
  return freeze(out);
}
