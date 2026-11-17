/* MzanConnect Growth Passport: only factual, server-backed milestone status. */
(()=>{
'use strict';
const COMPLIANCE_KEYS=Object.freeze(['c0','c1','c2','c3','c4','c5']);
const OWNER_UID='820a18ee-3482-4b6c-bd75-469cf198b9df';
const isAchieved=state=>['complete','ready','exempt'].includes(state);
async function read(query){
 const {data,error}=await query;
 if(error)throw error;
 return data;
}
async function load(db,user){
 if(!db||!user?.id)throw Error('A verified member account is required.');
 const now=new Date().toISOString();
 const isOwner=user.id===OWNER_UID||user.app_metadata?.mzanconnect_role==='owner';
 const requests=[
  read(db.from('smme_survey_2026_responses').select('id').eq('member_user_id',user.id).limit(1)),
  read(db.from('compliance_items').select('item_key,completed').eq('user_id',user.id).in('item_key',COMPLIANCE_KEYS))
 ];
 if(!isOwner){
  requests.push(
   read(db.from('founding_memberships').select('pilot_status').eq('user_id',user.id).maybeSingle()),
   read(db.from('membership_subscriptions').select('status,current_period_end').eq('user_id',user.id).eq('status','active').gt('current_period_end',now).order('current_period_end',{ascending:false}).limit(1)),
   read(db.from('membership_payments').select('status,verified_at,is_test').eq('user_id',user.id).eq('status','complete').order('verified_at',{ascending:false}).limit(100))
  );
 }
 const settled=await Promise.allSettled(requests);
 const ok=index=>settled[index]?.status==='fulfilled';
 const data=index=>ok(index)?settled[index].value:null;
 const surveyState=!ok(0)?'unknown':(Array.isArray(data(0))&&data(0).length>0?'complete':'available');
 const saved=Array.isArray(data(1))?data(1):[];
 const checked=new Set(saved.filter(x=>x.completed===true&&COMPLIANCE_KEYS.includes(x.item_key)).map(x=>x.item_key));
 const compliant=ok(1)&&checked.size===COMPLIANCE_KEYS.length;
 const complianceState=!ok(1)?'unknown':compliant?'complete':'pending';
 let billingState='pending';
 let billingNote='No active, verified monthly membership found. Payment is never charged on this page.';
 if(isOwner){
  billingState='exempt';
  billingNote='Owner account: membership payment is not required. This is not a paid subscription.';
 }else if(!ok(2)||!ok(3)||!ok(4)){
  billingState='unknown';
  billingNote='Could not verify billing records. Refresh or open Billing & Membership.';
 }else if(data(2)?.pilot_status==='active'){
  billingState='exempt';
  billingNote='Active complimentary founding membership. No payment required while this access is active.';
 }else {
  const subscriptions=Array.isArray(data(3))?data(3):[];
  const payments=Array.isArray(data(4))?data(4):[];
  const verified=payments.some(p=>p.status==='complete'&&Boolean(p.verified_at)&&p.is_test!==true);
  if(subscriptions.length>0&&verified){
   billingState='complete';
   const date=new Date(subscriptions[0].current_period_end);
   billingNote='Verified active membership paid through '+
    (Number.isNaN(date.getTime())?'the current membership period':date.toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'}))+
    '. This is not confirmation of automatic recurring billing.';
  }else if(subscriptions.length>0&&!verified){
   billingState='unknown';
   billingNote='An active period appears in your account, but its live payment verification could not be confirmed.';
  }
 }
 const milestones=[
  {
   key:'survey',title:'Completed Business Survey',state:surveyState,
   detail:surveyState==='complete'?'Linked SMME survey submitted. Registration alone does not complete this milestone.':
    surveyState==='unknown'?'Survey completion could not be verified. Please retry.':
    'Available to registered members. Submit the survey and consent to linking it to your Growth Passport.',
   href:'survey.html?from=growth',action:'Open Business Survey'
  },
  {
   key:'compliance',title:'Business 100% Compliant',state:complianceState,
   detail:complianceState==='unknown'?'Unable to verify your compliance checklist.':
    checked.size+' of '+COMPLIANCE_KEYS.length+
    ' checklist categories marked complete. This is self-reported document readiness, NOT official compliance certification.',
   href:'member.html?section=compliance',action:'Review Compliance'
  },
  {
   key:'donation',title:'Donation Request Ready',state:complianceState==='unknown'?'unknown':compliant?'ready':'locked',
   detail:compliant?'All six checklist items marked complete. You can prepare a donation request; funding is not guaranteed.':
    'Complete all six compliance checklist items to achieve this readiness milestone. General donation requests remain voluntary and separately accessible.',
   href:compliant?'donations.html':'member.html?section=compliance',
   action:compliant?'Open Donation Requests':'Complete Compliance First'
  },
  {
   key:'services',title:'Service Request Readiness',state:'ready',
   detail:'Unlocked by successful member registration and sign-in. Requests, quotations and services remain separate.',
   href:'business-support.html',action:'Open Business Support'
  },
  {
   key:'billing',title:'Subscription Up to Date',state:billingState,
   detail:billingNote,
   href:'billing.html',action:'View Billing & Membership'
  }
 ];
 return {
  milestones,
  achieved:milestones.filter(m=>isAchieved(m.state)).length,
  total:milestones.length,
  complianceCompleted:checked.size,
  complianceTotal:COMPLIANCE_KEYS.length,
  verified:milestones.every(m=>m.state!=='unknown')
 };
}
window.MzanGrowthPassport=Object.freeze({load,isAchieved,COMPLIANCE_KEYS});
})();
