'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createWakeController}=require('./extension/power.js');
function fixture(saved={}){
 let clock=100000,connected=true,permission=true,gate=null,block=false;
 const session={...saved},alarms=new Map(),requests=[];let releases=0;
 const chrome={power:{requestKeepAwake(level){requests.push(level);},releaseKeepAwake(){releases++;}},
 permissions:{async contains(){if(block){block=false;await new Promise(r=>gate=r);}return permission;}},
 storage:{session:{async get(key){return {[key]:session[key]};},async set(data){Object.assign(session,data);},async remove(key){delete session[key];}}},
 alarms:{async create(name,settings){alarms.set(name,settings);},async clear(name){alarms.delete(name);}}};
 const controller=createWakeController(chrome,{now:()=>clock,connected:()=>connected});
 return {controller,session,alarms,requests,get releases(){return releases;},clock:value=>clock=value,connect:value=>connected=value,permit:value=>permission=value,gate(){block=true;},releaseGate(){gate();},chrome};
}
test('off by default, no permission or wake request on status',async()=>{const f=fixture();assert.equal((await f.controller.status()).active,false);assert.equal(f.requests.length,0);});
test('explicit start requests only system and stores a bounded expiry',async()=>{const f=fixture();const r=await f.controller.start(15);assert.deepEqual(f.requests,['system']);assert.equal(r.expiresAt,100000+900000);assert.equal(f.alarms.get('bridge-wake-expiry').when,r.expiresAt);});
test('invalid duration, disconnected tab and denied permission cannot start',async()=>{for(const n of [0,2,61,'15',NaN]){const f=fixture();await assert.rejects(f.controller.start(n));assert.equal(f.requests.length,0);}const f=fixture();f.connect(false);await assert.rejects(f.controller.start(1));f.connect(true);f.permit(false);await assert.rejects(f.controller.start(1));assert.equal(f.requests.length,0);});
test('expiry releases even before a delayed alarm is delivered',async()=>{const f=fixture();await f.controller.start(1);f.clock(160001);assert.equal((await f.controller.status()).active,false);assert.equal(f.session.wakeDeadline,undefined);assert.equal(f.alarms.size,0);assert.ok(f.releases>0);});
test('alarm and owner stop clear the request without enabling recovery',async()=>{const f=fixture();await f.controller.start(15);await f.controller.alarm({name:'unrelated'});assert.equal((await f.controller.status()).active,true);await f.controller.alarm({name:'bridge-wake-expiry'});assert.equal((await f.controller.status()).active,false);await f.controller.start(1);await f.controller.stop();assert.equal((await f.controller.status()).active,false);});
test('stop wins a permission-check race without a late power request',async()=>{const f=fixture();f.gate();const attempt=f.controller.start(15);await new Promise(setImmediate);const stop=f.controller.stop();f.releaseGate();await assert.rejects(attempt,/Connection changed/);await stop;assert.equal(f.requests.length,0);assert.equal((await f.controller.status()).active,false);});
test('service-worker restart restores only the same unexpired session deadline',async()=>{const f=fixture({wakeDeadline:500000});await f.controller.restore();assert.equal((await f.controller.status()).expiresAt,500000);assert.equal(f.session.wakeDeadline,500000);assert.deepEqual(f.requests,['system']);});
test('browser-session reset, old/future/corrupt lease and revoked permission stay off',async()=>{for(const value of [undefined,99999,99999999,'500000']){const f=fixture({wakeDeadline:value});await f.controller.restore();assert.equal((await f.controller.status()).active,false);assert.equal(f.requests.length,0);}const f=fixture({wakeDeadline:500000});f.permit(false);await f.controller.restore();assert.equal(f.requests.length,0);});
test('storage failure after requesting power releases the request',async()=>{const f=fixture();f.chrome.storage.session.set=async()=>{throw Error('storage failed');};await assert.rejects(f.controller.start(15),/storage failed/);assert.equal((await f.controller.status()).active,false);assert.ok(f.releases>0);});
test('alarm creation failure cannot leave power held or a persisted lease',async()=>{const f=fixture();f.chrome.alarms.create=async()=>{throw Error('alarm failed');};await assert.rejects(f.controller.start(15),/alarm failed/);assert.equal((await f.controller.status()).active,false);assert.equal(f.session.wakeDeadline,undefined);assert.ok(f.releases>0);});
