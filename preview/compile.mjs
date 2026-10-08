// This dev panel prepares fixture inputs and summarizes outputs; Brush owns all compilation.
import {readFileSync} from 'node:fs';
import {compileRegionBuild, version} from 'hanaworlds-brush';
const brushEntry=import.meta.resolve('hanaworlds-brush');
const pin=await import(new URL('./contracts.mjs',brushEntry));
const contracts=await import(pin.contractsUrl);
const fixture=JSON.parse(readFileSync(new URL(pin.contractsFixtureUrl('region'))));
const {ContractError,encodeRegionBlock,regionBlockBox,digestValue,expandRegionBlock}=contracts;
const errorText=error=>({CATALOGUE_MISMATCH:'材质不在 fixture 材料目录中。',UNSUPPORTED_MUTATION_SEMANTICS:'该材质参数不能用于此样例。',LIMIT_EXCEEDED:'输入超出了本机编译器可处理的容量。',SCHEMA_INVALID:'样例输入不合法，请检查尺寸和材质。'}[error.code]??`编译被拒绝：${error.code}。`);

export function compilePreview(input) {
 if(version!=='0.5.0') throw new Error(`此面板需要 Brush 0.5.0，当前为 ${version}`);
 if(!input || !['house','fill','carve','invalid'].includes(input.sample)) return {ok:false,error:'请选择一个样例。'};
 const size=[input.width,input.height,input.depth];
 if(!size.every(n=>Number.isSafeInteger(n)&&n>0)) return {ok:false,error:'宽、高、深都必须是正整数。'};
 if(!['fixture:stone','fixture:dirt'].includes(input.material)) return {ok:false,error:'请选择 fixture 石头或泥土。'};
 try {
  const [sx,sy,sz]=size;
  const palette=[{nodeName:'air',param2:0},{nodeName:input.sample==='invalid'?'fixture:missing':input.material,param2:0}];
  const indices=new Int32Array(sx*sy*sz);
  let i=0;
  for(let z=0;z<sz;z++)for(let y=0;y<sy;y++)for(let x=0;x<sx;x++,i++) {
   const shell=y===0||y===sy-1||x===0||x===sx-1||z===0||z===sz-1;
   const doorway=z===0&&x===Math.floor(sx/2)&&y>0&&y<sy-1;
   indices[i]=input.sample==='carve'?0:input.sample==='house'&&(!shell||doorway)?-1:1;
  }
  const block=encodeRegionBlock({origin:[0,0,0],size,palette,indices});
  const build={...fixture.compileRequest.build,documentId:'brush-preview-fixture',block,declaredBounds:regionBlockBox(block)};
  const request={...fixture.compileRequest,requestId:'brush-preview-fixture',build,buildDigest:digestValue('region-build',build).sha256,compilerRevision:'hanaworlds-brush@0.5.0'};
  const compiled=compileRegionBuild(request);
  if(compiled.error) return {ok:false,error:errorText(compiled.error),code:compiled.error.code};
  const cells=[],counts=new Map(),chunks=[];
  for(const chunk of compiled.result.projection.chunks) {
   const expanded=expandRegionBlock(chunk.block),[cx,cy]=expanded.size;let count=0;
   for(let n=0;n<expanded.indices.length;n++) {
    const index=expanded.indices[n];if(index===-1)continue;
    const material=expanded.palette[index];
    const position=[expanded.box.min[0]+n%cx,expanded.box.min[1]+Math.floor(n/cx)%cy,expanded.box.min[2]+Math.floor(n/(cx*cy))];
    cells.push({position,...material});count++;
    const key=JSON.stringify(material);counts.set(key,(counts.get(key)??0)+1);
   }
   chunks.push({chunkPos:chunk.chunkPos,count,operationDigest:digestValue('region-operations',{...compiled.result.projection,chunks:[chunk]}).sha256});
  }
  return {ok:true,evidence:'SOURCE/FIXTURE 输入；Brush 0.5.0 在 Host 真实编译；无世界写入',compiler:{name:'hanaworlds-brush',version,runtime:'HOST'},sample:input.sample,size,cellCount:cells.length,operationDigest:compiled.result.operationDigest,materials:[...counts].map(([key,count])=>({...JSON.parse(key),count})).sort((a,b)=>a.nodeName.localeCompare(b.nodeName)||a.param2-b.param2),chunks,cells};
 } catch(error) {
  if(error instanceof ContractError)return {ok:false,error:errorText(error),code:error.code};
  if(error instanceof RangeError)return {ok:false,error:'输入超出了本机编译器可处理的容量。',code:'LIMIT_EXCEEDED'};
  throw error;
 }
}
