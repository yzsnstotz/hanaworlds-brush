import test from 'node:test';
import assert from 'node:assert/strict';
import {Context} from '@deepseek-ai/cordis';
import {remoteMethods} from '@deepseek-ai/dsh-typert-protocol';
import {BrushPreviewService} from '../host.mjs';

test('real Cordis service provides a single public Remote compile method using actual Brush',()=>{
 const ctx=new Context(),service=new BrushPreviewService(ctx);
 const provided=ctx.get('hanaworldsBrushPreview');
 assert.equal(provided.typertRemote.namespace,service.typertRemote.namespace);
 assert.equal(service.typertRemote.namespace,'hanaworldsBrushPreview');
 assert.deepEqual(remoteMethods(service),[{method:'compile',invocation:{kind:'direct'}}]);
 const result=provided.compile({sample:'fill',width:18,height:2,depth:3,material:'fixture:stone'});
 assert.equal(result.ok,true);assert.equal(result.cellCount,108);
 assert.equal(result.compiler.runtime,'HOST');
});
