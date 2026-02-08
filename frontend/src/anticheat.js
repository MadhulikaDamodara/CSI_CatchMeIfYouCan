// Client-side anti-cheat helpers: heartbeat, focus/copy/paste/right-click hooks
const HEARTBEAT_INTERVAL_MS = 10000;

let heartbeatTimer = null;

async function postJson(url, body){
  try{
    return fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)});
  }catch(e){
    console.error('postJson failed', e);
  }
}

function startHeartbeat(sessionId){
  stopHeartbeat();
  heartbeatTimer = setInterval(()=>{
    fetch(`/api/sessions/${sessionId}/heartbeat`, {method:'POST'}).catch(e=>console.error('heartbeat error', e));
  }, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat(){
  if(heartbeatTimer){ clearInterval(heartbeatTimer); heartbeatTimer = null; }
}

function sendFocusLost(sessionId, reason='focus_lost'){
  // attempt to notify server; use sendBeacon on unload where possible
  try{
    postJson(`/api/sessions/${sessionId}/focus`, {lost:true, reason}).catch(()=>{});
  }catch(e){
    console.error('sendFocusLost failed', e);
  }
}

function bindAntiCheatHooks(sessionId){
  // visibility / focus
  function handleVisibility(){
    if(document.hidden){ sendFocusLost(sessionId, 'visibility_hidden'); }
  }
  window.addEventListener('visibilitychange', handleVisibility);

  window.addEventListener('blur', ()=>sendFocusLost(sessionId, 'window_blur'));

  // copy / paste / contextmenu
  function intercept(e){ e.preventDefault(); sendFocusLost(sessionId, e.type); }
  window.addEventListener('copy', intercept);
  window.addEventListener('paste', intercept);
  window.addEventListener('contextmenu', intercept);

  // before unload - try a final beacon
  function handleUnload(){
    try{
      const url = `/api/sessions/${sessionId}/focus`;
      const data = JSON.stringify({lost:true, reason:'unload'});
      if(navigator.sendBeacon){
        navigator.sendBeacon(url, data);
      } else {
        // fallback synchronous XHR (may be blocked)
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, false);
        xhr.setRequestHeader('Content-Type','application/json');
        xhr.send(data);
      }
    }catch(e){ /* ignore */ }
  }
  window.addEventListener('beforeunload', handleUnload);

  return function unbind(){
    window.removeEventListener('visibilitychange', handleVisibility);
    window.removeEventListener('blur', ()=>sendFocusLost(sessionId,'window_blur'));
    window.removeEventListener('copy', intercept);
    window.removeEventListener('paste', intercept);
    window.removeEventListener('contextmenu', intercept);
    window.removeEventListener('beforeunload', handleUnload);
    stopHeartbeat();
  };
}

export { startHeartbeat, stopHeartbeat, sendFocusLost, bindAntiCheatHooks };
