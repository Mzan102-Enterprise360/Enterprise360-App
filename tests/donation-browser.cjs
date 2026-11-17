const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
const server=spawn('python3',['-m','http.server','8766','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});
const base='http://127.0.0.1:8766/';
function mockClient(role){
 const user=role==='guest'?null:{id:role==='owner'?'820a18ee-3482-4b6c-bd75-469cf198b9df':'test-member',email:role==='owner'?'owner@example.test':'member@example.test',app_metadata:{mzanconnect_role:role}};
 const records=[
  {id:'11111111-1111-4111-8111-111111111111',user_id:'test-member',business_name:'Kathu Catering Collective',service_type:'donation_request',contact_email:'member@example.test',details:'Support requested: Equipment or tools\nArea: Kathu\nPurpose: Oven for small enterprise',status:'new',created_at:'2026-11-17T10:00:00Z'},
  {id:'22222222-2222-4222-8222-222222222222',user_id:'other-member',business_name:'Other member',service_type:'business_plan',contact_email:'other@example.test',details:'Paid business plan',status:'new',created_at:'2026-11-17T09:00:00Z'}
 ];
 return [
 '(function(){',
 'const user='+JSON.stringify(user)+';',
 'const records='+JSON.stringify(records)+';',
 'window.testDb={records,updates:[]};',
 'function query(){const filters={};let updating=null;return {',
 ' select(){return this},eq(key,value){filters[key]=value;return this},order(){return this},',
 ' async limit(){return {data:records.filter(r=>Object.entries(filters).every(([k,v])=>r[k]===v)).slice(0,100),error:null}},',
 ' insert(row){if(row.service_type!=="donation_request"||!row.consent_confirmed||row.user_id!==user.id)throw Error("Invalid donation submission");records.push({...row,id:"33333333-3333-4333-8333-333333333333",status:"new",created_at:"2026-11-17T10:01:00Z"});return Promise.resolve({error:null})},',
 ' update(changes){updating=changes;return this},',
 ' async single(){const record=records.find(r=>Object.entries(filters).every(([k,v])=>r[k]===v));if(!record)return {data:null,error:new Error("No matching record")};if(!user||user.app_metadata.mzanconnect_role!=="owner")return {data:null,error:new Error("Not authorised")};Object.assign(record,updating);window.testDb.updates.push({id:record.id,...updating});return {data:{id:record.id,status:record.status},error:null}}',
 '}}',
 'window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user},error:null})},from:table=>{if(table!=="business_service_requests")throw Error("Unexpected table "+table);return query()}})};',
 '})();'
 ].join('\n');
}
async function scenario(browser,role){
 const page=await browser.newPage({viewport:{width:390,height:780},serviceWorkers:'block'});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/supabase.min.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:mockClient(role)}));
 await page.addInitScript(()=>{window.print=()=>{window.didPrint=true}});
 await page.goto(base+'donations.html',{waitUntil:'domcontentloaded'});
 if(role==='guest'){
  await page.locator('#donationSignIn').waitFor({state:'visible'});
  assert.equal(await page.locator('#donationFormPanel').isVisible(),false);
  assert.equal(await page.locator('#donationOwnerPanel').isVisible(),false);
 } else if(role==='member'){
  await page.locator('#donationFormPanel').waitFor({state:'visible'});
  assert.equal(await page.locator('#donationOwnerPanel').isVisible(),false);
  await page.locator('#donationApplicant').fill('Member Food Enterprise');
  await page.locator('#donationType').selectOption('Equipment or tools');
  await page.locator('#donationLocation').fill('Kathu');
  await page.locator('#donationAmount').fill('15000');
  await page.locator('#donationPurpose').fill('Oven to expand business output');
  await page.locator('#donationImpact').fill('Three local jobs');
  await page.locator('#donationConsent').check();
  await page.getByRole('button',{name:'Submit Donation Request'}).click();
  await page.locator('#donationHistory').getByText('Member Food Enterprise',{exact:false}).waitFor();
  assert.equal(await page.evaluate(()=>window.testDb.records.length),3);
  assert.equal(await page.locator('#donationHistoryFilters button').count(),4,'Show status buttons even before requests');
  assert.match(await page.locator('#donationCountSubmitted').innerText(),/2/);
  await page.locator('[data-donation-stage="submitted"]').click();
  assert.equal(await page.locator('#donationHistory article').count(),2);
  assert.equal(await page.locator('[data-donation-stage="submitted"]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-donation-stage="in_progress"]').click();
  await page.getByText('No requests at this stage yet.').waitFor();
  assert.equal(await page.locator('[data-donation-stage="in_progress"]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-donation-stage="completed"]').click();
  await page.getByText('No requests at this stage yet.').waitFor();
  await page.locator('[data-donation-stage="all"]').click();
  assert.equal(await page.locator('#donationHistory .history-stages span').count(),6,'Member requests have progress markers');
  const saved=await page.evaluate(()=>window.testDb.records.at(-1));
  assert.match(saved.details,/Estimated value: R15000/);
  assert.equal(saved.status,'new');
 } else {
  await page.locator('#donationOwnerPanel').waitFor({state:'visible'});
  await page.getByText('Kathu Catering Collective',{exact:true}).waitFor();
  assert.equal(await page.getByText('Paid business plan',{exact:false}).count(),0);
  assert.match(await page.locator('#donationOwnerSummary').innerText(),/1 awaiting action/);
  await page.locator('#donationOwnerList').getByRole('button',{name:'Review completed'}).click();
  await page.getByText('0 awaiting action',{exact:false}).waitFor();
  const updated=await page.evaluate(()=>window.testDb.updates.at(-1));
  assert.equal(updated.status,'completed');
  await page.locator('#donationOwnerFilter').selectOption('open');
  await page.getByText('No matching donation requests.').waitFor();
  await page.locator('#donationOwnerFilter').selectOption('all');
  const completeReport=page.getByRole('link',{name:'Print Complete Consolidated Report'});
  assert.equal(await completeReport.getAttribute('href'),'./donation-report.html');
 }
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Mobile overflow');
 assert.deepEqual(errors,[],'No uncaught browser errors: '+errors.join('; '));
 await page.close();
}
(async()=>{try{
 await new Promise(resolve=>setTimeout(resolve,1200));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{for(const role of ['guest','member','owner'])await scenario(browser,role)}
 finally{await browser.close()}
 console.log('PASS: donation access, private submission, owner filters, status and printing');
}catch(err){console.error(err);process.exitCode=1}finally{server.kill()}})();
