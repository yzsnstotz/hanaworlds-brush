// Self-owned C-brush v3 closure: two pure compiler operations, no external SDK.
import canonicalize from 'canonicalize';
import { createHash } from 'node:crypto';
import metadata from './contract-metadata.json' with { type: 'json' };
import { ContractError, fail, snapshot, decodeRawJSON, validateType } from './validation.mjs';
import { expandEffects, unionBounds } from './expand.mjs';
export { ContractError, snapshot, decodeRawJSON, validateType };
export const version=metadata.sourceVersion;
// Owned, build-verified JSON constants are frozen without invoking serializers.
function freezeMetadata(value) {
 if(value&&typeof value==='object'){for(const child of Object.values(value))freezeMetadata(child);Object.freeze(value);}return value;
}
export const contractHandshake=freezeMetadata(metadata.legacyContractHandshake);
export const contractProtocols=freezeMetadata(metadata.brushProtocols);
export const digestProfile=Object.freeze({domainPrefix:'HanaWorlds|contracts@0.4.0|',domainSuffix:'|',domainPrefixByKind:Object.freeze({
 'region-block':'HanaWorlds|region-voxels/v2|','region-build':'HanaWorlds|region-voxels/v2|','region-operations':'HanaWorlds|region-voxels/v2|',
})});
const check=(condition,code,reason,phase='validate',retryability)=>{if(!condition)fail(code,reason,phase,retryability);};
const positionKey=p=>p.join(',');
export const comparePosition=(a,b)=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2];
const compareMaterial=(a,b)=>(a.materialRef<b.materialRef?-1:a.materialRef>b.materialRef?1:0)||a.orientation-b.orientation;
// C-brush canonical-library admission (census U:69-74). Inspect descriptors,
// never read or invoke caller-owned prototype hooks, including accessors.
function requireSafeCanonicalLibrary() {
 if(Object.hasOwn(Object.prototype,'toJSON')||Object.hasOwn(Array.prototype,'toJSON'))fail('SCHEMA_INVALID','INVALID_SHAPE','decode');
}
const canonical=value=>{requireSafeCanonicalLibrary();return canonicalize(value);};
const equal=(a,b)=>canonical(a)===canonical(b);
const inBox=(p,b)=>p.every((n,a)=>n>=b.min[a]&&n<=b.max[a]);
const ambiguity=condition=>check(condition,'NON_CANONICAL_AMBIGUITY','PAYLOAD_CHANGED','validate','NEVER');
const digestTypes={build:'BuildProjection',catalogue:'Catalogue',frame:'Frame','target-facts':'TargetFacts','safety-profile':'SafetyProfile',
 'compilation-config':'CompilationConfig',operations:'OperationsProjection','final-effects':'FinalEffects',coverage:'Coverage',
 'region-block':'RegionVoxelBlock','region-build':'RegionBuildProjection','region-operations':'RegionOperationsProjection'};
function chunkDigests(projection) {
 for(const c of projection.chunks)if(Object.hasOwn(c,'blockDigest'))ambiguity(c.blockDigest===digestValue('region-block',c.block).sha256);
}
export function digestValue(kind,value) {
 requireSafeCanonicalLibrary();
 const type=digestTypes[kind];if(!type)throw new TypeError('brush: unsupported internal digest kind '+kind);
 const projection=validateType(type,value);if(kind==='region-operations')chunkDigests(projection);
 const canonicalJSON=canonical(projection),preimage=(digestProfile.domainPrefixByKind[kind]??digestProfile.domainPrefix)+kind+digestProfile.domainSuffix+canonicalJSON;
 return {projection,canonicalJSON,preimage,sha256:createHash('sha256').update(preimage,'utf8').digest('hex')};
}
const boundDigest=(kind,value,expected)=>ambiguity(digestValue(kind,value).sha256===expected);
function operationTypes(wire,operation) {
 if(wire==='BUILD/V5'&&operation==='BuildDocument')return ['BuildDocumentRequest','BuildDocumentResponse'];
 if(wire==='region-build/v2'&&operation==='CompileRegionBuild')return ['CompileRegionBuildRequest','CompileRegionBuildResponse'];
 throw new TypeError('brush: unsupported internal operation');
}
export function validateResponse(wire,operation,value) {
 const out=validateType(operationTypes(wire,operation)[1],value);
 if(operation==='CompileRegionBuild'&&out.result!==null)chunkDigests(out.result.projection);return out;
}
export function validateBoundRequest(wire,operation,value) {
 if(operation==='CompileRegionBuild')return validateCompileRegionBuildRequest(value);
 requireSafeCanonicalLibrary();
 const q=validateType(operationTypes(wire,operation)[0],value);
 for(const [kind,field] of [['build','build'],['catalogue','catalogue'],['target-facts','targetFacts'],['safety-profile','safetyProfile'],['compilation-config','compilationConfig']])boundDigest(kind,q[field],q[field+'Digest']);
 check(q.worldRef===q.localContext.worldRef&&(q.targetFacts.worldRef===null||q.targetFacts.worldRef===q.localContext.worldRef),'CURRENT_WORLD_MISMATCH','REVISION_CHANGED');
 for(const field of ['catalogueDigest','targetFactsDigest','safetyProfileDigest'])check(q.build[field]===q[field],'TRANSACTION_CONFLICT','PAYLOAD_CHANGED');
 boundDigest('frame',q.build.coordinateFrame,q.targetFacts.frameDigest);return q;
}
export function validateFactsCoverage(value,coverageValue) {
 const facts=validateType('TargetFacts',value),coverage=validateType('Coverage',coverageValue);
 check(equal(facts.sampledBounds,coverage.sampledBounds),'SCHEMA_INVALID','INVALID_GEOMETRY');
 for(const p of coverage.sampledPositions)check(inBox(p,coverage.sampledBounds),'SCHEMA_INVALID','INVALID_GEOMETRY');
 const actual=[...facts.occupiedCells.map(c=>c.position),...facts.knownEmptyCells,...facts.unknownCells.map(c=>c.position)].sort(comparePosition);
 check(equal(actual,coverage.sampledPositions),'TARGET_FACTS_INCOMPLETE','REQUIRED_FACT_UNKNOWN');
 boundDigest('coverage',coverage,facts.coverageDigest);return facts;
}
export function validateStaticMaterials(materials,catalogueValue) {
 const catalogue=validateType('Catalogue',catalogueValue);
 for(const spec of Object.values(materials)) {
  check(Object.hasOwn(catalogue.materials,spec.materialRef),'CATALOGUE_MISMATCH','CATALOGUE_UNRESOLVED');
  const tags=catalogue.materials[spec.materialRef];
  check(tags.placeable===true&&tags.definitionRevision!==null&&tags.orientations!==null&&tags.orientations.includes(spec.orientation),'UNSUPPORTED_MUTATION_SEMANTICS','REQUIRED_FACT_UNKNOWN');
 }
 return materials;
}
// BigInt slab edges include both safe-integer extremes without rounding.
export function unionCellCount(operations) {
 const cuts=[0,1,2].map(a=>[...new Set(operations.flatMap(op=>[BigInt(op.min[a]),BigInt(op.max[a])+1n]))].sort((a,b)=>a<b?-1:a>b?1:0));
 const [xs,ys,zs]=cuts;let count=0n;
 for(let x=0;x+1<xs.length;x++) {
  const inX=operations.filter(op=>BigInt(op.min[0])<=xs[x]&&xs[x]<=BigInt(op.max[0]));if(!inX.length)continue;
  for(let y=0;y+1<ys.length;y++) {
   const inXY=inX.filter(op=>BigInt(op.min[1])<=ys[y]&&ys[y]<=BigInt(op.max[1]));if(!inXY.length)continue;
   for(let z=0;z+1<zs.length;z++)if(inXY.some(op=>BigInt(op.min[2])<=zs[z]&&zs[z]<=BigInt(op.max[2])))count+=(xs[x+1]-xs[x])*(ys[y+1]-ys[y])*(zs[z+1]-zs[z]);
  }
 }
 return count;
}
export function validateWitnessCoherence({build:buildValue,finalEffects:finalValue,targetFacts:factsValue,safetyProfile:safetyValue,catalogue:catalogueValue}) {
 const build=validateType('BuildProjection',buildValue),final=validateType('FinalEffects',finalValue),facts=validateType('TargetFacts',factsValue),safety=validateType('SafetyProfile',safetyValue),catalogue=validateType('Catalogue',catalogueValue);
 validateStaticMaterials(build.materials,catalogue);
 for(const cell of facts.occupiedCells)check(cell.materialRef!==catalogue.emptyMaterialRef,'CATALOGUE_MISMATCH','CATALOGUE_UNRESOLVED');
 check(BigInt(final.effects.length)===unionCellCount(build.operations)&&equal(final.effects,expandEffects(build.operations,build.materials)),'SCHEMA_INVALID','INVALID_GEOMETRY');
 const fd=digestValue('final-effects',final).sha256,td=digestValue('target-facts',facts).sha256,sd=digestValue('safety-profile',safety).sha256,cd=digestValue('catalogue',catalogue).sha256;
 ambiguity(build.targetFactsDigest===td&&build.safetyProfileDigest===sd&&build.catalogueDigest===cd&&final.catalogueDigest===cd&&final.frameDigest===facts.frameDigest);
 check(safety.requireBodyClearance,'CAPABILITY_UNAVAILABLE','POLICY_UNAVAILABLE');
 check(safety.optionalLightRule===null,'CAPABILITY_UNAVAILABLE','REQUIRED_FACT_UNKNOWN');
 const byPredicate=new Map(build.witnesses.map(w=>[w.predicate,w]));
 for(const predicate of ['COVERAGE','BODY_CLEARANCE','HAZARD',...(safety.requireEntranceConnectivity?['ENTRANCE_CONNECTIVITY']:[])])check(byPredicate.has(predicate),'SAFETY_INVARIANT_FAILED','REQUIRED_FACT_UNKNOWN');
 const written=new Map(final.effects.map(c=>[positionKey(c.position),c.materialRef])),occupied=new Map(facts.occupiedCells.map(c=>[positionKey(c.position),c.materialRef])),empty=new Set(facts.knownEmptyCells.map(positionKey));
 for(const w of build.witnesses) {
  ambiguity(w.finalEffectsDigest===fd&&w.targetFactsDigest===td&&w.safetyProfileDigest===sd);
  if(w.predicate==='COVERAGE'||w.predicate==='BODY_CLEARANCE') {
   const positions=new Set(w.facts.positions.map(positionKey));for(const effect of final.effects)check(positions.has(positionKey(effect.position)),'SAFETY_INVARIANT_FAILED','REQUIRED_FACT_UNKNOWN');
  }
  if(w.predicate==='HAZARD') {
   ambiguity(w.facts.forbidLiquid===safety.hazardPolicy.forbidLiquid&&w.facts.maximumDamagePerSecond===safety.hazardPolicy.maximumDamagePerSecond);
   for(const p of w.facts.positions) {
    const key=positionKey(p),ref=written.get(key)??occupied.get(key)??(empty.has(key)?catalogue.emptyMaterialRef:null);
    check(ref!==null&&Object.hasOwn(catalogue.materials,ref),'TARGET_FACTS_INCOMPLETE','REQUIRED_FACT_UNKNOWN');
    const tags=catalogue.materials[ref];check(tags.liquid!==null&&tags.hazardPerSecond!==null,'UNSUPPORTED_MUTATION_SEMANTICS','REQUIRED_FACT_UNKNOWN');
    check((!w.facts.forbidLiquid||tags.liquid===false)&&tags.hazardPerSecond<=w.facts.maximumDamagePerSecond,'SAFETY_INVARIANT_FAILED','REQUIRED_FACT_UNKNOWN');
   }
  }
 }
 return final;
}
export function regionBlockBox(block) {
 return {min:[...block.origin],max:block.origin.map((o,a)=>Number(BigInt(o)+BigInt(block.size[a])-1n))};
}
export function expandRegionBlock(value) {
 const block=validateType('RegionVoxelBlock',value),volume=block.size.reduce((a,b)=>a*b,1),indices=new Int32Array(volume);
 let start=0;for(const [count,index] of block.runs){indices.fill(index===null?-1:index,start,start+count);start+=count;}
 return {origin:block.origin,size:block.size,box:regionBlockBox(block),palette:block.palette,indices};
}
export function encodeRegionBlock({origin,size,palette,indices}) {
 validateType('Position',origin);validateType('RegionSize',size);palette=palette.map(spec=>validateType('MaterialSpec',spec));
 const volume=size.reduce((a,b)=>a*b,1);check(Number.isSafeInteger(volume)&&indices.length===volume,'SCHEMA_INVALID','INVALID_SHAPE');
 const used=new Set();for(const index of indices){check(Number.isInteger(index)&&index>=-1&&index<palette.length,'SCHEMA_INVALID','INVALID_SHAPE');if(index!==-1)used.add(index);}
 check(used.size>0,'SCHEMA_INVALID','INVALID_SHAPE');
 const canonicalPalette=[...new Map([...used].map(index=>[canonical(palette[index]),palette[index]])).values()].sort(compareMaterial);
 const bySpec=new Map(canonicalPalette.map((spec,index)=>[canonical(spec),index])),remap=new Map([...used].map(index=>[index,bySpec.get(canonical(palette[index]))]));
 const runs=[];for(const index of indices){const mapped=index===-1?null:remap.get(index),last=runs.at(-1);if(last&&last[1]===mapped)last[0]++;else runs.push([1,mapped]);}
 return validateType('RegionVoxelBlock',{profileVersion:'region-voxels/v2',geometryProfile:'voxel-grid/v1',origin:[...origin],size:[...size],indexOrder:'X_FASTEST_THEN_Y_THEN_Z',palette:canonicalPalette,runs});
}
const floorDiv=(n,d)=>{const quotient=n/d;return n<0n&&n%d!==0n?quotient-1n:quotient;};
export function* regionChunksOfBox(boxValue,partitionValue) {
 const box=validateType('Box',boxValue),partition=validateType('Partition',partitionValue),edges=partition.edge.map(BigInt);
 const lo=box.min.map((p,a)=>floorDiv(BigInt(p),edges[a])),hi=box.max.map((p,a)=>floorDiv(BigInt(p),edges[a]));
 for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++) {
  const pos=[x,y,z],min=pos.map((n,a)=>{const p=n*edges[a],bound=BigInt(box.min[a]);return Number(p>bound?p:bound);}),max=pos.map((n,a)=>{const p=(n+1n)*edges[a]-1n,bound=BigInt(box.max[a]);return Number(p<bound?p:bound);});
  yield {chunkPos:pos.map(Number),box:{min,max}};
 }
}
export function validateCompileRegionBuildRequest(value) {
 requireSafeCanonicalLibrary();
 const q=validateType('CompileRegionBuildRequest',value);
 check(q.worldRef===q.localContext.worldRef&&q.worldRef===q.build.worldRef,'CURRENT_WORLD_MISMATCH','SCOPE_DENIED');
 check(q.build.catalogueDigest===q.catalogueDigest,'SCHEMA_INVALID','INVALID_SHAPE');
 boundDigest('region-build',q.build,q.buildDigest);boundDigest('catalogue',q.catalogue,q.catalogueDigest);
 validateStaticMaterials(q.build.block.palette,q.catalogue);return q;
}
export function validateCompiledRegionSet(requestValue,responseValue) {
 const q=validateCompileRegionBuildRequest(requestValue),out=validateResponse('region-build/v2','CompileRegionBuild',responseValue);
 if(out.result===null)return out;
 const result=out.result,p=result.projection;
 check(out.requestId===q.requestId&&['buildDigest','compilerRevision','worldRef','catalogueDigest'].every(k=>p[k]===q[k])&&equal(p.partition,q.partition),'TRANSACTION_CONFLICT','PAYLOAD_CHANGED');
 boundDigest('region-operations',p,result.operationDigest);
 const original=expandRegionBlock(q.build.block),[sx,sy]=q.build.block.size,seen=new Set();let specified=0;
 for(const index of original.indices)if(index!==-1)specified++;
 for(const chunk of p.chunks) {
  const part=expandRegionBlock(chunk.block);check(inBox(part.box.min,original.box)&&inBox(part.box.max,original.box),'BUILD_INVALID','INVALID_GEOMETRY');
  let i=0;for(let z=part.box.min[2];z<=part.box.max[2];z++)for(let y=part.box.min[1];y<=part.box.max[1];y++)for(let x=part.box.min[0];x<=part.box.max[0];x++,i++) {
   const paletteIndex=part.indices[i];if(paletteIndex===-1)continue;
   const position=[x,y,z],key=positionKey(position),originalIndex=(x-original.box.min[0])+sx*((y-original.box.min[1])+sy*(z-original.box.min[2])),sourceIndex=original.indices[originalIndex];
   check(!seen.has(key)&&sourceIndex!==-1&&equal(part.palette[paletteIndex],original.palette[sourceIndex]),'BUILD_INVALID','INVALID_GEOMETRY');seen.add(key);
  }
 }
 check(seen.size===specified,'BUILD_INVALID','INVALID_GEOMETRY');return out;
}
export function validateBoundResponse(wire,operation,requestValue,responseValue) {
 if(operation==='CompileRegionBuild')return validateCompiledRegionSet(requestValue,responseValue);
 const q=validateBoundRequest(wire,operation,requestValue),out=validateResponse(wire,operation,responseValue);
 check(out.requestId===q.requestId,'TRANSACTION_CONFLICT','PAYLOAD_CHANGED');
 if(out.result!==null) {
  const p=out.result.projection;
  check(['buildDigest','compilerRevision','compilationConfigDigest','worldRef','catalogueDigest','targetFactsDigest'].every(k=>p[k]===q[k])&&p.frameDigest===q.targetFacts.frameDigest,'TRANSACTION_CONFLICT','PAYLOAD_CHANGED');
  boundDigest('operations',p,out.result.operationDigest);
  check(equal(p.effects,expandEffects(q.build.operations,q.build.materials))&&equal(out.result.readBounds,q.targetFacts.sampledBounds)&&equal(out.result.writeBounds,unionBounds(q.build.operations)),'SCHEMA_INVALID','INVALID_GEOMETRY');
 }
 return out;
}
