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
  owner=user.app_metadata?.mzanconnect_role==='owner';
  if(owner)$('donationOwnerPanel').hidden=false;
  await loadHistory();
 }catch(error){
  $('donationSignIn').hidden=false;
  $('donationSignIn').querySelector('p').textContent='Unable to verify your account. Please sign in to submit a donation request.';
 }
})();
})();
