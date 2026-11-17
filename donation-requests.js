/* MzanConnect Donation Requests: private, signed-in member submissions. */
(() => {
'use strict';
const $=id=>document.getElementById(id);
const TYPES=['Financial support','Equipment or tools','Materials or supplies','Training or mentorship','Community project support','Other in-kind support'];
const STATUS={new:'Submitted for review',reviewing:'Under review',awaiting_documents:'More information needed',quoted:'Review in progress',in_progress:'In progress',completed:'Review completed',cancelled:'Closed'};
let db=null,user=null,owner=false;
function message(text,error=false){const target=$('donationStatus');target.textContent=text;target.style.color=error?'#972b2b':'#08715f';}
function field(id){return $(id).value.trim();}
function make(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
async function loadHistory(){
 if(!db||!user)return;
 const list=$('donationHistory');list.textContent='Loading your requests…';
 const {data,error}=await db.from('business_service_requests')
  .select('id,business_name,details,status,created_at')
  .eq('user_id',user.id).eq('service_type','donation_request')
  .order('created_at',{ascending:false}).limit(30);
 list.replaceChildren();
 if(error){list.textContent='Could not load your requests. Please refresh.';return;}
 if(!data?.length){list.textContent='No donation requests submitted yet.';return;}
 for(const record of data){
   const card=make('article',undefined,'request');
   const status=make('strong',STATUS[record.status]||'Submitted for review');
   const date=new Date(record.created_at);
   card.append(status,make('small',(Number.isNaN(date.getTime())?'':date.toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'}))+' · '+record.business_name));
   card.append(make('p',record.details||''));
   list.append(card);
 }
}

/* Owner records are only fetched after server-authenticated owner identity is known.
   Supabase RLS separately enforces owner-only access and updates. */
let ownerRecords=[];
let ownerLoading=false;
const REVIEW_STATES=['new','reviewing','in_progress','completed','cancelled'];
const OPEN_STATES=new Set(['new','reviewing','awaiting_documents','quoted','in_progress']);
function ownerView(){
 const container=$('donationOwnerList');
 const selected=field('donationOwnerFilter')||'all';
 const rows=ownerRecords.filter(r=>selected==='all'||
   (selected==='open'&&OPEN_STATES.has(r.status))||r.status===selected);
 const open=ownerRecords.filter(r=>OPEN_STATES.has(r.status)).length;
 $('donationOwnerSummary').textContent=ownerRecords.length+' recent request'+(ownerRecords.length===1?'':'s')+
  ' · '+open+' awaiting action';
 container.replaceChildren();
 if(!rows.length){container.append(make('p','No matching donation requests.','empty'));return;}
 for(const record of rows){
  const card=make('article',undefined,'owner-request');
  const name=make('strong',record.business_name||'Unnamed applicant');
  const when=new Date(record.created_at);
  const meta=make('small',(Number.isNaN(when.getTime())?'Date unavailable':when.toLocaleDateString('en-ZA',{dateStyle:'medium'}))+
   ' · Reference: '+String(record.id||'').slice(0,8).toUpperCase());
  const email=make('small','Contact: '+(record.contact_email||'Unavailable'));
  const current=make('p',STATUS[record.status]||'Submitted for review');
  current.style.fontWeight='700';
  const detail=make('p',record.details||'No description provided','request-data');
  const actions=make('div',undefined,'status-actions');
  actions.setAttribute('aria-label','Review status for '+(record.business_name||'this request'));
  const feedback=make('p','','owner-feedback');
  feedback.setAttribute('role','status');
  let busy=false;
  for(const value of REVIEW_STATES){
   const button=make('button',STATUS[value]);
   button.type='button';
   button.setAttribute('aria-pressed',String(record.status===value));
   button.disabled=record.status===value;
   button.addEventListener('click',async()=>{
    if(!owner||!db||busy||button.disabled)return;
    busy=true;
    for(const b of actions.querySelectorAll('button'))b.disabled=true;
    feedback.textContent='Saving status…';
    try{
     const {data,error}=await db.from('business_service_requests')
      .update({status:value,updated_at:new Date().toISOString()})
      .eq('id',record.id).eq('service_type','donation_request')
      .select('id,status').single();
     if(error||!data||data.id!==record.id)throw error||new Error('Not updated');
     record.status=data.status;
     ownerView();
    }catch(error){
     feedback.textContent='Could not update the status. Try again.';
     busy=false;
     for(const b of actions.querySelectorAll('button'))b.disabled=b.textContent===STATUS[record.status];
    }
   });
   actions.append(button);
  }
  card.append(name,meta,email,current,detail,actions,feedback);
  container.append(card);
 }
}
async function loadOwnerInbox(){
 if(!owner||!user||!db||ownerLoading)return;
 ownerLoading=true;
 $('donationOwnerRefresh').disabled=true;
 $('donationOwnerList').textContent='Refreshing the private inbox…';
 try{
  const {data,error}=await db.from('business_service_requests')
   .select('id,business_name,details,contact_email,status,created_at')
   .eq('service_type','donation_request')
   .order('created_at',{ascending:false}).limit(100);
  if(error)throw error;
  ownerRecords=Array.isArray(data)?data:[];
  ownerView();
 }catch(error){$('donationOwnerList').textContent='Unable to load the owner inbox. Please check your access and retry.';}
 finally{ownerLoading=false;$('donationOwnerRefresh').disabled=false;}
}
$('donationOwnerFilter').addEventListener('change',()=>{if(owner)ownerView()});
$('donationOwnerRefresh').addEventListener('click',()=>void loadOwnerInbox());
$('donationOwnerPrint').addEventListener('click',()=>{
 if(!owner||!ownerRecords.length)return;
 document.body.classList.add('print-donation-report');
 window.print();
});
window.addEventListener('afterprint',()=>document.body.classList.remove('print-donation-report'));

$('donationRefresh').addEventListener('click',()=>void loadHistory());
$('donationForm').addEventListener('submit',async event=>{
 event.preventDefault();
 if(!db||!user){$('donationSignIn').hidden=false;return;}
 if(!$('donationForm').reportValidity())return;
 const type=field('donationType');
 if(!TYPES.includes(type)){message('Choose a valid support type.',true);return;}
 const amount=field('donationAmount');
 if(amount&&(!Number.isSafeInteger(Number(amount))||Number(amount)<1||Number(amount)>10000000)){message('Enter a whole rand value between R1 and R10,000,000.',true);return;}
 const business=field('donationApplicant'),location=field('donationLocation'),purpose=field('donationPurpose'),impact=field('donationImpact');
 const details=['Support requested: '+type,'Area: '+location,amount?'Estimated value: R'+amount:'Estimated value: Not provided','Purpose: '+purpose,'Expected impact: '+impact].join('\n');
 if(business.length>140||location.length>80||purpose.length>360||impact.length>280||details.length>1000){message('Please shorten your answers and try again.',true);return;}
 if(!user.email){message('Please sign in with an email address to submit.',true);return;}
 const btn=$('donationSubmit');if(btn.disabled)return;
 btn.disabled=true;message('Submitting your request…');
 try{
  const {error}=await db.from('business_service_requests').insert({
   user_id:user.id,service_type:'donation_request',business_name:business,
   details,contact_email:user.email,consent_confirmed:true
  });
  if(error)throw error;
  $('donationForm').reset();
  message('Your request was submitted for review. This is not an approval of support.');
  await loadHistory();
  $('donationHistoryPanel').scrollIntoView({behavior:'smooth',block:'start'});
 }catch(error){
  message('Could not save your request. Check your connection, then try again. No request confirmation was received.',true);
 }finally{btn.disabled=false;}
});
(async()=>{
 try{
  if(!window.supabase)throw new Error('Library not loaded');
  db=window.supabase.createClient('https://akxzubckdebawqwwwaoe.supabase.co','sb_publishable_XEeBfPCzJ0MzGpHWHygeug_rGptbzno');
  const {data,error}=await db.auth.getUser();if(error)throw error;
  user=data.user;
  if(!user||user.is_anonymous){$('donationSignIn').hidden=false;return;}
  $('donationFormPanel').hidden=false;
  $('donationHistoryPanel').hidden=false;
  $('donationAccount').textContent='Signed in as '+(user.email||'MzanConnect member');
  owner=user.app_metadata?.mzanconnect_role==='owner' || user.id==='820a18ee-3482-4b6c-bd75-469cf198b9df';
  if(owner){
   $('donationOwnerPanel').hidden=false;
   await loadOwnerInbox();
   if(location.hash==='#owner-inbox')$('donationOwnerPanel').scrollIntoView({block:'start'});
  }
  await loadHistory();
 }catch(error){
  $('donationSignIn').hidden=false;
  $('donationSignIn').querySelector('p').textContent='Unable to verify your account. Please sign in to submit a donation request.';
 }
})();
})();
