/* MzanConnect: membership funding option. Sponsorship requests do NOT create
 * subscriptions, trigger payments, or change member access. Database RLS
 * independently authorises each member's enquiries and owner review actions.
 */
(()=>{'use strict';
const OWNER_UID='820a18ee-3482-4b6c-bd75-469cf198b9df';
const OPEN=new Set(['submitted','under_review','company_contacted','sponsor_confirmed']);
const STATUS={
 submitted:'Submitted for review',
 under_review:'Under review',
 company_contacted:'Company contacted',
 sponsor_confirmed:'Sponsor confirmed — membership not yet activated',
 declined:'Not approved'
};
const $=id=>document.getElementById(id);
const make=(tag,text,className)=>{
 const el=document.createElement(tag);
 if(text!==undefined)el.textContent=String(text);
 if(className)el.className=className;
 return el;
};
const fmtDate=value=>{
 const d=new Date(value);
 return Number.isNaN(d.getTime())?'Date unavailable':d.toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'});
};
function entry(record,owner=false){
 const card=make('article',undefined,'sponsor-entry');
 const title=make('strong',record.company_name||'Unnamed sponsoring organisation');
 const status=make('p',STATUS[record.status]||'Status unavailable');
 status.style.fontWeight='700';
 card.append(title,status);
 card.append(make('small',fmtDate(record.created_at)+' · '+Number(record.requested_months||1)+' month(s) requested'));
 if(owner){
  if(record.applicant_email)card.append(make('p','Member contact email: '+record.applicant_email));
  if(record.company_contact_name)card.append(make('p','Company contact: '+record.company_contact_name));
  if(record.company_contact_email)card.append(make('p','Company email: '+record.company_contact_email));
  if(record.company_contact_phone)card.append(make('p','Company phone: '+record.company_contact_phone));
  if(record.request_note)card.append(make('p','Programme / reason: '+record.request_note));
  card.append(make('small','Member reference: '+(record.user_id||'')));
 }
 return card;
}
async function mount({client,user,owner,checkoutAvailable}){
 const self=$('fundingSelf'),company=$('fundingCompany'),notice=$('companyFundingMessage');
 const live=$('liveMembership'),sponsor=$('sponsorMembership');
 const form=$('sponsorForm'),status=$('sponsorFormStatus'),records=$('sponsorMyRequests');
 const ownerPanel=$('ownerSponsorInbox');
 if(!client||!user||!self||!company||!notice||!form)throw Error('Sponsorship service is missing required components.');
 const isOwner=Boolean(owner&&user.id===OWNER_UID);
 function choose(){
  const sponsored=company.checked;
  live.hidden=sponsored||!checkoutAvailable;
  sponsor.hidden=!sponsored||isOwner;
  notice.textContent=isOwner
   ?sponsored?'Owner account: see the private company sponsorship inbox below. No owner payment is required.'
     :'Owner membership is exempt from payment. Self-funded checkout is available to paying members.'
   :sponsored
     ?'Company-funded membership requires company agreement and separate verification. Submitting a request will not activate a subscription.'
     :checkoutAvailable
       ?'Self-funded subscription: pay R199 securely through the existing Yoco checkout.'
       :'Your existing membership or exemption remains in place. No new payment is due at present.';
 }
 self.addEventListener('change',choose);
 company.addEventListener('change',choose);
 choose();

 if(isOwner){
  ownerPanel.hidden=false;
  const root=$('sponsorOwnerRequests'),ownerStatus=$('sponsorOwnerStatus'),refresh=$('sponsorOwnerRefresh');
  let busy=false;
  async function loadOwner(){
   if(busy)return;
   busy=true;refresh.disabled=true;
   ownerStatus.textContent='Loading private sponsorship requests…';
   root.replaceChildren();
   try{
    const {data,error}=await client.from('company_membership_sponsorship_requests')
     .select('id,user_id,applicant_email,company_name,company_contact_name,company_contact_email,company_contact_phone,requested_months,request_note,status,created_at')
     .order('created_at',{ascending:false}).limit(100);
    if(error)throw error;
    const list=Array.isArray(data)?data:[];
    ownerStatus.textContent=list.length+' recent sponsorship request(s). No request activates access or charges a sponsor.';
    if(!list.length)root.append(make('p','No company-sponsored membership applications yet.'));
    for(const record of list){
     const card=entry(record,true);
     const actions=make('div',undefined,'status-actions');
     const feedback=make('p','');
     feedback.setAttribute('role','status');
     let saving=false;
     const choices=[
       ['submitted','Submitted'],
       ['under_review','In review'],
       ['company_contacted','Company contacted'],
       ['sponsor_confirmed','Sponsor confirmed'],
       ['declined','Not approved']
     ];
     const buttons=[];
     for(const [value,label] of choices){
      const button=make('button',label);
      button.type='button';
      button.disabled=record.status===value;
      button.setAttribute('aria-pressed',String(record.status===value));
      button.setAttribute('aria-label',label+' for '+record.company_name);
      button.addEventListener('click',async()=>{
       if(saving||button.disabled)return;
       saving=true;buttons.forEach(b=>b.disabled=true);
       feedback.textContent='Saving review status…';
       try{
        const {data:updated,error:updateError}=await client.from('company_membership_sponsorship_requests')
         .update({status:value,updated_at:new Date().toISOString(),reviewed_at:new Date().toISOString()})
         .eq('id',record.id)
         .select('id,status').single();
        if(updateError||!updated||updated.id!==record.id)throw updateError||Error('Record not updated');
        record.status=updated.status;
        statusLine.textContent=STATUS[record.status]||'Status unavailable';
        buttons.forEach((b,i)=>{
         b.setAttribute('aria-pressed',String(choices[i][0]===record.status));
         b.disabled=choices[i][0]===record.status;
        });
        feedback.textContent='Review status saved. No payment or access was activated.';
       }catch(error){
        feedback.textContent='Unable to save. Please retry from this inbox.';
        buttons.forEach((b,i)=>b.disabled=choices[i][0]===record.status);
       }finally{saving=false;}
      });
      buttons.push(button);actions.append(button);
     }
     const statusLine=card.querySelector('p');
     card.append(actions,feedback);root.append(card);
    }
   }catch(error){ownerStatus.textContent='Owner inbox could not load; try Refresh Sponsorship Requests.';}
   finally{busy=false;refresh.disabled=false;}
  }
  refresh.addEventListener('click',()=>void loadOwner());
  await loadOwner();
  if(location.hash==='#company-sponsorship-inbox'){
   company.checked=true;choose();ownerPanel.scrollIntoView({block:'start'});
  }
  return;
 }

 let hasOpen=false,loading=false;
 async function loadMine(){
  if(loading)return;
  loading=true;
  records.replaceChildren();
  status.textContent='Checking your sponsorship requests…';
  try{
   const {data,error}=await client.from('company_membership_sponsorship_requests')
    .select('id,company_name,requested_months,status,created_at')
    .eq('user_id',user.id).order('created_at',{ascending:false}).limit(20);
   if(error)throw error;
   const list=Array.isArray(data)?data:[];
   hasOpen=list.some(row=>OPEN.has(row.status));
   form.hidden=hasOpen;
   status.textContent=hasOpen
    ?'You already have a sponsorship enquiry under review. A second open application cannot be submitted. You can still choose self-payment.'
    :list.length?'Your earlier sponsorship requests are shown below.':'No company sponsorship enquiry has been submitted yet.';
   for(const row of list)records.append(entry(row));
  }catch(error){
   form.hidden=true;
   status.textContent='Could not confirm existing sponsorship requests. Submitting is disabled to prevent duplicates. Refresh the page.';
  }finally{loading=false;}
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(hasOpen||loading||!form.reportValidity())return;
  const submit=$('sponsorSubmit'),consent=$('sponsorConsent');
  if(!consent.checked)return;
  const companyName=$('sponsorCompany').value.trim();
  if(companyName.length<2){status.textContent='Enter the full company or organisation name.';return;}
  submit.disabled=true;
  status.textContent='Submitting your sponsorship enquiry…';
  try{
   const {error}=await client.from('company_membership_sponsorship_requests').insert({
    user_id:user.id,
    applicant_email:user.email,
    company_name:companyName,
    company_contact_name:$('sponsorContactName').value.trim(),
    company_contact_email:$('sponsorEmail').value.trim(),
    company_contact_phone:$('sponsorPhone').value.trim(),
    requested_months:Number($('sponsorMonths').value),
    request_note:$('sponsorNote').value.trim(),
    consent_confirmed:true
   });
   if(error)throw error;
   status.textContent='Sponsorship request submitted for review. This is NOT approval or payment. You will see its status below.';
   form.reset();
   await loadMine();
  }catch(error){
   status.textContent=error.code==='23505'
    ?'There is already an open sponsorship request for your account. Refresh this page.'
    :'Could not submit this enquiry: '+(error.message||'Please retry.');
  }finally{submit.disabled=false;}
 });
 await loadMine();
}
window.MzanCompanySponsorship=Object.freeze({mount});
})();
