import {Remote, TypertRemoteService} from '@deepseek-ai/dsh-typert-protocol';
import {compilePreview} from './compile.mjs';

// Public @Remote source-mode development endpoint; Gateway validates JSON arguments.
export class BrushPreviewService extends TypertRemoteService {
 constructor(ctx) {
  super(ctx,'hanaworldsBrushPreview');
  // Standard decorator initializer, written as JS to ship without a build step.
  Remote(BrushPreviewService.prototype.compile,{kind:'method',name:'compile',private:false,static:false,addInitializer:initialize=>initialize.call(this)});
 }
 compile(input) { return compilePreview(input); }
}
export const name='hanaworlds-brush-preview';
export const inject=['typertGateway'];
export const provide='hanaworldsBrushPreview';
export function apply(ctx) { new BrushPreviewService(ctx); }
export default {name,inject,provide,apply};
