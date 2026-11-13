/* MzanConnect optional spoken guidance. No audio is recorded or sent to a server. */
(()=>{'use strict';
if(document.getElementById('mzan-voice-tools'))return;
const synth=window.speechSynthesis;
const supported=!!(synth&&window.SpeechSynthesisUtterance);
const style=document.createElement('style');
style.textContent=`
#mzan-voice-tools{position:fixed;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:10000;font:15px Arial,sans-serif;color:#14283b}
#mzan-voice-tools button{font:inherit;cursor:pointer;border:2px solid #fff;border-radius:10px;background:#116a71;color:#fff;min-height:46px;padding:9px 12px;box-shadow:0 2px 8px #0003}
#mzan-voice-tools button:focus-visible{outline:3px solid #ffbf47;outline-offset:2px}
#mzan-voice-panel{background:#fff;color:#14283b;border:2px solid #116a71;border-radius:12px;padding:12px;box-shadow:0 3px 15px #0003;max-width:min(310px,calc(100vw - 24px));margin-bottom:8px}
#mzan-voice-panel[hidden]{display:none}
#mzan-voice-panel p{margin:5px 0 10px;line-height:1.35;font-size:13px}
#mzan-voice-panel .mzan-actions{display:flex;flex-wrap:wrap;gap:6px}
#mzan-voice-panel .mzan-actions button{flex:1;min-width:65px;box-shadow:none}
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
const toggle=document.createElement('button');toggle.type='button';toggle.textContent='🔊 Listen';toggle.setAttribute('aria-label','Open spoken page guidance');toggle.setAttribute('aria-expanded','false');
toggle.setAttribute('aria-controls','mzan-voice-panel');
let current=null;
function preferredVoice(){
  const voices=synth.getVoices();
  const english=voices.filter(v=>/^en([-_]|$)/i.test(v.lang));
  if(!english.length)return null;
  // Voice gender is not reliably exposed by the browser API.
  const female=english.filter(v=>/female|woman|samantha|victoria|karen|moira|tessa|zira|ava|serena|susan|joanna|aria|jenny|sonia/i.test(v.name));
  const southAfrican=vs=>vs.find(v=>/^en[-_]ZA$/i.test(v.lang));
  return southAfrican(female)||female.find(v=>/natural|neural|premium|enhanced/i.test(v.name))||female[0]||southAfrican(english)||english.find(v=>/natural|neural|premium|enhanced/i.test(v.name))||english[0];
}
function stop(){if(supported){synth.cancel();current=null;}info.textContent='Stopped.';}
function visible(el){if(el.closest('[hidden],[aria-hidden="true"],#mzan-voice-tools,form,[data-private],.receipt,[autocomplete="cc-number"]'))return false;const s=getComputedStyle(el);return s.display!=='none'&&s.visibility==='visible'&&el.getClientRects().length>0;}
function textForPage(){
const root=document.querySelector('main')||document.body;
const heading=document.querySelector('h1');
const parts=[heading&&visible(heading)?heading.textContent.trim():document.title];
const nodes=root.querySelectorAll('h2,h3,p,summary,.service a,.tile a,nav a,main > a,main > button');
for(const el of nodes){if(!visible(el))continue;const t=(el.innerText||el.textContent||'').replace(/\s+/g,' ').trim();if(!t||t.length>280)continue;if(el.matches('a')&&t==='Open ↗'){const card=el.closest('.service');const h=card&&card.querySelector('h2');parts.push('Open '+(h?h.textContent:'website'));continue;}parts.push(t);if(parts.join(' ').length>3500)break;}
return 'Welcome to MzanConnect. '+parts.join('. ')+'. To choose a service, tap its Open button. You can use the screen reader on your phone to explore buttons and forms.';
}
function speak(){if(!supported){info.textContent='Voice reading is not available. Try Android TalkBack in Accessibility settings.';return;}if(getComputedStyle(document.body).visibility==='hidden'){info.textContent='Please wait for the page to load.';return;}synth.cancel();const u=new SpeechSynthesisUtterance(textForPage());const voice=preferredVoice();if(voice){u.voice=voice;u.lang=voice.lang;}else{u.lang='en-ZA';}u.rate=.84;u.pitch=1.08;u.volume=1;u.onend=()=>{if(current===u){info.textContent='Finished reading.';current=null;}};u.onerror=()=>{if(current===u){info.textContent='Unable to read aloud. Try your phone screen reader.';current=null;}};current=u;synth.speak(u);info.textContent='Reading in a calm, clear voice. The voice depends on your phone settings.';}
const listen=button('▶ Listen',speak);
const pause=button('⏸ Pause',()=>{if(!supported)return;if(synth.paused){synth.resume();pause.textContent='⏸ Pause';info.textContent='Reading resumed.';}else if(synth.speaking){synth.pause();pause.textContent='▶ Resume';info.textContent='Paused.';}});
button('■ Stop',stop);
panel.append(title,info,actions);
toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));if(panel.hidden)stop();});
host.append(panel,toggle);
document.body.append(host);
window.addEventListener('pagehide',()=>{if(supported)synth.cancel();});
})();
