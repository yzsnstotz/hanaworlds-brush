import test from 'node:test';
import assert from 'node:assert/strict';
const load=()=>import('../compile.mjs');

test('preview compiles actual Brush region output deterministically and reflects size/material edits',async()=>{
 const {compilePreview}=await load();
 const input={sample:'fill',width:18,height:2,depth:3,material:'fixture:stone'};
 const a=compilePreview(input),b=compilePreview({...input});
 assert.equal(a.ok,true);assert.deepEqual(a,b);
 assert.equal(a.compiler.version,'0.5.1');assert.equal(a.cellCount,108);
 assert.deepEqual(a.materials,[{nodeName:'fixture:stone',param2:0,count:108}]);
 assert.equal(a.chunks.length,2);assert.equal(a.chunks.reduce((n,c)=>n+c.count,0),108);
 assert.ok(a.chunks.every(c=>/^[a-f0-9]{64}$/.test(c.operationDigest)));
 assert.equal(a.cells.length,108);assert.equal(new Set(a.cells.map(c=>c.position.join(','))).size,108);
 const larger=compilePreview({...input,width:19});
 assert.equal(larger.cellCount,114);assert.notEqual(larger.operationDigest,a.operationDigest);
 const dirt=compilePreview({...input,material:'fixture:dirt'});
 assert.equal(dirt.materials[0].nodeName,'fixture:dirt');assert.notEqual(dirt.operationDigest,a.operationDigest);
});

test('house leaves its interior unspecified; carve emits explicit air; invalid input returns a reason and no preview',async()=>{
 const {compilePreview}=await load();
 const base={width:5,height:4,depth:5,material:'fixture:stone'};
 const house=compilePreview({...base,sample:'house'}),carve=compilePreview({...base,sample:'carve'});
 assert.equal(house.ok,true);assert.ok(house.cells.length<100);
 assert.ok(!house.cells.some(c=>c.position.join(',')==='2,1,2'));
 assert.equal(carve.ok,true);assert.equal(carve.materials[0].nodeName,'air');assert.equal(carve.cellCount,100);
 for(const input of [{...base,sample:'invalid'},{...base,sample:'fill',width:0}]){
  const result=compilePreview(input);assert.equal(result.ok,false);assert.equal(typeof result.error,'string');assert.ok(result.error.length);assert.equal(result.cells,undefined);
 }
});
