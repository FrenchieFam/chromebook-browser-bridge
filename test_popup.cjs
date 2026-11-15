'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
async function fixture({connected=true,granted=true}={}){
 const elements=new Map(),messages=[],requests=[];let active=false,remoteAllowed=false;
 const get=id=>{if(!elements.has(id))elements.set(id,{value:id==='wake-duration'?'15':'',textContent:'',disabled:false,classList:{toggle(){}}});return elements.get(id);};
 const state=()=>({ok:true,tabId:connected?7:null,persistentEnabled:true,startURL:'https://example.com/',wake:{active,remoteAllowed,expiresAt:active?Date.now()+900000:null}});
 const chrome={permissions:{request(options){requests.push(options);return Promise.resolve(granted);}},runtime:{async sendMessage(message){messages.push(message);if(message.action==='wake-start')active=true;if(message.action==='wake-stop'||message.action==='disconnect'){active=false;remoteAllowed=false;}if(message.action==='wake-remote-policy')remoteAllowed=message.allowed;return state();}},tabs:{async query(){return [{id:7}];}}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/extension/popup.js','utf8'),{document:{getElementById:get},chrome,Date,setInterval(){}});
 const flush=async()=>{for(let i=0;i<5;i++)await new Promise(setImmediate);};await flush();
 return {get,messages,requests,flush};
}
test('permission is requested only on enable click, and timer stop works',async()=>{const f=await fixture();assert.equal(f.requests.length,0);await f.get('wake-start').onclick();assert.equal(f.requests.length,1);assert.ok(f.messages.some(m=>m.action==='wake-start'&&m.minutes===15));assert.equal(f.get('wake-state').textContent,'Keep-awake active');await f.get('wake-stop').onclick();assert.equal(f.get('wake-state').textContent,'Off');});
test('declining permission does not send an enable command',async()=>{const f=await fixture({granted:false});await f.get('wake-start').onclick();assert.ok(!f.messages.some(m=>m.action==='wake-start'));assert.match(f.get('wake-notice').textContent,/declined/);assert.equal(f.get('wake-state').textContent,'Off');});
test('disconnected state disables enabling and owner disconnect stays available',async()=>{const f=await fixture({connected:false});assert.equal(f.get('wake-start').disabled,true);assert.equal(f.get('stop').disabled,false);await f.get('stop').onclick();assert.ok(f.messages.some(m=>m.action==='disconnect'));});
test('double click during the permission prompt submits only one enable request',async()=>{let grant;const pending=new Promise(resolve=>grant=resolve);const f=await fixture({granted:pending});const first=f.get('wake-start').onclick();await f.get('wake-start').onclick();assert.equal(f.requests.length,1);grant(true);await first;assert.equal(f.messages.filter(m=>m.action==='wake-start').length,1);assert.equal(f.get('wake-start').textContent,'Restart timer');});

test('remote policy is requested only from an explicit checkbox change and owner stop clears it',async()=>{const f=await fixture();assert.equal(f.get('wake-remote').checked,false);f.get('wake-remote').checked=true;await f.get('wake-remote').onchange();assert.ok(f.messages.some(m=>m.action==='wake-remote-policy'&&m.allowed));assert.equal(f.get('wake-remote').checked,true);await f.get('wake-start').onclick();await f.get('wake-stop').onclick();assert.equal(f.get('wake-remote').checked,false);});
