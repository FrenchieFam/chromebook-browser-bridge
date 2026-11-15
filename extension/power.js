'use strict';
// One owner-enabled, browser-session lease. No remote command can enable it.
function createWakeController(chrome,{now=()=>Date.now(),connected=()=>false}={}){
 const ALARM='bridge-wake-expiry',KEY='wakeDeadline',DURATIONS=[1,15,30,60];
 let deadline=0,generation=0,serial=Promise.resolve();
 const enqueue=fn=>{const next=serial.catch(()=>{}).then(fn);serial=next;return next;};
 const info=()=>({active:deadline>now(),expiresAt:deadline||null,remainingSeconds:Math.max(0,Math.ceil((deadline-now())/1000)),level:'system'});
 async function release(){
  deadline=0;
  try{chrome.power?.releaseKeepAwake();}catch{}
  // Try both cleanups even if one Chrome API fails.
  await Promise.all([chrome.storage.session.remove(KEY),chrome.alarms.clear(ALARM)]);
 }
 function stop(){generation++;return enqueue(release);}
 function start(minutes){
  const ticket=++generation;
  return enqueue(async()=>{
   if(!DURATIONS.includes(minutes))throw Error('Choose 1, 15, 30 or 60 minutes');
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
 return {start,stop,restore,status,alarm};
}
if(typeof module!=='undefined')module.exports={createWakeController};
