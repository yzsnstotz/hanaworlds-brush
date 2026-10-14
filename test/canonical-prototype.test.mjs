// C-brush census U:69-74: reject inherited canonical hooks without executing them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const entry=import.meta.resolve(process.env.BRUSH_UNDER_TEST??'../dist/index.mjs');
for(const target of ['Object','Array'])for(const mode of ['identity','primitive','getter','null'])test(`canonical admission rejects ${target}.prototype.toJSON ${mode} in all four routes`,()=>{
 const code=`
 import * as brush from ${JSON.stringify(entry)};
 import {readDocument} from ${JSON.stringify(new URL('./independent-brush-support.mjs',import.meta.url).href)};
 const doc=readDocument(),provided=[];brush.apply({provide:(...args)=>provided.push(args)});
 const service=provided[0][1],records=[];
 const specs=['BuildDocument','CompileRegionBuild'].map(name=>({name,spec:doc.get(name),q:structuredClone(doc.get(name).cases[0].request)}));
 const inputs=specs.map(s=>({...s,bytes:new TextEncoder().encode(JSON.stringify(s.q))}));
 const proto=${target}.prototype;let calls=0;
 const desc={configurable:true};
 const mode=${JSON.stringify(mode)};
 if(mode==='getter')desc.get=()=>{calls++;return ()=>0;};
 else desc.value=mode==='null'?null:function(){calls++;return mode==='identity'?this:0;};
 Object.defineProperty(proto,'toJSON',desc);
 try {
  for(const s of inputs)for(const route of ['value','bytes','service','serviceBytes']) {
   let output,error;
   try{output=(route.startsWith('service')?service:brush)[s.spec.binding[route]](route==='bytes'||route==='serviceBytes'?s.bytes:s.q);}catch(e){error={name:e.name,message:e.message,publicError:e.publicError};}
   records.push({operation:s.name,route,output,error});
  }
 }finally{delete proto.toJSON;}
 console.log(JSON.stringify({calls,records}));`;
 const {calls,records}=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 assert.equal(calls,0,'caller prototype hook executed');assert.equal(records.length,8);
 for(const r of records){assert.equal(r.error,undefined,`${r.operation}/${r.route} must return a typed envelope`);assert.equal(r.output.result,null);assert.deepEqual(r.output.error,{code:'SCHEMA_INVALID',phase:'decode',retryability:'NEVER',mutationState:'NONE',transactionRef:null,causeCode:null,reason:'INVALID_SHAPE'});}
});
