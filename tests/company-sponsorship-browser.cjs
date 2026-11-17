const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const server=spawn('python3',['-m','http.server','8771','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});
const base='http://127.0.0.1:8771/';

function mock(role){
 const owner=role==='owner';
 const member=role==='member'||role==='founder';
 const user=role==='guest'?null:{
  id:owner?'820a18ee-3482-4b6c-bd75-469cf198b9df':'11111111-1111-4111-8111-111111111111',
  email:owner?'owner@example.test':'member@example.test',
  app_metadata:{mzanconnect_role:owner?'owner':'member'}
 };
 const existing=owner?[{
  id:'aaaaaaaa-1111-4111-8111-111111111111',
  user_id:'11111111-1111-4111-8111-111111111111',
  applicant_email:'member@example.test',
  company_name:'Kathu Sponsor Co',
  company_contact_name:'Company Contact',
  company_contact_email:'sponsor@example.test',
  company_contact_phone:'0700000000',
  requested_months:6,request_note:'Enterprise Development',
  status:'submitted',created_at:'2026-11-17T10:00:00Z'
 }]:[];
 return [
 '(function(){',
 'const user='+JSON.stringify(user)+';',
 'const rows='+JSON.stringify(existing)+';',
 'window.mockFunding={rows,updates:[],checkoutCalls:0};',
 'window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user},error:null})},',
 'from(table){let filters={};let pendingUpdate=null;return {',
 ' select(){return this},eq(k,v){filters[k]=v;return this},gt(){return this},order(){return this},',
 ' async maybeSingle(){if(table!=="founding_memberships")throw Error("Unexpected single on "+table);return {data:'+(role==='founder'?'{pilot_status:"active"}':'null')+',error:null}},',
 ' async limit(){',
 '  if(table==="company_membership_sponsorship_requests"){const data=rows.filter(x=>owner||x.user_id===user.id).filter(x=>Object.entries(filters).every(([k,v])=>x[k]===v));return {data,error:null}},',
 '  if(["membership_payments","membership_subscriptions"].includes(table))return {data:[],error:null};',
 '  throw Error("Unknown query "+table)',
 ' },',
 ' async insert(payload){',
 '   if(table!=="company_membership_sponsorship_requests"||owner||!user)throw Error("Bad sponsor submission");',
 '   if(payload.user_id!==user.id||payload.applicant_email!==user.email||payload.consent_confirmed!==true)throw Error("Unauthorized sponsor submission");',
 '   if(rows.some(x=>x.user_id===user.id&&x.status==="submitted"))return {error:{code:"23505",message:"Already open"}};',
 '   rows.push({...payload,id:"bbbbbbbb-1111-4111-8111-111111111111",status:"submitted",created_at:"2026-11-17T14:00:00Z"});',
 '   return {error:null};',
 ' },',
 ' update(p){if(table!=="company_membership_sponsorship_requests"||!owner)throw Error("Members cannot update sponsorship state");pendingUpdate=p;return this},',
 ' async single(){',
 '  const row=rows.find(x=>Object.entries(filters).every(([k,v])=>x[k]===v));',
 '  if(!row||!pendingUpdate)return {data:null,error:{message:"Not found"}};',
 '  Object.assign(row,pendingUpdate);window.mockFunding.updates.push({id:row.id,...pendingUpdate});',
 '  return {data:{id:row.id,status:row.status},error:null};',
 ' }',
 '}},functions:{invoke:async()=>{window.mockFunding.checkoutCalls++;return {data:{redirect_url:"https://c.yoco.com/not-used"}}}}',
 '})};',
 '})();'
 ].join('\n');
}
async function scene(browser,role){
 const page=await browser.newPage({viewport:{width:390,height:820},serviceWorkers:'block'});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/supabase.min.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:mock(role)}));
 await page.route('**/functions/v1/mzan-yoco-live/status',route=>route.fulfill({status:200,contentType:'application/json',body:'{"ready":true}'}));
 await page.goto(base+'billing.html',{waitUntil:'domcontentloaded'});
 if(role==='guest'){
  await page.waitForURL('**/login.html');
  await page.close();return;
 }
 await page.locator('body').waitFor({state:'visible'});
 if((await page.locator('#fundingSelf').count())!==1)throw Error('Funding controls missing for '+role+'; url='+page.url()+'; errors='+errors.join('; ')+'; body='+(await page.locator('body').innerText()).slice(0,450));
 assert.equal(await page.locator('#fundingSelf').isChecked(),true);
 assert.equal(await page.locator('#fundingCompany').count(),1);
 await page.locator('#fundingCompany').check();
 if(role==='owner'){
  await page.locator('#ownerSponsorInbox').waitFor({state:'visible'});
  assert.equal(await page.locator('#sponsorMembership').isVisible(),false);
  assert.equal(await page.locator('#liveMembership').isVisible(),false);
  await page.getByText('Kathu Sponsor Co',{exact:true}).waitFor();
  await page.getByText('Member contact email: member@example.test').waitFor();
  await page.locator('#ownerSponsorInbox').getByRole('button',{name:/Company contacted for Kathu Sponsor Co/}).click();
  await page.getByText('Company contacted',{exact:true}).waitFor();
  const updates=await page.evaluate(()=>window.mockFunding.updates);
  assert.equal(updates.length,1);
  assert.equal(updates[0].status,'company_contacted');
  assert.equal(await page.evaluate(()=>window.mockFunding.checkoutCalls),0);
 }else {
  await page.locator('#sponsorMembership').waitFor({state:'visible'});
  assert.equal(await page.locator('#liveMembership').isVisible(),false,'Sponsor route must hide self-pay checkout');
  await page.locator('#sponsorCompany').fill('Northern Cape Enterprise Fund');
  await page.locator('#sponsorContactName').fill('Programme Officer');
  await page.locator('#sponsorEmail').fill('development@example.test');
  await page.locator('#sponsorPhone').fill('0731234567');
  await page.locator('#sponsorMonths').selectOption('3');
  await page.locator('#sponsorNote').fill('Supporting local suppliers');
  await page.locator('#sponsorConsent').check();
  await page.getByRole('button',{name:'Submit Sponsorship Request'}).click();
  await page.getByText('Northern Cape Enterprise Fund',{exact:true}).waitFor();
  const stored=await page.evaluate(()=>window.mockFunding.rows);
  assert.equal(stored.length,1);
  assert.equal(stored[0].status,'submitted','Member cannot self-confirm funding');
  assert.equal(stored[0].requested_months,3);
  assert.equal(stored[0].company_contact_email,'development@example.test');
  assert.equal(stored[0].applicant_email,'member@example.test');
  assert.equal(await page.locator('#sponsorForm').isVisible(),false,'Second open request must be blocked');
  assert.equal(await page.evaluate(()=>window.mockFunding.checkoutCalls),0,'Sponsorship request never charges a company');
  await page.locator('#fundingSelf').check();
  assert.equal(await page.locator('#sponsorMembership').isVisible(),false);
  assert.equal(await page.locator('#liveMembership').isVisible(),role==='member','Self-payment only shows for eligible member');
 }
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No phone-width overflow');
 assert.deepEqual(errors,[],'No browser exceptions: '+errors.join('; '));
 await page.close();
}
(async()=>{try{
 await new Promise(resolve=>setTimeout(resolve,1100));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{for(const role of ['guest','member','founder','owner'])await scene(browser,role)}
 finally{await browser.close()}
 console.log('PASS: self-pay vs company-funded options, sponsor request, owner review, no billing activation');
}catch(error){console.error(error);process.exitCode=1}finally{server.kill()}})();
