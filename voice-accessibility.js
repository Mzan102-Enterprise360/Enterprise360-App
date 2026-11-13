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
info.textContent=supported?'Listen for guidance on this page. Pause or stop whenever you wish.':'Voice reading is unavailable in this browser. You can use your phone screen reader.';
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
 const page=location.pathname.split('/').pop()||'index.html';
 const shown=id=>{const el=document.getElementById(id);return !!(el&&!el.closest('[hidden]')&&getComputedStyle(el).display!=='none');};
 if(page==='index.html'){
  const view=document.getElementById('view');
  if(view?.querySelector('#opportunitySearch')){
   const category=document.getElementById('opportunityCategory');
   const selected=category?.selectedOptions?.[0]?.textContent?.trim();
   return 'You are exploring business funding, tenders, and supplier opportunities. Begin with a keyword or choose a category'+(selected&&selected!=='All Categories'?', currently '+selected.toLowerCase():'')+'. Review the sources shown, then open the relevant official website to confirm requirements and deadlines. For hands-on assistance, select Business Support below.';
  }
  if(view?.querySelector('.welcome-cover')){
   return 'MzanConnect brings business opportunities and practical support together. If this is your first visit, choose Join MzanConnect to create your account. Already a member? Choose Member Login. You can also use Explore to find opportunities, or Business Support to request help with your business.';
  }
  if(view?.querySelector('#business')){
   return 'This is a local business profile preview. Enter your business name and sector, then save the demo information on this device. To manage your registered business details securely, open My Business from your member dashboard.';
  }
  if(view?.querySelector('.chat')){
   return 'You are viewing the demonstration chat. Enter a question if you would like to try the example. Messages here are stored on your device and are not sent to MzanConnect staff. For personal assistance, use Member Support in your dashboard.';
  }
  if(view?.querySelector('#compliance')||view?.querySelector('h2')?.textContent?.includes('Compliance Checklist')){
   return 'This is a sample compliance checklist. Review each requirement and tick the items you have completed. To save your actual business compliance records, open the Compliance section from your member dashboard.';
  }
  if(view?.querySelector('h2')?.textContent?.includes('Growth Passport')){
   return 'This is a preview of business growth milestones. Review the suggested steps, then open Growth Passport through your dashboard to save your progress to your account.';
  }
  return 'Use the available options to explore the business tools on this page. Your dashboard contains your personal business information and member support.';
 }
 if(page==='business-support.html'){
  if(shown('serviceRequestPanel')){
   const service=document.getElementById('selectedService')?.textContent?.trim();
   return 'You are requesting '+(service||'business assistance')+'. Enter your business name if you have one, then briefly describe the help you need. Review the consent statement and select Send service request. You can follow the progress under My service requests.';
  }
  if(shown('serviceSignIn')){
   return 'Choose the business service you need. To keep your request private, please sign in to your account, or select Join MzanConnect if you are new. Return here to submit your request.';
  }
  if(shown('serviceOwnerPanel')){
   return 'You are in Business Support. Members can request company registration, business plans, profiles, and compliance assistance. As the owner, review new enquiries in your private inbox below. Mark each request as submitted, in progress, or completed. When the work is ready, upload the finished PDF or Word document to that request so the member can download it.';
  }
  return 'Business Support makes it easier to get practical assistance. Choose the service you need, then select Request assistance. Tell us what you would like help with and submit your enquiry. You can check its progress and collect completed documents under My service requests.';
 }
 if(page==='dashboard.html'){
  return 'This is your member dashboard. Start with My Business to review or update your profile. Use Compliance and Bookkeeping to organise your records, and Growth Passport to follow your business goals. For account questions, open Member Support. You can print individual reports when needed.';
 }
 if(page==='member.html'){
  if(shown('compliancePanel')){
   return 'You are viewing your business compliance checklist. Review each requirement, update the items you have completed, then select Save checklist. This records your progress; it does not replace official compliance verification.';
  }
  if(shown('growthPanel')){
   return 'You are viewing your Growth Passport. Review the business milestones, update your progress, and save your changes. You can return later to continue where you left off.';
  }
  return 'This is My Business. Review your business name, contact details, sector, region, and description. Make any changes you need, then select Save business profile. Your information will be linked to your member account.';
 }
 if(page==='billing.html'){
  if(shown('receiptPrint')){
   return 'Your payment receipt is displayed. Review the details carefully. You can print the receipt or save a PDF for your records, then close it to return to Billing and Membership.';
  }
  if(shown('yocoSandbox')){
   return 'This is Billing and Membership. Your owner account does not require payment. Members have one monthly membership at one hundred and ninety rand, and any hands-on business services are quoted separately. The test checkout below is for payment testing only. Test payments do not activate paid memberships.';
  }
  return 'This is Billing and Membership. Your MzanConnect membership costs one hundred and ninety rand for one month. It includes access to the business tools on your dashboard. Business plans, company profiles and other hands-on services are quoted and paid separately. Review your membership status and receipts, then use the secure Yoco checkout if you need to activate your membership.';
 }
 if(page==='support.html'){
  if(shown('ownerInbox')){
   return 'This is Member Support. You can send your own enquiry, or review requests in the owner inbox below. Open a pending message to read it, then write and save a reply. Members can view replies in their request history.';
  }
  return 'This is Member Support. To contact the team, open Send a support request, write your message, and save it. You can return to My request history to check your enquiries and any replies.';
 }
 if(page==='bookkeeping.html'){
  return 'You are in My Bookkeeping. Start by entering the date, whether the amount is income or an expense, and the transaction details. Save each entry, then choose the month you want to review. The totals are based on your own records, and you can print your report when ready.';
 }
 if(page==='login.html'){
  return 'You are on the Member Login page. Enter the email address and password linked to your account, then select Log In. If you need a new password, use the Forgot Password option.';
 }
 if(page==='register.html'){
  return 'You are creating a MzanConnect account. Select your account category and complete the registration details. Review the information, then submit the form. If email confirmation is required, follow the instructions sent to your registered address before signing in.';
 }
 if(page==='reset-password.html'){
  if(shown('updateForm'))return 'You can now set a new password. Enter and confirm your new password, then save it. Use your registered email address to sign in afterwards.';
  return 'To reset your password, enter the email address registered with MzanConnect, then select Send Reset Link. Open the recovery email and follow its instructions to choose a new password.';
 }
 if(page==='privacy.html'){
  return 'This page explains how MzanConnect handles personal and business information. Review the sections on data collection, access, confidentiality, and your privacy rights. If you have a question about your information, contact Member Support.';
 }
 if(page==='copyright.html'){
  return 'This page contains the ownership, copyright, and development credits for MzanConnect. You can review the information here, then return to Home when you are ready.';
 }
 const heading=document.querySelector('h1')?.textContent?.replace(/\s+/g,' ').trim()||'this section';
 return 'You are viewing '+heading+'. Review the information on screen, then choose the action you need. Use the navigation below to move to another section.';
}
function speak(){pause.textContent='⏸ Pause';if(!supported){info.textContent='Voice reading is not available. Try Android TalkBack in Accessibility settings.';return;}if(getComputedStyle(document.body).visibility==='hidden'){info.textContent='Please wait for the page to load.';return;}synth.cancel();const u=new SpeechSynthesisUtterance(textForPage());const voice=preferredVoice();if(voice){u.voice=voice;u.lang=voice.lang;}else{u.lang='en-ZA';}u.rate=.83;u.pitch=1.02;u.volume=1;u.onend=()=>{if(current===u){info.textContent='Finished reading.';current=null;}};u.onerror=()=>{if(current===u){info.textContent='Unable to read aloud. Try your phone screen reader.';current=null;}};current=u;synth.speak(u);info.textContent='Speaking guidance for this section.';}
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
if(view)new MutationObserver(()=>{if(supported)synth.cancel();current=null;pause.textContent='⏸ Pause';info.textContent='Section changed. Tap Listen for the next step.';syncHomeVoice();}).observe(view,{childList:true});
window.addEventListener('pagehide',()=>{if(supported)synth.cancel();});
})();
