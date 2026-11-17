const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
const server=spawn('python3',['-m','http.server','8767','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});
const base='http://127.0.0.1:8767/';

function mock(role){
 const owner=role!=='guest'&&role!=='member';
 const user=role==='guest'?null:{
  id:owner?'820a18ee-3482-4b6c-bd75-469cf198b9df':'test-member',
  email:owner?'owner@example.test':'member@example.test',
  app_metadata:{mzanconnect_role:owner?'owner':'member'}
 };
 const records=role==='empty'?[]:Array.from({length:425},(_,i)=>({
  id:'record-'+String(i).padStart(4,'0'),
  user_id:'member-'+i,
  business_name:i===0?'<script>alert(1)</script>':'Enterprise '+i,
  service_type:'donation_request',
  contact_email:'applicant'+i+'@example.test',
  details:'Support requested: '+(i%2?'Materials or supplies':'Equipment or tools')+
   '\nArea: Kathu\nEstimated value: '+(i%2?'Not provided':'R1000')+
   '\nPurpose: Equipment need '+i+'\nExpected impact: Local skills',
  status:['new','in_progress','completed','cancelled','reviewing'][i%5],
  created_at:'2026-11-14T09:00:00Z',
  updated_at:'2026-11-16T12:00:00Z'
 }));
 records.push({id:'other-service',user_id:'member-x',service_type:'business_plan',
  business_name:'Paid business plan',details:'Estimated value: R999999',status:'new',created_at:'2026-11-14T09:00:00Z'});
 return [
 '(function(){',
 'const user='+JSON.stringify(user)+';',
 'const records='+JSON.stringify(records)+';',
 'const failPage='+JSON.stringify(role==='failed')+';',
 'window.reportTest={calls:[],records};',
 'function query(){let service=null;return {',
 ' select(fields,opts){if(!fields.includes("updated_at")||opts.count!=="exact")throw Error("Missing report fields or exact count");return this},',
 ' eq(field,value){if(field!=="service_type")throw Error("Wrong filter column");service=value;return this},',
 ' lte(field,value){if(field!=="created_at"||!value)throw Error("Missing report snapshot");return this},',
 ' order(field){if(!["id","created_at"].includes(field))throw Error("Invalid sort");return this},',
 ' async range(start,end){window.reportTest.calls.push([start,end]);if(failPage&&start>=200)return {data:null,error:new Error("Page unavailable")};',
 ' const matches=records.filter(r=>r.service_type===service);return {data:matches.slice(start,end+1),count:matches.length,error:null}}',
 '}}',
 'window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user},error:null})},from:table=>{if(table!=="business_service_requests")throw Error("Wrong table");return query()}})};',
 '})();'
 ].join('\n');
}
async function scenario(browser,role){
 const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
 const errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 await page.route('**/supabase.min.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:mock(role)}));
 await page.addInitScript(()=>{window.print=()=>{window.didPrint=true}});
 await page.goto(base+'donation-report.html',{waitUntil:'domcontentloaded'});
 if(role==='guest'||role==='member'){
  await page.locator('#reportDenied').waitFor({state:'visible'});
  assert.equal(await page.locator('#reportLoaded').isVisible(),false);
  assert.equal(await page.locator('#reportPrint').isDisabled(),true);
  assert.deepEqual(await page.evaluate(()=>window.reportTest.calls),[]);
 }else if(role==='failed'){
  await page.getByText('The complete report could not be verified.',{exact:false}).waitFor();
  assert.equal(await page.locator('#reportPrint').isDisabled(),true);
  assert.equal(await page.locator('#reportLoaded').isVisible(),false);
  assert.deepEqual(await page.evaluate(()=>window.reportTest.calls),[[0,199],[200,399]]);
 }else if(role==='empty'){
  await page.getByText('Complete report ready: 0 donation requests.',{exact:false}).waitFor();
  assert.equal(await page.locator('#reportPrint').isEnabled(),true);
  await page.getByText('No donation requests have been submitted yet.').waitFor();
  assert.deepEqual(await page.evaluate(()=>window.reportTest.calls),[[0,199]]);
 }else{
  await page.getByText('Complete report ready: 425 donation requests.',{exact:false}).waitFor();
  assert.equal(await page.locator('#reportPrint').isEnabled(),true);
  assert.deepEqual(await page.evaluate(()=>window.reportTest.calls),[[0,199],[200,399],[400,599]]);
  assert.equal(await page.locator('#reportRecords .donation-entry').count(),425);
  assert.equal(await page.locator('#reportRecords').getByText('Enterprise 424').count(),1);
  assert.equal(await page.getByText('Paid business plan').count(),0,'Unrelated paid service must not leak');
  assert.match(await page.locator('#reportMetrics').innerText(),/425/);
  assert.match(await page.locator('#reportMetrics').innerText(),/213/);
  assert.match(await page.locator('#reportMetrics').innerText(),/85/);
  assert.equal(await page.locator('#reportRecords script').count(),0,'Never inject applicant HTML');
  assert.equal(await page.getByText('<script>alert(1)</script>',{exact:false}).count()>0,true);
  assert.match(await page.locator('#reportRecords .donation-entry').first().innerText(),/Contact email/);
  await page.emulateMedia({media:'print'});
  assert.equal(await page.locator('#reportLoaded').isVisible(),true);
  assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('main .no-print')).display),'none');
  await page.emulateMedia({media:'screen'});
  await page.getByRole('button',{name:'Print / Save Complete PDF'}).click();
  assert.equal(await page.evaluate(()=>window.didPrint===true),true);
 }
 assert.deepEqual(errors,[],'No browser errors: '+errors.join('; '));
 await page.close();
}
(async()=>{
 try{
  await new Promise(resolve=>setTimeout(resolve,1000));
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{for(const role of ['guest','member','failed','empty','owner'])await scenario(browser,role);}
  finally{await browser.close();}
  console.log('PASS: owner report prints all 425 requests, summary and pagination; access restricted; incomplete reports cannot print');
 }catch(error){console.error(error);process.exitCode=1;}
 finally{server.kill();}
})();
