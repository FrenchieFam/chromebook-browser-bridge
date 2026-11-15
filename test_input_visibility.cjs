'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/extension/worker.js','utf8');
const functions=source.slice(source.indexOf('const cdp='),source.indexOf("const VERSION="));
function fixture({visible=false,activate=true,hideOnMeasure=false,hideOnPress=false}={}){
 const calls=[],effects={scroll:0,checked:false};let visibility=visible?'visible':'hidden',releaseFocus=null,blockFocus=false;
 const element={type:'checkbox',tagName:'INPUT',disabled:false,isConnected:true,contains:x=>x===element,scrollIntoView(){effects.scroll++;},getBoundingClientRect(){if(hideOnMeasure)visibility='hidden';return {x:10,y:20,width:40,height:20};}};
 const document={get visibilityState(){return visibility;},querySelector:()=>element,elementFromPoint:()=>element};
 const page=vm.createContext({document,scrollX:0,scrollY:0,innerWidth:640,innerHeight:480,setTimeout:f=>queueMicrotask(f)});
 const chrome={debugger:{async sendCommand(target,method,params){
  calls.push({tabId:target.tabId,method,params});
  if(method==='Page.bringToFront'){
   if(blockFocus)await new Promise(resolve=>{releaseFocus=resolve;});
   if(activate)visibility='visible';return {};
  }
  if(method==='Runtime.evaluate'){
   try{return {result:{value:await vm.runInContext(params.expression,page)}};}
   catch(error){return {exceptionDetails:{text:error.message}};}
  }
  if(method==='Input.dispatchMouseEvent'){
   if(params.type==='mousePressed'&&hideOnPress)visibility='hidden';
   if(params.type==='mouseReleased'&&visibility==='visible')effects.checked=!effects.checked;
  }
  return {};
 }}};
 const context=vm.createContext({chrome,tabId:7,jobTarget:{tabId:7,intent:1},intent:1,setTimeout:f=>queueMicrotask(f)});
 vm.runInContext(functions,context);
 return {calls,effects,perform:job=>vm.runInContext('perform('+JSON.stringify(job)+')',context),
  eval:code=>vm.runInContext(code,context),gateFocus(){blockFocus=true;},release(){releaseFocus();},
  async ready(){while(!releaseFocus)await new Promise(setImmediate);}};
}
test('hidden click/type/key fail before input or scrolling',async()=>{
 for(const job of [{action:'click',args:{selector:'#target'}},{action:'type',args:{selector:'#target',text:'example'}},{action:'key',args:{key:'Enter'}}]){
  const f=fixture();await assert.rejects(f.perform(job),/hidden/);
  assert.equal(f.effects.scroll,0);assert.equal(f.calls.some(c=>c.method.startsWith('Input.')),false);
 }
});
test('explicit focus activates only the connected target, then click is delivered',async()=>{
 const f=fixture();const result=await f.perform({action:'focus'});assert.equal(result.visibility,'visible');
 await f.perform({action:'click',args:{selector:'#target'}});assert.equal(f.effects.checked,true);
 assert.equal(f.calls.filter(c=>c.method==='Page.bringToFront').length,1);
 assert.ok(f.calls.every(c=>c.tabId===7));
});
test('ordinary visible click never implicitly changes tab focus',async()=>{
 const f=fixture({visible:true});await f.perform({action:'click',args:{selector:'#target'}});
 assert.equal(f.effects.checked,true);assert.equal(f.calls.some(c=>c.method==='Page.bringToFront'),false);
});
test('focus cannot report success while the page stays hidden',async()=>{
 const f=fixture({activate:false});await assert.rejects(f.perform({action:'focus'}),/still hidden/);
 assert.equal(f.calls.some(c=>c.method.startsWith('Input.')),false);
});
test('connection change during focus prevents commands reaching replacement tab',async()=>{
 const f=fixture();f.gateFocus();const pending=f.perform({action:'focus'});await f.ready();
 f.eval('intent++;tabId=99');f.release();await assert.rejects(pending,/Connection changed/);
 assert.equal(f.calls.length,1);assert.equal(f.calls[0].tabId,7);
});
test('focus cannot reconnect a missing target',async()=>{
 const f=fixture();f.eval('tabId=null');await assert.rejects(f.perform({action:'focus'}),/Connection changed|No selected tab/);
 assert.equal(f.calls.length,0);
});
test('visibility loss during measurement prevents any input dispatch',async()=>{
 const f=fixture({visible:true,hideOnMeasure:true});await assert.rejects(f.perform({action:'click',args:{selector:'#target'}}),/hidden/);
 assert.equal(f.calls.some(c=>c.method.startsWith('Input.')),false);
});
test('visibility loss during mouse press is reported as ambiguous, without blind retry',async()=>{
 const f=fixture({visible:true,hideOnPress:true});await assert.rejects(f.perform({action:'click',args:{selector:'#target'}}),/may have happened/);
 assert.equal(f.calls.filter(c=>c.method==='Input.dispatchMouseEvent').length,2);
 assert.equal(f.effects.checked,false);
});
