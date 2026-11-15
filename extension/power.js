'use strict';
// Bounded leases; remote starts require a separately owner-enabled local policy.
function createWakeController(chrome,{now=()=>Date.now(),connected=()=>false}={}){
 const ALARM='bridge-wake-expiry',KEY='wakeDeadline',DURATIONS=[1,15,30,60];
 let deadline=0,generation=0,remoteAllowed=false,serial=Promise.resolve();
 const enqueue=fn=>{const next=serial.catch(()=>{}).then(fn);serial=next;return next;};
 const info=()=>({active:deadline>now(),expiresAt:deadline||null,remainingSeconds:Math.max(0,Math.ceil((deadline-now())/1000)),level:'system',remoteAllowed});
 async function release(){
  deadline=0;
  try{chrome.power?.releaseKeepAwake();}catch{}
  // Try both cleanups even if one Chrome API fails.
  await Promise.all([chrome.storage.session.remove(KEY),chrome.alarms.clear(ALARM)]);
 }
 function stop(revoke=false){
  generation++;
  return enqueue(async()=>{
   if(revoke){remoteAllowed=false;try{await chrome.storage.local.set({remoteWakeAllowed:false});}finally{await release();}}
   else await release();
  });
 }
 function setRemoteAllowed(allowed){
  if(typeof allowed!=='boolean')return Promise.reject(Error('Remote authorization must be true or false'));
  if(!allowed)return stop(true);
  const ticket=++generation;
  return enqueue(async()=>{
   if(!connected()||!await chrome.permissions.contains({permissions:['power']}))throw Error('Connect a work tab and grant power permission first');
   if(ticket!==generation)throw Error('Authorization changed');
   await chrome.storage.local.set({remoteWakeAllowed:true});remoteAllowed=true;
   if(ticket!==generation)throw Error('Authorization changed');
   return info();
  });
 }
 function start(minutes,remote=false){
  const ticket=++generation;
  return enqueue(async()=>{
   if(!DURATIONS.includes(minutes))throw Error('Choose 1, 15, 30 or 60 minutes');
   if(remote){
    const policy=await chrome.storage.local.get('remoteWakeAllowed');
    remoteAllowed=policy.remoteWakeAllowed===true;
    if(!remoteAllowed)throw Error('Remote wake is paused. Enable Allow remote timed sessions in the popup.');
   }
   if(ticket!==generation||!connected())throw Error('Connect a work tab before enabling keep-awake');
   if(!await chrome.permissions.contains({permissions:['power']}))throw Error('Power permission was not granted');
   if(ticket!==generation||!connected())throw Error('Connection changed; keep-awake was not started');
   try{
    chrome.power.requestKeepAwake('system');deadline=now()+minutes*60000;
    await chrome.storage.session.set({[KEY]:deadline});
    if(ticket!==generation||!connected())throw Error('Connection changed; keep-awake stopped');
    await chrome.alarms.create(ALARM,{when:deadline});
    if(ticket!==generation||!connected())throw Error('Connection changed; keep-awake stopped');
    return info();
   }catch(error){await release();throw error;}
  });
 }
 function restore(){
  const ticket=generation;
  return enqueue(async()=>{
   remoteAllowed=(await chrome.storage.local.get('remoteWakeAllowed')).remoteWakeAllowed===true;
   const saved=(await chrome.storage.session.get(KEY))[KEY];
   const valid=Number.isFinite(saved)&&saved>now()&&saved<=now()+60*60000;
   if(ticket!==generation||!valid||!connected()||!await chrome.permissions.contains({permissions:['power']})){
    await release();return info();
   }
   if(ticket!==generation||!connected()){await release();return info();}
   try{
    chrome.power.requestKeepAwake('system');deadline=saved;
    await chrome.alarms.create(ALARM,{when:saved});
    if(ticket!==generation||!connected())await release();
    return info();
   }catch(error){await release();throw error;}
  });
 }
 async function status(){if(deadline&&deadline<=now())await stop();return info();}
 async function alarm(event){if(event.name===ALARM)await stop();}
 return {start,remoteStart:minutes=>start(minutes,true),stop,setRemoteAllowed,restore,status,alarm};
}
if(typeof module!=='undefined')module.exports={createWakeController};
