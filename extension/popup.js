'use strict';
const status=document.getElementById('status'),startURL=document.getElementById('start-url');
let initialized=false;
async function show(){
 const r=await chrome.runtime.sendMessage({action:'status'});
 if(!r.ok)throw Error(r.error);
 if(!initialized){startURL.value=r.startURL;initialized=true;}
 status.textContent=r.tabId!==null?'Connected to tab '+r.tabId+' · '+(r.persistentEnabled?'persistent work mode':'session only')+(r.lastError?' · '+r.lastError:''):r.persistentEnabled?'Persistent mode is waiting for Linux or its work tab.'+(r.lastError?' '+r.lastError:''):'Disconnected. Automatic recovery is paused.';
}
document.getElementById('connect').onclick=async()=>{try{status.textContent='Connecting…';const [tab]=await chrome.tabs.query({active:true,currentWindow:true});const r=await chrome.runtime.sendMessage({action:'connect',tabId:tab.id});if(!r.ok)throw Error(r.error);await show();}catch(e){status.textContent='Connection failed: '+e.message;}};
document.getElementById('persistent').onclick=async()=>{try{status.textContent='Starting work tab…';const r=await chrome.runtime.sendMessage({action:'persistent',startURL:startURL.value});if(!r.ok)throw Error(r.error);await show();}catch(e){status.textContent='Could not start: '+e.message;}};
document.getElementById('stop').onclick=async()=>{try{await chrome.runtime.sendMessage({action:'disconnect'});await show();}catch(e){status.textContent=e.message;}};
show().catch(e=>status.textContent=e.message);
