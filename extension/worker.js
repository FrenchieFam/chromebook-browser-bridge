'use strict';
importScripts('config.js');
let tabId=null,timer=null,busy=false,lastError='',detachReason='',jobTarget=null;
const req=async(path,data)=>{const r=await fetch(BRIDGE_URL+path,{method:data===undefined?'GET':'POST',headers:{Authorization:'Bearer '+BRIDGE_TOKEN,'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(6000)});if(!r.ok)throw Error('Bridge HTTP '+r.status);return r.json();};
const cdp=(method,params={})=>{if(jobTarget&&(jobTarget.tabId!==tabId||jobTarget.intent!==intent))throw Error('Connection changed; obtain a fresh snapshot');if(tabId===null)throw Error('No selected tab');return chrome.debugger.sendCommand({tabId},method,params);};
async function evaluate(expression){const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text+': '+(r.exceptionDetails.exception?.description||''));return r.result?.value;}

async function elementPoint(selector){
 return evaluate(`(async()=>{
  const e=document.querySelector(${JSON.stringify(selector)});
  if(!e)throw Error('Element not found');
  if(e.disabled)throw Error('Element is disabled');
  if(e.type==='password')throw Error('Enter passwords yourself in Chrome');
  e.scrollIntoView({behavior:'instant',block:'center',inline:'center'});
  let previous=null,stable=0;
  for(let attempt=0;attempt<20;attempt++){
   await new Promise(resolve=>setTimeout(resolve,40));
   if(!e.isConnected)throw Error('Element changed; obtain a fresh snapshot');
   const r=e.getBoundingClientRect();
   const now=[r.x,r.y,r.width,r.height,scrollX,scrollY];
   stable=previous&&now.every((v,i)=>Math.abs(v-previous[i])<0.5)?stable+1:0;
   previous=now;
   if(stable>=2){
    if(!r.width||!r.height)throw Error('Element is not visible');
    const x=r.x+r.width/2,y=r.y+r.height/2;
    if(x<0||y<0||x>=innerWidth||y>=innerHeight)throw Error('Element center is outside the viewport');
    const hit=document.elementFromPoint(x,y);
    if(hit!==e&&!e.contains(hit))throw Error('Another element covers the target; inspect a fresh snapshot or screenshot');
    return {x,y};
   }
  }
  throw Error('Element is still moving; inspect before retrying');
 })()`);
}

async function perform(job){const a=job.args||{};
 if(job.action==='snapshot')return {ok:true,...await evaluate(`(()=>{function selector(e){if(e.id)return '#'+CSS.escape(e.id);for(const attr of ['data-testid','name','placeholder','aria-label']){const value=e.getAttribute(attr);if(value){const q=e.tagName.toLowerCase()+'['+attr+'='+CSS.escape(value)+']';if(document.querySelectorAll(q).length===1)return q;}}const p=[];for(let n=e;n&&n!==document.documentElement;n=n.parentElement){let i=1;for(let s=n.previousElementSibling;s;s=s.previousElementSibling)if(s.tagName===n.tagName)i++;p.unshift(n.tagName.toLowerCase()+':nth-of-type('+i+')');}return 'html>'+p.join('>');}return {title:document.title,url:location.href,viewport:{width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth},text:(document.body?.innerText||'').slice(0,18000),controls:Array.from(document.querySelectorAll('a,button,input,textarea,select,[role="button"],[contenteditable="true"]')).filter(e=>e.getClientRects().length).slice(0,100).map(e=>({tag:e.tagName,type:e.type||'',text:(e.innerText||e.getAttribute('aria-label')||e.placeholder||'').slice(0,140),selector:selector(e),disabled:!!e.disabled,checked:['checkbox','radio'].includes(e.type)?e.checked:undefined,value:e.tagName==='SELECT'?e.value:undefined,options:e.tagName==='SELECT'?Array.from(e.options).slice(0,100).map(o=>({value:o.value,text:o.text})):undefined}))};})()`)};
 if(job.action==='screenshot'){const r=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});return {ok:true,data:r.data};}
 if(job.action==='navigate'){const u=new URL(a.url);if(!['http:','https:','file:'].includes(u.protocol))throw Error('Only http, https, and file navigation is supported');const r=await cdp('Page.navigate',{url:u.href});if(r.errorText)throw Error(r.errorText);return {ok:true,navigatedTo:u.href,note:'Navigation started; inspect snapshot to confirm the result.'};}
 if(job.action==='click'||job.action==='type'){
  if(typeof a.selector!=='string'||a.selector.length>2000)throw Error('A CSS selector is required');
  if(job.action==='type'&&(typeof a.text!=='string'||a.text.length>20000))throw Error('Text must be at most 20000 characters');
  const info=await elementPoint(a.selector);
  await cdp('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...info});await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...info});
  if(job.action==='type'){if(typeof a.text!=='string'||a.text.length>20000)throw Error('Text must be at most 20000 characters');await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(a.selector)});if(!e||(!['INPUT','TEXTAREA'].includes(e.tagName)&&!e.isContentEditable))throw Error('Not a text field');if(e.type==='password')throw Error('Enter passwords yourself');e.focus();if(typeof e.select==='function')e.select();else {const r=document.createRange();r.selectNodeContents(e);const s=getSelection();s.removeAllRanges();s.addRange(r);}return true;})()`);await cdp('Input.insertText',{text:a.text});}
  return {ok:true,action:job.action,selector:a.selector};
 }
 if(job.action==='scroll'){const x=Number(a.x||0),y=Number(a.y||0);if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>10000||Math.abs(y)>10000)throw Error('Invalid scroll offset');return {ok:true,position:await evaluate(`(()=>{window.scrollBy(${x},${y});return {x:scrollX,y:scrollY};})()`)};}
 if(job.action==='key'){const keys={Enter:13,Escape:27,Tab:9,Backspace:8,ArrowDown:40,ArrowUp:38};if(!Object.hasOwn(keys,a.key))throw Error('Unsupported key');const p={key:a.key,code:a.key,windowsVirtualKeyCode:keys[a.key]};await cdp('Input.dispatchKeyEvent',{type:'keyDown',...p,...(a.key==='Enter'?{text:'\r',unmodifiedText:'\r'}:{})});await cdp('Input.dispatchKeyEvent',{type:'keyUp',...p});return {ok:true,key:a.key};}

 if(job.action==='select'){
  if(typeof a.selector!=='string'||a.selector.length>2000||typeof a.value!=='string'||a.value.length>2000)throw Error('A CSS selector and option value are required');
  return {ok:true,...await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(a.selector)});if(!(e instanceof HTMLSelectElement)||e.disabled)throw Error('Select control unavailable');if(!Array.from(e.options).some(o=>o.value===${JSON.stringify(a.value)}&&!o.disabled))throw Error('Option unavailable');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(a.value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return {value:e.value};})()`)};
 }
 if(job.action==='viewport'){
  if(a.reset===true){await cdp('Emulation.clearDeviceMetricsOverride');return {ok:true,reset:true};}
  if(!Number.isInteger(a.width)||!Number.isInteger(a.height)||a.width<320||a.width>2560||a.height<320||a.height>2560)throw Error('Width and height must be integers from 320 to 2560');
  await cdp('Emulation.setDeviceMetricsOverride',{width:a.width,height:a.height,deviceScaleFactor:1,mobile:false});return {ok:true,width:a.width,height:a.height};
 }

 throw Error('Unknown action');
}
const VERSION='0.3.0',RECOVERY_ALARM='bry-work-tab-recovery';
let intent=0,recovering=false;
const normalURL=value=>{const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw Error('Use an http/https start page without credentials, query strings or fragments');return url.href;};
async function persistentSettings(){return chrome.storage.local.get(['persistentEnabled','workTabId','startURL']);}
async function heartbeat(){const tab=tabId===null?null:await chrome.tabs.get(tabId);await req('/heartbeat',{tabId,title:tab?.title||'Disconnected',url:tab?.url||'',extensionVersion:VERSION,lastError,detachReason});}
async function poll(){if(tabId===null||busy)return;const originTab=tabId,originIntent=intent;busy=true;try{await heartbeat();const {job}=await req('/poll');if(job){let result;try{if(originTab!==tabId||originIntent!==intent)throw Error('Connection changed; obtain a fresh snapshot');jobTarget={tabId:originTab,intent:originIntent};if(job.expires*1000<Date.now())throw Error('Expired command');result=await perform(job);}catch(e){result={ok:false,error:e.message};}finally{jobTarget=null;}await req('/result',{id:job.id,result});}lastError='';}catch(e){lastError=e.message;}finally{busy=false;if(tabId!==null)timer=setTimeout(poll,lastError?4000:700);}}
async function detachCurrent(){clearTimeout(timer);const old=tabId;tabId=null;await chrome.storage.session.remove('tabId');if(old!==null){try{await chrome.debugger.detach({tabId:old});}catch{}}await chrome.action.setBadgeText({text:''});try{await heartbeat();}catch{}}
async function stop(reason='Disconnected by owner'){
 intent++;detachReason=reason;
 // Persist the stop before awaiting network/Chrome cleanup. Alarms must never undo it.
 await chrome.storage.local.set({persistentEnabled:false});
 await chrome.alarms.clear(RECOVERY_ALARM);
 await detachCurrent();
}
async function attachTab(id,ticket){
 const tab=await chrome.tabs.get(id);
 if(!/^(https?:|file:)/.test(tab.url||''))throw Error('Select a normal web page or local HTML file first');
 await req('/status');if(ticket!==intent)return false;
 await detachCurrent();if(ticket!==intent)return false;
 await chrome.debugger.attach({tabId:id},'1.3');
 if(ticket!==intent){try{await chrome.debugger.detach({tabId:id});}catch{}return false;}
 tabId=id;detachReason='';lastError='';
 await chrome.storage.session.set({tabId});
 if(ticket!==intent){await detachCurrent();return false;}
 await chrome.action.setBadgeBackgroundColor({color:'#a3d470'});
 await chrome.action.setBadgeText({text:'ON'});poll();return true;
}
async function recoverPersistent(){
 if(recovering)return;
 recovering=true;const ticket=intent;
 try{
  const prefs=await persistentSettings();
  if(!prefs.persistentEnabled||tabId!==null)return;
  const startURL=normalURL(prefs.startURL||'https://example.com/');
  await req('/status');if(ticket!==intent)return;
  let tab=null;
  if(Number.isInteger(prefs.workTabId)){
   try{
    const candidate=await chrome.tabs.get(prefs.workTabId);
    // Across browser restarts IDs can be reused: accept only the saved pinned start page.
    if(candidate.pinned&&candidate.url===startURL)tab=candidate;
   }catch{}
  }
  if(!tab){tab=await chrome.tabs.create({url:startURL,pinned:true,active:false});}
  if(ticket!==intent)return;
  await chrome.storage.local.set({workTabId:tab.id});
  await attachTab(tab.id,ticket);
 }catch(e){
  if(ticket===intent){lastError=e.message;await chrome.action.setBadgeBackgroundColor({color:'#d4ab70'});await chrome.action.setBadgeText({text:'WAIT'});}
 }finally{recovering=false;}
}
async function enablePersistent(startURL){
 const url=normalURL(startURL);intent++;
 await chrome.storage.local.set({persistentEnabled:true,startURL:url});
 await chrome.alarms.create(RECOVERY_ALARM,{periodInMinutes:1});
 await detachCurrent();await recoverPersistent();
}
chrome.debugger.onDetach.addListener((source,reason)=>{
 if(source.tabId!==tabId)return;
 if(reason==='canceled_by_user'){stop('Stopped by Chrome debugging banner').catch(e=>{lastError=e.message;});}
 else{detachReason=reason||'Chrome detached';detachCurrent().catch(e=>{lastError=e.message;});}
});
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name===RECOVERY_ALARM)recoverPersistent();});
chrome.runtime.onStartup.addListener(()=>{initialize().catch(e=>{lastError=e.message;});});
chrome.runtime.onMessage.addListener((msg,sender,respond)=>{(async()=>{
 if(msg.action==='connect'){
  // Choosing an ordinary tab returns to session-only mode.
  await stop('Selected-tab mode');const ticket=intent;
  await attachTab(msg.tabId,ticket);
 }else if(msg.action==='disconnect'){await stop();}
 else if(msg.action==='persistent'){await enablePersistent(msg.startURL||'https://example.com/');}
 const prefs=await persistentSettings();
 return {ok:true,tabId,lastError,detachReason,endpoint:BRIDGE_URL,version:VERSION,persistentEnabled:!!prefs.persistentEnabled,startURL:prefs.startURL||'https://example.com/'};
})().then(respond,e=>respond({ok:false,error:e.message}));return true;});
async function initialize(){
 const ticket=intent,prefs=await persistentSettings();
 const saved=await chrome.storage.session.get('tabId');
 if(saved.tabId!==undefined&&tabId===null){
  try{
   await chrome.debugger.sendCommand({tabId:saved.tabId},'Runtime.evaluate',{expression:'true'});
   if(ticket!==intent)return;
   tabId=saved.tabId;poll();
  }catch{await chrome.storage.session.remove('tabId');}
 }
 if(prefs.persistentEnabled&&ticket===intent){
  await chrome.alarms.create(RECOVERY_ALARM,{periodInMinutes:1});
  await recoverPersistent();
 }
}
initialize().catch(e=>{lastError=e.message;});
