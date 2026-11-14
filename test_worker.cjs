'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/extension/worker.js','utf8');
const helper=source.slice(source.indexOf('async function elementPoint('),source.indexOf('async function perform('));
async function point({covered=false,moving=false,disabled=false,connected=true}={}){
 let calls=0,scrollOptions;
 const element={disabled,isConnected:connected,type:'button',scrollIntoView:x=>{scrollOptions=x;},contains:x=>x===element,getBoundingClientRect:()=>({x:moving?++calls*2:10,y:20,width:40,height:20})};
 const page={document:{querySelector:()=>element,elementFromPoint:()=>covered?{}:element},scrollX:0,scrollY:0,innerWidth:640,innerHeight:480,setTimeout:f=>{queueMicrotask(f);}};
 const context={evaluate:expression=>vm.runInNewContext(expression,page)};
 const result=await vm.runInNewContext(helper+'\nelementPoint("#target")',context);
 return {result,scrollOptions};
}
test('stable click uses viewport coordinates and instant scrolling',async()=>{const x=await point();assert.equal(x.result.x,30);assert.equal(x.result.y,30);assert.equal(x.scrollOptions.behavior,'instant');});
test('covered target is refused',async()=>{await assert.rejects(point({covered:true}),/covers the target/);});
test('continually moving target is refused',async()=>{await assert.rejects(point({moving:true}),/still moving/);});
test('disabled target is refused',async()=>{await assert.rejects(point({disabled:true}),/disabled/);});
test('detached target is refused',async()=>{await assert.rejects(point({connected:false}),/fresh snapshot/);});
