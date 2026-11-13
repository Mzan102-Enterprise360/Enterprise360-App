/* MzanConnect service enquiries: signed-in members only; RLS protects private records. */
(() => {
'use strict';
const byId = id => document.getElementById(id);
const titles={cipc:'CIPC BizPortal assistance',csd:'CSD supplier registration',sars:'SARS compliance guidance',cidb:'CIDB contractor registration',business_plan:'Business plan service',business_profile:'Business profile service',other:'Other business service'};
const create=(tag, text, className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
let db, user, owner=false;
const loginPrompt=byId('serviceSignIn'), panel=byId('serviceRequestPanel'), form=byId('serviceRequestForm');
const note=byId('serviceFeedback'), myList=byId('myServiceRequests'), ownerPanel=byId('serviceOwnerPanel'), ownerList=byId('ownerServiceRequests');
function notify(message, failure=false){note.textContent=message;note.style.color=failure?'#9a2c2c':'#126763';}
function statusText(status){return ({new:'Submitted to owner',reviewing:'Under review',awaiting_documents:'Documents requested',quoted:'Quote prepared',in_progress:'In progress',completed:'Completed',cancelled:'Cancelled'})[status]||status;}
function showRequest(type){
 if(!user){loginPrompt.hidden=false;loginPrompt.scrollIntoView({behavior:'smooth',block:'nearest'});return;}
 byId('serviceType').value=type;byId('selectedService').textContent=titles[type]||titles.other;
 panel.hidden=false;notify('');panel.scrollIntoView({behavior:'smooth',block:'start'});
 byId('businessName').focus({preventScroll:true});
}
document.querySelectorAll('[data-request-service]').forEach(b=>b.addEventListener('click',()=>showRequest(b.dataset.requestService)));
function requestRow(r,admin){
 const card=create('article',undefined,'request-record');
 const heading=create('strong',(titles[r.service_type]||'Business assistance')+' · '+statusText(r.status));
 card.append(heading,create('small',new Date(r.created_at).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'})));
 if(r.business_name)card.append(create('p','Business: '+r.business_name));
 if(r.details)card.append(create('p',r.details));
 if(admin){
  card.append(create('p','Member email: '+r.contact_email));
  const actions=create('div',undefined,'status-actions');
  const title=create('p','Mark request as:','status-actions-label');
  const feedback=create('p','', 'status-feedback');feedback.setAttribute('role','status');
  const available=['new','in_progress','completed'];
  const buttons=[];
  function setButtons(busy=false){
   buttons.forEach(({button,status})=>{
    button.disabled=busy||r.status===status;
    button.setAttribute('aria-pressed',String(r.status===status));
   });
  }
  available.forEach(status=>{
   const button=create('button',statusText(status),'status-action');
   button.type='button';
   button.setAttribute('aria-label','Mark '+(titles[r.service_type]||'request')+' as '+statusText(status));
   button.addEventListener('click',async()=>{
    if(button.disabled)return;
    setButtons(true);feedback.textContent='Saving status…';
    try{
     const {data,error}=await db.from('business_service_requests')
      .update({status,updated_at:new Date().toISOString()})
      .eq('id',r.id).select('id,status').single();
     if(error||!data)throw error||new Error('No updated request returned');
     r.status=data.status;
     heading.textContent=(titles[r.service_type]||'Business assistance')+' · '+statusText(r.status);
     feedback.textContent='Saved: '+statusText(r.status)+'. The member will see this when opening their requests.';
    }catch(e){
     feedback.textContent='Status was not saved. Please try again.';
    }finally{setButtons(false);}
   });
   buttons.push({button,status});actions.append(button);
  });
  setButtons(false);
  card.append(title,actions,feedback);
 }
 return card;
}
async function refreshLists(){
 if(!db||!user)return;
 const fields='id,service_type,business_name,details,contact_email,status,created_at';
 const mine=await db.from('business_service_requests').select(fields).eq('user_id',user.id).order('created_at',{ascending:false}).limit(30);
 myList.replaceChildren();
 if(mine.error)myList.textContent='Could not load your requests. Try refreshing the page.';
 else if(!mine.data.length)myList.textContent='You have not requested any services yet.';
 else myList.append(...mine.data.map(r=>requestRow(r,false)));
 if(owner){
  const inbox=await db.from('business_service_requests').select(fields).order('created_at',{ascending:false}).limit(50);
  ownerList.replaceChildren();
  if(inbox.error)ownerList.textContent='Could not load the private inbox. Try refreshing.';
  else if(!inbox.data.length)ownerList.textContent='No service requests received yet.';
  else ownerList.append(...inbox.data.map(r=>requestRow(r,true)));
 }
}
(async()=>{
 try{
  if(!window.supabase)throw new Error('Authentication library unavailable');
  db=window.supabase.createClient('https://akxzubckdebawqwwwaoe.supabase.co','sb_publishable_XEeBfPCzJ0MzGpHWHygeug_rGptbzno');
  const response=await db.auth.getUser();if(response.error)throw response.error;
  user=response.data.user;
  if(!user){loginPrompt.hidden=false;return;}
  byId('serviceAccount').textContent='Signed in as '+(user.email||'MzanConnect member');
  byId('serviceSignedIn').hidden=false;
  owner=user.app_metadata?.mzanconnect_role==='owner';
  if(owner){ownerPanel.hidden=false;}
  await refreshLists();
 }catch(err){loginPrompt.hidden=false;byId('serviceSignInHint').textContent='Please sign in to send a service request.';}
})();
form.addEventListener('submit',async e=>{
 e.preventDefault();
 if(!user||!db){loginPrompt.hidden=false;return;}
 const btn=byId('submitServiceRequest');if(btn.disabled)return;
 if(!byId('serviceConsent').checked){notify('Please consent to being contacted.',true);return;}
 const details=byId('serviceDetails').value.trim();
 const business=byId('businessName').value.trim();
 const values={user_id:user.id,service_type:byId('serviceType').value,business_name:business,details,contact_email:user.email||'',consent_confirmed:true};
 if(!values.contact_email){notify('Your account needs a confirmed email address.',true);return;}
 btn.disabled=true;notify('Sending your request…');
 try{
  const {error}=await db.from('business_service_requests').insert(values);
  if(error)throw error;
  form.reset();panel.hidden=true;
  notify('Submitted to owner. Your request is saved; you can check its progress under My service requests.');
  await refreshLists();
  byId('serviceSignedIn').scrollIntoView({behavior:'smooth',block:'start'});
 }catch(err){notify('Could not save your request. Check your connection and try again.',true);}
 finally{btn.disabled=false;}
});
})();