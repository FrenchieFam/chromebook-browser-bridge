'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/extension/worker.js','utf8');
async function fixture(initial={},initialTabs=[]){
 const powerRequests=[],powerReleases=[],permissionEvents=[];let powerAllowed=true;
 const local={...initial},session={},tabs=new Map(initialTabs.map(t=>[t.id,{...t}])),attached=new Set(),created=[],alarms=new Map(),messages=[],detachEvents=[],alarmEvents=[],startupEvents=[];
 let next=100,online=true,blocked=null,gateNext=false;
 const storage=data=>({async get(keys){const out={};for(const k of Array.isArray(keys)?keys:[keys])if(k in data)out[k]=data[k];return out;},async set(values){Object.assign(data,values);},async remove(key){delete data[key];}});
 const chrome={power:{requestKeepAwake(level){powerRequests.push(level);},releaseKeepAwake(){powerReleases.push(true);}},permissions:{async contains(){return powerAllowed;},onRemoved:{addListener(fn){permissionEvents.push(fn);}}},storage:{local:storage(local),session:storage(session)},
  tabs:{async get(id){if(!tabs.has(id))throw Error('No tab');return {...tabs.get(id)};},async create(options){const tab={id:next++,...options,title:'Work tab'};tabs.set(tab.id,tab);created.push(tab);return tab;}},
  debugger:{async attach(target){attached.add(target.tabId);},async detach(target){attached.delete(target.tabId);for(const h of detachEvents)h(target,'canceled_by_user');},async sendCommand(target){if(!attached.has(target.tabId))throw Error('Not attached');return {result:{value:true}};},onDetach:{addListener(fn){detachEvents.push(fn);}}},
  action:{async setBadgeText(){},async setBadgeBackgroundColor(){}},
  alarms:{async create(name,options){alarms.set(name,options);},async clear(name){alarms.delete(name);},onAlarm:{addListener(fn){alarmEvents.push(fn);}}},
  runtime:{getURL:p=>'chrome-extension://test/'+p,onInstalled:{addListener(){}},onStartup:{addListener(fn){startupEvents.push(fn);}},onMessage:{addListener(fn){messages.push(fn);}}}};
 const fetch=async(url,options)=>{
  const path=new URL(url).pathname;
  if(path==='/status'&&gateNext){gateNext=false;await new Promise(resolve=>{blocked=resolve;});}
  if(!online)throw Error('Linux offline');
  return {ok:true,async json(){return path==='/poll'?{job:null}:{};}};
 };
 const context={chrome,fetch,URL,AbortSignal,BRIDGE_URL:'http://bridge.test',BRIDGE_TOKEN:'test-only-token',importScripts(...names){if(names.includes('power.js'))vm.runInContext(fs.readFileSync(__dirname+'/extension/power.js','utf8'),context);},setTimeout(){return 1;},clearTimeout(){},console};
 vm.createContext(context);vm.runInContext(source,context);
 const flush=async()=>{for(let i=0;i<12;i++)await new Promise(setImmediate);};
 await flush();
 return {local,session,tabs,attached,created,alarms,powerRequests,powerReleases,flush,async revoke(){powerAllowed=false;for(const fn of permissionEvents)fn({permissions:['power']});await flush();},eval(code){return vm.runInContext(code,context);},
  async message(data,sender={url:'chrome-extension://test/popup.html'}){const result=await new Promise(resolve=>messages[0](data,sender,resolve));await flush();return result;},
  async alarm(name='bry-work-tab-recovery'){for(const fn of alarmEvents)fn({name});await flush();},
  async detach(id,reason){attached.delete(id);for(const fn of detachEvents)fn({tabId:id},reason);await flush();},
  async startup(){for(const fn of startupEvents)fn();await flush();},
  network(value){online=value;},gate(){gateNext=true;},release(){blocked();},
 };
}
test('session-only default does not create or attach any tab',async()=>{const f=await fixture();assert.equal(f.created.length,0);assert.equal(f.attached.size,0);assert.equal(f.alarms.size,0);});
test('persistent mode creates one background pinned tab and survives startup event',async()=>{const f=await fixture();const r=await f.message({action:'persistent',startURL:'https://example.com/'});assert.equal(r.ok,true);assert.equal(f.local.persistentEnabled,true);assert.equal(f.created.length,1);assert.equal(f.created[0].pinned,true);assert.equal(f.created[0].active,false);await f.startup();assert.equal(f.created.length,1);});
test('Disconnect persists pause and alarms cannot undo it',async()=>{const f=await fixture();await f.message({action:'persistent',startURL:'https://example.com/'});await f.message({action:'disconnect'});assert.equal(f.local.persistentEnabled,false);assert.equal(f.attached.size,0);assert.equal(f.alarms.size,0);await f.alarm();assert.equal(f.created.length,1);assert.equal(f.attached.size,0);});
test('canceling Chrome banner pauses automatic recovery',async()=>{const f=await fixture();await f.message({action:'persistent',startURL:'https://example.com/'});await f.detach(100,'canceled_by_user');assert.equal(f.local.persistentEnabled,false);await f.alarm();assert.equal(f.attached.size,0);});
test('Linux offline waits without creating tabs, then recovers after alarm',async()=>{const f=await fixture();f.network(false);const r=await f.message({action:'persistent',startURL:'https://example.com/'});assert.equal(r.persistentEnabled,true);assert.equal(f.created.length,0);f.network(true);await f.alarm();assert.equal(f.created.length,1);assert.equal(f.attached.has(100),true);});
test('browser restart reuses only its saved matching pinned start page',async()=>{const f=await fixture({persistentEnabled:true,startURL:'https://example.com/',workTabId:9},[{id:9,url:'https://example.com/',pinned:true}]);assert.equal(f.created.length,0);assert.equal(f.attached.has(9),true);});
test('a reused ID belonging to a different page is never attached',async()=>{const f=await fixture({persistentEnabled:true,startURL:'https://example.com/',workTabId:9},[{id:9,url:'https://private.example/',pinned:true}]);assert.equal(f.attached.has(9),false);assert.equal(f.attached.has(100),true);});
test('closed/crashed persistent tab recovers in background',async()=>{const f=await fixture();await f.message({action:'persistent',startURL:'https://example.com/'});f.tabs.delete(100);await f.detach(100,'target_closed');assert.equal(f.local.persistentEnabled,true);await f.alarm();assert.equal(f.attached.has(101),true);assert.equal(f.created[1].active,false);});
test('choosing an ordinary tab disables persistent mode',async()=>{const f=await fixture({},[{id:9,url:'https://example.com/',pinned:false}]);await f.message({action:'persistent',startURL:'https://example.com/'});const r=await f.message({action:'connect',tabId:9});assert.equal(r.tabId,9);assert.equal(f.local.persistentEnabled,false);assert.equal(f.attached.has(100),false);assert.equal(f.attached.has(9),true);});
test('stop during an in-flight recovery prevents late attachment',async()=>{const f=await fixture();f.gate();const attempt=f.message({action:'persistent',startURL:'https://example.com/'});await f.flush();await f.message({action:'disconnect'});f.release();await attempt;assert.equal(f.local.persistentEnabled,false);assert.equal(f.created.length,0);assert.equal(f.attached.size,0);});
test('persistent start URL rejects credentials and secret link components',async()=>{const f=await fixture();for(const url of ['chrome://settings/','https://user:password@example.com/','https://example.com/?token=secret','https://example.com/#secret']){const r=await f.message({action:'persistent',startURL:url});assert.equal(r.ok,false);}assert.equal(f.created.length,0);});

test('queued commands cannot move to another tab or a replacement connection',async()=>{const f=await fixture();await f.message({action:'persistent',startURL:'https://example.com/'});assert.throws(()=>f.eval("jobTarget={tabId:100,intent:intent-1};cdp('Runtime.evaluate',{})"),/Connection changed/);assert.throws(()=>f.eval("jobTarget={tabId:999,intent};cdp('Runtime.evaluate',{})"),/Connection changed/);});

test('keep-awake requires popup origin and active connection',async()=>{const f=await fixture();let r=await f.message({action:'wake-start',minutes:15});assert.equal(r.ok,false);await f.message({action:'persistent'});r=await f.message({action:'wake-start',minutes:15},{url:'https://untrusted.example/'});assert.equal(r.ok,false);assert.equal(f.powerRequests.length,0);});
test('explicit wake start is released on Disconnect and cannot recover with work tab',async()=>{const f=await fixture();await f.message({action:'persistent'});let r=await f.message({action:'wake-start',minutes:15});assert.equal(r.wake.active,true);assert.deepEqual(f.powerRequests,['system']);await f.message({action:'disconnect'});await f.alarm();r=await f.message({action:'status'});assert.equal(r.wake.active,false);assert.equal(r.persistentEnabled,false);assert.ok(!f.alarms.has('bridge-wake-expiry'));});
test('banner cancellation and tab loss each release wake without lease resurrection',async()=>{for(const reason of ['canceled_by_user','target_closed']){const f=await fixture();await f.message({action:'persistent'});await f.message({action:'wake-start',minutes:15});await f.detach(100,reason);await f.alarm();assert.equal((await f.message({action:'status'})).wake.active,false);assert.equal(f.powerRequests.length,1);}});
test('permission revocation, expiry alarm and Chrome startup release active wake',async()=>{for(const event of ['revoke','expiry','startup']){const f=await fixture();await f.message({action:'persistent'});await f.message({action:'wake-start',minutes:15});if(event==='revoke')await f.revoke();else if(event==='expiry')await f.alarm('bridge-wake-expiry');else await f.startup();assert.equal((await f.message({action:'status'})).wake.active,false);}});

test('remote wake requires local owner policy; Stop and Disconnect revoke it',async()=>{for(const stop of ['wake-stop','disconnect']){const f=await fixture();await f.message({action:'persistent'});await assert.rejects(f.eval("perform({action:'wake_start',args:{minutes:15}})"),/paused/);let r=await f.message({action:'wake-remote-policy',allowed:true});assert.equal(r.wake.remoteAllowed,true);r=await f.eval("perform({action:'wake_start',args:{minutes:15}})");assert.equal(r.wake.active,true);await f.message({action:stop});assert.equal(f.local.remoteWakeAllowed,false);if(stop==='wake-stop')await assert.rejects(f.eval("perform({action:'wake_start',args:{minutes:15}})"),/paused/);}});
test('remote policy messages reject non-popup callers',async()=>{const f=await fixture();await f.message({action:'persistent'});const r=await f.message({action:'wake-remote-policy',allowed:true},{url:'https://untrusted.example/'});assert.equal(r.ok,false);assert.notEqual(f.local.remoteWakeAllowed,true);});
