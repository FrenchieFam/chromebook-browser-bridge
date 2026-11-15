'use strict';
const el=id=>document.getElementById(id);
let initialized=false,updating=false,changing=false,expiresAt=null;
function countdown(){
 const active=expiresAt!==null&&expiresAt>Date.now();
 el('wake-state').textContent=active?'Keep-awake active':'Off';
 el('wake-start').textContent=active?'Restart timer':'Enable keep-awake';
 el('wake-indicator').classList.toggle('active',active);
 if(active){
  const seconds=Math.max(0,Math.ceil((expiresAt-Date.now())/1000));
  el('wake-countdown').textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')+' remaining · display may turn off';
 }else el('wake-countdown').textContent='No active session';
 el('wake-stop').disabled=changing||!active;
}
async function send(message){const r=await chrome.runtime.sendMessage(message);if(!r.ok)throw Error(r.error);return r;}
async function show(){
 if(updating)return;updating=true;
 try{
  const r=await send({action:'status'});
  if(!initialized){el('start-url').value=r.startURL;initialized=true;}
  el('status').textContent=r.tabId!==null?'Connected · '+(r.persistentEnabled?'persistent work tab':'session only')+(r.lastError?' · '+r.lastError:''):r.persistentEnabled?'Waiting for Linux or its work tab.'+(r.lastError?' '+r.lastError:''):'Disconnected. Automatic recovery is paused.';
  expiresAt=r.wake?.active?r.wake.expiresAt:null;
  el('wake-start').disabled=changing||r.tabId===null;
  el('wake-duration').disabled=changing;
  countdown();
 }catch(e){el('status').textContent='Status unavailable: '+e.message;el('wake-start').disabled=true;}
 finally{updating=false;}
}
async function connection(message){
 try{await send(message);await show();}catch(e){el('status').textContent=e.message;}
}
el('connect').onclick=async()=>{try{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});await connection({action:'connect',tabId:tab.id});}catch(e){el('status').textContent=e.message;}};
el('persistent').onclick=()=>connection({action:'persistent',startURL:el('start-url').value});
el('stop').onclick=()=>connection({action:'disconnect'});
el('wake-start').onclick=async()=>{
 if(changing)return;changing=true;el('wake-start').disabled=true;el('wake-duration').disabled=true;
 try{
  // Call directly from the click: Chrome requires a user gesture for this request.
  const granted=await chrome.permissions.request({permissions:['power']});
  if(!granted)throw Error('Permission declined. Keep-awake stays off.');
  const r=await send({action:'wake-start',minutes:Number(el('wake-duration').value)});
  expiresAt=r.wake.expiresAt;
  el('wake-notice').textContent='Timed session enabled. Stop it at any time; disconnect also releases it.';
 }catch(e){el('wake-notice').textContent=e.message;}
 finally{changing=false;await show();}
};
el('wake-stop').onclick=async()=>{
 if(changing)return;changing=true;countdown();
 try{await send({action:'wake-stop'});expiresAt=null;el('wake-notice').textContent='Keep-awake stopped. Your normal power settings apply.';}
 catch(e){el('wake-notice').textContent=e.message;}
 finally{changing=false;await show();}
};
show();setInterval(()=>{countdown();show();},1000);
