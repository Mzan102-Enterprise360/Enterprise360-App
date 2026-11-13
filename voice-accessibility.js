/* MzanConnect optional spoken guidance. No audio is recorded or sent to a server. */
(()=>{'use strict';
if(document.getElementById('mzan-voice-tools'))return;
const synth=window.speechSynthesis;
const supported=!!(synth&&window.SpeechSynthesisUtterance);
const style=document.createElement('style');
style.textContent=`
#mzan-voice-tools{position:fixed;right:12px;top:calc(12px + env(safe-area-inset-top,0px));z-index:10000;font:15px Arial,sans-serif;color:#14283b}
#mzan-voice-tools button{margin:0;line-height:1.2;font:inherit;cursor:pointer;border:2px solid #fff;border-radius:10px;background:#116a71;color:#fff;min-height:44px;padding:9px 12px;box-shadow:0 2px 8px #0003}
#mzan-voice-tools > button{width:42px;height:42px;min-height:42px;padding:0;border-radius:50%;font-size:21px;display:flex;align-items:center;justify-content:center;margin-left:auto}
#mzan-voice-tools button:focus-visible{outline:3px solid #ffbf47;outline-offset:2px}
#mzan-voice-panel{background:#fff;color:#14283b;border:2px solid #116a71;border-radius:12px;padding:12px;box-shadow:0 3px 15px #0003;max-width:min(310px,calc(100vw - 24px));margin-top:8px;position:absolute;top:42px;right:0}
#mzan-voice-panel[hidden]{display:none}
#mzan-voice-panel p{margin:5px 0 10px;line-height:1.35;font-size:13px}
#mzan-voice-panel .mzan-actions{display:flex;flex-wrap:wrap;gap:6px}
#mzan-voice-panel .mzan-actions button{flex:1;min-width:65px;box-shadow:none}

/* Shared voice strip: visible controls on every app page, in normal document flow. */
body #mzan-voice-tools{position:relative;top:auto;right:auto;display:flex;align-items:center;gap:6px;flex:0 0 56px;height:56px;min-height:56px;width:calc(100% - 20px);max-width:1030px;margin:0 auto;padding:6px 0;z-index:10}
body #mzan-voice-tools > button{flex:0 0 44px;width:44px;height:44px;min-height:44px}
body #mzan-voice-panel{position:static;display:flex;align-items:center;gap:12px;flex:1;min-width:0;max-width:none;height:44px;margin:0;padding:0 6px;border:0;border-radius:10px;box-shadow:none;overflow:hidden;white-space:nowrap}
body #mzan-voice-panel[hidden]{display:none}
body #mzan-voice-panel > strong{display:none}
body #mzan-voice-panel .mzan-actions{order:-1;flex:0 0 auto;flex-wrap:nowrap;gap:4px}
body #mzan-voice-panel .mzan-actions button{flex:0 0 auto;width:auto;min-width:0;min-height:44px;padding:7px 8px;font-size:13px}
body #mzan-voice-panel p{flex:1;min-width:0;margin:0;font-size:12px;line-height:1.3;overflow-x:auto;white-space:nowrap}

@media print{#mzan-voice-tools{display:none!important}}
`;
document.head.append(style);
const host=document.createElement('aside');host.id='mzan-voice-tools';host.setAttribute('aria-label','Voice accessibility controls');
const panel=document.createElement('div');panel.id='mzan-voice-panel';panel.hidden=true;
const title=document.createElement('strong');title.textContent='Spoken guidance';
const info=document.createElement('p');info.id='mzan-voice-status';info.setAttribute('role','status');info.setAttribute('aria-live','polite');
info.textContent=supported?'Tap Listen to hear calm, clear guidance. Available voices depend on your device. You can pause or stop at any time.':'Voice reading is unavailable in this browser. You can use your phone screen reader.';
const actions=document.createElement('div');actions.className='mzan-actions';
function button(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',fn);actions.append(b);return b;}
const toggle=document.createElement('button');toggle.type='button';toggle.textContent='🔊';toggle.setAttribute('aria-label','Open spoken page guidance');toggle.setAttribute('aria-expanded','false');
toggle.setAttribute('aria-controls','mzan-voice-panel');
let current=null;
function preferredVoice(){
  const voices=synth.getVoices();
  const english=voices.filter(v=>/^en([-_]|$)/i.test(v.lang));
  if(!english.length)return null;
  // Voice gender is not reliably exposed by the browser API.
  const female=english.filter(v=>/female|woman|samantha|victoria|karen|moira|tessa|zira|ava|serena|susan|joanna|aria|jenny|sonia/i.test(v.name));
  const southAfrican=vs=>vs.find(v=>/^en[-_]ZA$/i.test(v.lang));
  return southAfrican(female)||southAfrican(english)||female.find(v=>/natural|neural|premium|enhanced/i.test(v.name))||female[0]||english.find(v=>/natural|neural|premium|enhanced/i.test(v.name))||english[0];
}
function stop(){if(supported){synth.cancel();current=null;}pause.textContent='⏸ Pause';info.textContent='Stopped.';}
function visible(el){if(el.closest('[hidden],[aria-hidden="true"],#mzan-voice-tools,form,[data-private],.receipt,[autocomplete="cc-number"]'))return false;const s=getComputedStyle(el);return s.display!=='none'&&s.visibility==='visible'&&el.getClientRects().length>0;}
function textForPage(){
const root=document.querySelector('main')||document.body;
const heading=document.querySelector('h1');
const parts=[heading&&visible(heading)?heading.textContent.trim():document.title];
const heard=new Set();
function clearSpeech(t){
 return t.replace(/[↗✓○•]/g,' ').replace(/&/g,' and ').replace(/\s+/g,' ').replace(/\s+([,.!?])/g,'$1').trim();
}
const nodes=root.querySelectorAll('h2,h3,p,summary,.service a,.tile a,nav a,main > a,main > button');
for(const el of nodes){if(!visible(el))continue;const t=clearSpeech(el.innerText||el.textContent||'');if(!t||t.length>280||heard.has(t.toLowerCase()))continue;heard.add(t.toLowerCase());if(el.matches('a')&&t==='Open'){const card=el.closest('.service');const h=card&&card.querySelector('h2');parts.push('Open '+(h?h.textContent:'website'));continue;}parts.push(/[.!?]$/.test(t)?t:t+'.');if(parts.join(' ').length>3500)break;}
return 'Welcome to MzanConnect. Your business journey matters. I am here to guide you, one step at a time. '+parts.join(' ')+' To explore buttons and forms, you can also use the screen reader on your phone.';
}
function speak(){pause.textContent='⏸ Pause';if(!supported){info.textContent='Voice reading is not available. Try Android TalkBack in Accessibility settings.';return;}if(getComputedStyle(document.body).visibility==='hidden'){info.textContent='Please wait for the page to load.';return;}synth.cancel();const u=new SpeechSynthesisUtterance(textForPage());const voice=preferredVoice();if(voice){u.voice=voice;u.lang=voice.lang;}else{u.lang='en-ZA';}u.rate=.83;u.pitch=.98;u.volume=1;u.onend=()=>{if(current===u){info.textContent='Finished reading.';current=null;}};u.onerror=()=>{if(current===u){info.textContent='Unable to read aloud. Try your phone screen reader.';current=null;}};current=u;synth.speak(u);info.textContent='Reading clearly. South African English is preferred when available on your phone.';}
const listen=button('▶ Listen',speak);
const pause=button('⏸ Pause',()=>{if(!supported)return;if(synth.paused){synth.resume();pause.textContent='⏸ Pause';info.textContent='Reading resumed.';}else if(synth.speaking){synth.pause();pause.textContent='▶ Resume';info.textContent='Paused.';}});
button('■ Stop',stop);
panel.append(title,info,actions);
toggle.addEventListener('click',speak);
host.append(panel,toggle);
const main=document.querySelector('main');
if(main)main.before(host);else document.body.prepend(host);
function syncHomeVoice(){
panel.hidden=false;
toggle.setAttribute('aria-label','Listen to spoken page guidance');
toggle.removeAttribute('aria-expanded');
}
syncHomeVoice();
const view=document.getElementById('view');
if(view)new MutationObserver(()=>{stop();syncHomeVoice();}).observe(view,{childList:true});
window.addEventListener('pagehide',()=>{if(supported)synth.cancel();});
})();
