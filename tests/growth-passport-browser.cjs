const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
const server=spawn('python3',['-m','http.server','8769','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});
const base='http://127.0.0.1:8769/';
function clientCode(role){
 const user=role==='anon'?null:{
  id:role==='owner'?'820a18ee-3482-4b6c-bd75-469cf198b9df':'11111111-1111-4111-8111-111111111111',
  email:'test@example.com',app_metadata:{mzanconnect_role:role==='owner'?'owner':'member'}
 };
 return [
 '(function(){',
 'const user='+JSON.stringify(user)+';',
 'const state={linked:false,checks:[],founder:false,active:false,verified:false,testPayment:false,submitted:null};',
 'window.growthTestState=state;',
 'window.supabase={createClient:()=>({',
 ' auth:{getUser:async()=>({data:{user},error:null})},',
 ' from(table){',
 '  return {',
 '   select(){return this},eq(){return this},gt(){return this},order(){return this},',
 '   in(field,keys){if(table!=="compliance_items"||field!=="item_key")throw Error("Wrong checklist");return Promise.resolve({data:keys.map(item_key=>({item_key,completed:state.checks.includes(item_key)})),error:null})},',
 '   async maybeSingle(){if(table!=="founding_memberships")throw Error("Wrong single");return {data:state.founder?{pilot_status:"active"}:null,error:null}},',
 '   async limit(){',
 '    if(table==="smme_survey_2026_responses")return {data:state.linked?[{id:"linked"}]:[],error:null};',
 '    if(table==="membership_subscriptions")return {data:state.active?[{status:"active",current_period_end:"2027-11-17T12:00:00Z"}]:[],error:null};',
 '    if(table==="membership_payments")return {data:state.verified?[{status:"complete",verified_at:"2026-11-17T12:00:00Z",is_test:state.testPayment}]:[],error:null};',
 '    throw Error("Unknown query "+table)',
 '   },',
 '   insert(record){if(table!=="smme_survey_2026_responses")throw Error("Wrong insert");state.submitted=record;return Promise.resolve({error:null})}',
 '  }',
 ' }',
 '})};',
 '})();'
 ].join('\n');
}
async function visit(browser,role,target){
 const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/supabase.min.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:clientCode(role)}));
 await page.goto(base+(target||'member.html?section=growth'),{waitUntil:'domcontentloaded'});
 return {page,errors};
}
async function readiness(browser){
 const {page,errors}=await visit(browser,'member');
 await page.getByText('1 of 5 readiness milestones achieved').waitFor();
 assert.equal(await page.locator('.growth-card').count(),5);
 assert.equal(await page.locator('#growthChecks input[type=checkbox]').count(),0);
 await page.locator('.growth-card').filter({hasText:'Donation Request Ready'}).getByText('Complete prerequisites').waitFor();
 await page.evaluate(()=>{growthTestState.linked=true});
 await page.getByRole('button',{name:'Refresh My Readiness'}).click();
 await page.getByText('2 of 5 readiness milestones achieved').waitFor();
 await page.evaluate(()=>{growthTestState.checks=['c0','c1','c2','c3','c4','c5']});
 await page.getByRole('button',{name:'Refresh My Readiness'}).click();
 await page.getByText('4 of 5 readiness milestones achieved').waitFor();
 await page.locator('.growth-card').filter({hasText:'Donation Request Ready'}).getByRole('link',{name:'Open Donation Requests'}).waitFor();
 await page.evaluate(()=>{growthTestState.active=true});
 await page.getByRole('button',{name:'Refresh My Readiness'}).click();
 await page.getByText('4 of 5 readiness milestones achieved').waitFor();
 await page.getByText('An active period appears in your account, but its live payment verification could not be confirmed.').waitFor();
 await page.evaluate(()=>{growthTestState.verified=true;growthTestState.testPayment=true});
 await page.getByRole('button',{name:'Refresh My Readiness'}).click();
 await page.getByText('4 of 5 readiness milestones achieved').waitFor();
 await page.evaluate(()=>{growthTestState.testPayment=false});
 await page.getByRole('button',{name:'Refresh My Readiness'}).click();
 await page.getByText('5 of 5 readiness milestones achieved').waitFor();
 await page.evaluate(()=>{growthTestState.active=false});
 await page.getByRole('button',{name:'Refresh My Readiness'}).click();
 await page.getByText('4 of 5 readiness milestones achieved').waitFor();
 assert.deepEqual(errors,[]);
 await page.close();
}
async function exemptions(browser){
 const a=await visit(browser,'owner');
 await a.page.getByText('2 of 5 readiness milestones achieved').waitFor();
 await a.page.getByText('Owner account: membership payment is not required.',{exact:false}).waitFor();
 assert.deepEqual(a.errors,[]);
 await a.page.close();
 const b=await visit(browser,'member');
 await b.page.getByText('1 of 5 readiness milestones achieved').waitFor();
 await b.page.evaluate(()=>{growthTestState.founder=true});
 await b.page.getByRole('button',{name:'Refresh My Readiness'}).click();
 await b.page.getByText('2 of 5 readiness milestones achieved').waitFor();
 await b.page.getByText('Active complimentary founding membership.',{exact:false}).waitFor();
 await b.page.close();
}
async function answerSurvey(page){
 await page.locator('[name=area]').selectOption('kathu');
 await page.locator('[name=sector]').selectOption('services');
 await page.locator('[name=status][value=fully]').check();
 await page.locator('[name=support][value=none]').check();
 await page.locator('[name=provider]').selectOption('none');
 await page.locator('[name=equipment_use][value=none]').check();
 await page.locator('[name=equipment_type]').selectOption('none');
 await page.locator('[name=premises][value=home]').check();
 await page.locator('[name=followup][value=none]').check();
 await page.locator('[name=priority]').selectOption('systems');
 await page.locator('[name=support_interest][value=no]').check();
 await page.locator('#consent').check();
}
async function surveys(browser){
 const a=await visit(browser,'member','survey.html?from=growth');
 await a.page.locator('#passportSurveyLink').waitFor({state:'visible'});
 assert.equal(await a.page.locator('#passportSurveyConsent').isChecked(),false);
 await answerSurvey(a.page);
 await a.page.getByRole('button',{name:'Submit survey'}).click();
 await a.page.getByText('Thank you. Your survey response has been received.',{exact:false}).waitFor();
 assert.equal(await a.page.evaluate(()=>growthTestState.submitted.member_user_id),undefined);
 await a.page.close();
 const b=await visit(browser,'member','survey.html?from=growth');
 await b.page.locator('#passportSurveyLink').waitFor({state:'visible'});
 await answerSurvey(b.page);
 await b.page.locator('#passportSurveyConsent').check();
 await b.page.getByRole('button',{name:'Submit survey'}).click();
 await b.page.getByText('Your survey is linked to your Growth Passport.',{exact:false}).waitFor();
 assert.equal(await b.page.evaluate(()=>growthTestState.submitted.member_user_id),'11111111-1111-4111-8111-111111111111');
 await b.page.close();
 const c=await visit(browser,'anon','survey.html');
 assert.equal(await c.page.locator('#passportSurveyLink').isVisible(),false);
 await answerSurvey(c.page);
 await c.page.getByRole('button',{name:'Submit survey'}).click();
 await c.page.getByText('Thank you. Your survey response has been received.',{exact:false}).waitFor();
 assert.equal(await c.page.evaluate(()=>growthTestState.submitted.member_user_id),undefined);
 await c.page.close();
}
(async()=>{try{
 await new Promise(resolve=>setTimeout(resolve,1100));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{await readiness(browser);await exemptions(browser);await surveys(browser);}
 finally{await browser.close();}
 console.log('PASS: live Growth Passport, verified subscription, exemptions and optional survey link');
}catch(error){console.error(error);process.exitCode=1;}finally{server.kill()}})();
