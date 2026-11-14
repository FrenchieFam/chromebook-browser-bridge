'use strict';
const status=document.getElementById('status');
async function show(){const r=await chrome.runtime.sendMessage({action:'status'});status.textContent=r.tabId!==null?'Connected to tab '+r.tabId+(r.lastError?' · '+r.lastError:''):'Disconnected'+(r.detachReason?' ('+r.detachReason+')':'')+'. Select a normal web page, then connect.';}
document.getElementById('connect').onclick=async()=>{try{status.textContent='Connecting…';const [tab]=await chrome.tabs.query({active:true,currentWindow:true});const r=await chrome.runtime.sendMessage({action:'connect',tabId:tab.id});if(!r.ok)throw Error(r.error);await show();}catch(e){status.textContent='Connection failed: '+e.message;}};
document.getElementById('stop').onclick=async()=>{await chrome.runtime.sendMessage({action:'disconnect'});await show();};show().catch(e=>status.textContent=e.message);
