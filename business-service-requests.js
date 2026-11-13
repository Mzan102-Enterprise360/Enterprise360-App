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

const DELIVERABLES_BUCKET='mzanconnect-service-deliverables';
const MAX_DELIVERABLE_SIZE=10*1024*1024;
function attachDeliverables(card, request, ownerView){
 const section=create('section',undefined,'request-deliverables');
 const documents=create('details');
 const summary=create('summary','Files for this request — view / download');
 const list=create('div','Open to check for completed documents.','request-document-list');
 list.setAttribute('aria-live','polite');
 documents.append(summary,list);
 section.append(documents);
 let loading=false;
 async function reloadFiles(){
  if(loading)return;
  loading=true;list.textContent='Loading your documents…';
  try{
   const {data,error}=await db.storage.from(DELIVERABLES_BUCKET)
    .list(request.id,{limit:100,sortBy:{column:'created_at',order:'desc'}});
   if(error)throw error;
   const files=(data||[]).filter(file=>file.name && file.id && /\.(pdf|docx)$/i.test(file.name));
   list.replaceChildren();
   if(!files.length){list.textContent='No completed documents have been uploaded for this request yet.';return;}
   for(const file of files){
    const line=create('div',undefined,'request-document');
    const fileName=file.name.replace(/^[0-9a-f-]{36}_/i,'').replace(/_/g,' ');
    const filename=create('span',fileName);
    const download=create('button','Download file','download-action');
    const feedback=create('small','');
    feedback.setAttribute('role','status');
    download.type='button';
    download.addEventListener('click',async()=>{
     if(download.disabled)return;
     download.disabled=true;feedback.textContent=' Preparing download…';
     try{
      const {data:blob,error}=await db.storage.from(DELIVERABLES_BUCKET)
       .download(request.id+'/'+file.name);
      if(error||!blob)throw error||new Error('The file is not available');
      const url=URL.createObjectURL(blob);
      const anchor=document.createElement('a');
      anchor.href=url;anchor.download=fileName;anchor.style.display='none';
      document.body.append(anchor);anchor.click();anchor.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),60000);
      feedback.textContent=' Download started.';
     }catch(e){feedback.textContent=' Could not download. Please try again.';}
     finally{download.disabled=false;}
    });
    line.append(filename,download,feedback);
    list.append(line);
   }
  }catch(e){list.textContent='Unable to load documents. Close and reopen this section to retry.';}
  finally{loading=false;}
 }
 documents.addEventListener('toggle',()=>{if(documents.open)void reloadFiles();});
 if(ownerView){
  const uploadArea=create('div',undefined,'request-file-upload');
  const label=create('label','Upload a completed document:');
  const input=document.createElement('input');
  input.type='file';input.accept='.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  input.setAttribute('aria-label','Choose completed document for '+(titles[request.service_type]||'business service'));
  label.append(input);
  const hint=create('p','PDF or Word (.docx), maximum 10 MB. This file will be visible only to you and the member who requested the service.','request-upload-hint');
  const button=create('button','Upload to this request','upload-action');button.type='button';
  const feedback=create('p','', 'upload-feedback');feedback.setAttribute('role','status');
  button.addEventListener('click',async()=>{
   if(button.disabled)return;
   const file=input.files?.[0];
   if(!file){feedback.textContent='Choose a PDF or Word document first.';return;}
   const ext=(file.name.split('.').pop()||'').toLowerCase();
   if(!['pdf','docx'].includes(ext)){feedback.textContent='Only PDF or Word (.docx) documents are supported.';return;}
   if(file.size<1||file.size>MAX_DELIVERABLE_SIZE){feedback.textContent='Please select a document smaller than 10 MB.';return;}
   const safeName=file.name.replace(/[^A-Za-z0-9._-]/g,'_').slice(-110);
   const uid=window.crypto?.randomUUID?.()||String(Date.now())+'-'+Math.random().toString(16).slice(2);
   const path=request.id+'/'+uid+'_'+safeName;
   button.disabled=true;feedback.textContent='Uploading securely…';
   try{
    const mime=ext==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const {error}=await db.storage.from(DELIVERABLES_BUCKET)
     .upload(path,file,{upsert:false,contentType:mime,cacheControl:'3600'});
    if(error)throw error;
    input.value='';
    feedback.textContent='Uploaded successfully. The member can now download this document in their request history.';
    documents.open=true;
    await reloadFiles();
   }catch(e){feedback.textContent='Upload was not saved: '+(e?.message||'Please try again.');}
   finally{button.disabled=false;}
  });
  uploadArea.append(label,hint,button,feedback);
  section.append(uploadArea);
 }
 card.append(section);
}

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
 attachDeliverables(card,r,admin);
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