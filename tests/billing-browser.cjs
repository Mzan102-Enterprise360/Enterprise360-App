const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawn } = require('node:child_process');
const server = spawn('python3', ['-m', 'http.server', '8765', '--bind', '127.0.0.1'], { cwd: path.resolve(__dirname, '..'), stdio: 'ignore' });
const base='http://127.0.0.1:8765/';
const clientMock = (signedIn, active, owner=false) => `window.supabase={createClient:()=>({
  auth:{getUser:async()=>({data:{user:${signedIn ? '{id:"test-user",app_metadata:{mzanconnect_role:"'+(owner?'owner':'member')+'"}}' : 'null'}},error:null}),signOut:async()=>({error:null})},
  from:(table)=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:table==="founding_memberships"?{pilot_status:"${active?'active':'inactive'}"}:{business_name:"Test Co",sector:"Services"},error:null}),order:()=>({limit:async()=>({data:[],error:null})}),then:(resolve)=>resolve({data:[],error:null})})})})})};`;
async function checkDashboardFeatures(browser){
  const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  const user={id:'owner-test',app_metadata:{mzanconnect_role:'owner'}};
  await page.route('**/supabase.min.js',route=>route.fulfill({
    status:200,contentType:'text/javascript',
    body:`const user=${JSON.stringify(user)};
    window.supabase={createClient:()=>({
      auth:{
        getUser:async()=>({data:{user}}),
        resend:async args=>{window.resendArgs=args;return {error:window.resendFails?new Error('rate limited'):null}}
      },
      from(table){
        return {
          select(){return this},
          eq(field,value){if(field!=='user_id'||value!==user.id)throw Error('Wrong account');return this},
          in(field,keys){
            if(table!=='compliance_items'||field!=='item_key')throw Error('Wrong checklist');
            const stored=JSON.parse(sessionStorage.getItem('checklist')||'{}');
            return Promise.resolve({data:keys.map(item_key=>({item_key,completed:stored[item_key]===true}))})
          },
          maybeSingle:async()=>({data:{business_name:'Test Co',sector:'Services'}}),
          then(resolve){return resolve({data:[]})},
          async upsert(rows,options){
            if(table!=='compliance_items'||options.onConflict!=='user_id,item_key'||rows.some(row=>row.user_id!==user.id))throw Error('Invalid save');
            const stored=JSON.parse(sessionStorage.getItem('checklist')||'{}');
            for(const row of rows)stored[row.item_key]=row.completed;
            sessionStorage.setItem('checklist',JSON.stringify(stored));
            return {error:null}
          }
        }
      }
    })};`
  }));
  await page.goto(base+'dashboard.html');
  await page.getByRole('link',{name:/Growth Passport/}).click();
  await page.getByLabel('Prepare funding documents').check();
  await page.getByRole('button',{name:'Save milestones'}).click();
  await page.getByText('Growth milestones saved successfully.').waitFor();
  await page.reload();
  assert.equal(await page.getByLabel('Prepare funding documents').isChecked(),true);
  await page.goto(base+'member.html?section=compliance');
  await page.getByLabel('CIPC records').check();
  await page.getByRole('button',{name:'Save checklist'}).click();
  await page.getByText('Checklist saved successfully.').waitFor();
  await page.goto(base+'member.html?section=growth');
  assert.equal(await page.getByLabel('Prepare funding documents').isChecked(),true);
  assert.equal(await page.locator('#c0').count(),0);
  await page.goto(base+'index.html#opportunities');
  const sources=page.locator('.opportunity-item:visible');
  assert.equal(await sources.count(),7);
  await page.getByLabel('Opportunity Category').selectOption('mining');
  assert.equal(await sources.count(),4);
  await page.getByLabel('Search official sources').fill('Kumba');
  assert.equal(await sources.count(),1);
  assert.match(await sources.getByRole('link').getAttribute('href'),/angloamericankumba/);
  await page.getByLabel('Search official sources').fill('missing');
  assert.equal(await sources.count(),0);
  await page.getByText('No official sources match.',{exact:false}).waitFor();
  await page.goto(base+'register.html');
  await page.getByText('Didn’t receive your confirmation email?').click();
  await page.getByLabel('Registration email address').fill('test@example.com');
  await page.getByRole('button',{name:'Resend confirmation email'}).click();
  await page.getByText('If your account still needs confirmation',{exact:false}).waitFor();
  assert.deepEqual(await page.evaluate(()=>window.resendArgs),{
    type:'signup',email:'test@example.com',options:{emailRedirectTo:base+'login.html'}
  });
  await page.evaluate(()=>{window.resendFails=true});
  await page.getByRole('button',{name:'Resend confirmation email'}).click();
  await page.getByText('The confirmation request could not be completed.',{exact:false}).waitFor();
  assert.deepEqual(pageErrors,[]);
  await page.close();
  console.log('PASS: owner Growth Passport saves and reloads, compliance stays separate, official sources filter, and confirmation resend handles success and failure');
}

async function checkVerifiedReceipts(browser){
  const page=await browser.newPage();
  await page.route('**/supabase.min.js',route=>route.fulfill({
    status:200,contentType:'text/javascript',
    body:`const user={id:'owner-test',app_metadata:{mzanconnect_role:'owner'}};
    window.supabase={createClient:()=>({
      auth:{getUser:async()=>({data:{user}})},
      functions:{invoke:async (name, options)=>{
        window.checkoutRequest={name,body:options.body};
        return {data:{redirect_url:'https://example.com/wrong-host'}}
      }},
      from(table){
        if(table!=='membership_payments')throw Error('Unexpected payment query');
        return {
          select(fields){if(!fields.includes('membership_receipts('))throw Error('Missing receipts');return this},
          eq(field,value){if(field!=='user_id'||value!==user.id)throw Error('Wrong account');return this},
          order(){return this},
          async limit(){
            const created_at='2026-11-11T09:00:00Z';
            const common={amount_cents:19900,currency:'ZAR',created_at,merchant_reference:'TEST-PAYMENT'};
            const receipt={receipt_number:'TEST-VERIFIED-RECEIPT',issued_at:created_at};
            return {data:[
              {...common,status:'complete',verified_at:created_at,membership_receipts:receipt},
              {...common,status:'complete',verified_at:null,membership_receipts:receipt},
              {...common,status:'pending',verified_at:created_at,membership_receipts:receipt},
              {...common,status:'complete',verified_at:created_at,is_test:true,membership_receipts:{...receipt,receipt_number:'TEST-SANDBOX-RECEIPT'}}
            ]}
          }
        }
      }
    })};`
  }));
  await page.addInitScript(()=>{window.print=()=>{window.printed=true}});
  await page.goto(base+'billing.html');
  const buttons=page.locator('#paymentHistory').getByRole('button',{name:'View / Print Receipt'});
  await buttons.first().waitFor();
  assert.equal(await buttons.count(),1);
  await buttons.first().click();
  await page.getByText('TEST-VERIFIED-RECEIPT',{exact:false}).waitFor();
  await page.getByRole('button',{name:'Print / Save receipt as PDF'}).click();
  assert.equal(await page.evaluate(()=>window.printed),true);
  await page.getByRole('button',{name:'Close receipt'}).click();
  assert.equal(await page.locator('#receiptPrint').isVisible(),false);
  await page.locator('#testPaymentHistory').getByRole('button',{name:'View / Print Receipt'}).click();
  await page.getByText('TEST RECEIPT — no money was collected.').waitFor();
  await page.getByLabel('Plan to test').selectOption('premium');
  await page.getByRole('button',{name:'Start test checkout'}).click();
  await page.getByText('Yoco returned an invalid link.').waitFor();
  const request=await page.evaluate(()=>window.checkoutRequest);
  assert.equal(request.name,'mzan-yoco-sandbox');
  assert.equal(request.body.plan,'premium');
  assert.match(request.body.attempt,/^[a-f0-9-]{36}$/i);
  await page.close();
  console.log('PASS: verified receipt opens and prints, pending or unverified payments have no receipt');
}

async function main(){
  await import('./yoco-sandbox.mjs');
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    for(const [signedIn,active,expected,owner] of [[true,true,'billing.html',false],[false,false,'login.html',false],[true,false,'login.html',false],[true,false,'billing.html',true]]){
      const page=await browser.newPage();
      await page.route('**/supabase.min.js',async route=>route.fulfill({status:200,contentType:'text/javascript',body:clientMock(signedIn,active,owner)}));
      page.on('pageerror',err=>console.error('Browser page error:',err.message));
      page.on('console',msg=>{if(msg.type()==='error')console.error('Browser console:',msg.text())});
      await page.goto(base+'billing.html',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(expectedPath=>location.pathname.endsWith(expectedPath),expected,{timeout:10000}).catch(async e=>{console.error('Navigation diagnostic',{signedIn,active,owner,expected,actual:page.url(),body:await page.locator('body').innerText().catch(()=>'<unavailable>')});throw e});
      if(signedIn&&(active||owner)){
        await page.locator('body').waitFor({state:'visible'});
        assert.match(await page.locator('#status').innerText(),owner?/MzanConnect Owner/:/Founding Member/);
        assert.match(await page.locator('main').innerText(),/No payment is required/);
        assert.equal(await page.locator('form').count(),0);
        assert.equal(await page.locator('#yocoSandbox').isVisible(),owner);
        await page.getByRole('link',{name:/Back to dashboard/}).click();
        await page.waitForURL('**/dashboard.html');
      }
      await page.close();
    }
    const page=await browser.newPage({viewport:{width:375,height:812}});
    await page.route('**/supabase.min.js',async route=>route.fulfill({status:200,contentType:'text/javascript',body:clientMock(true,true)}));
    await page.goto(base+'dashboard.html',{waitUntil:'domcontentloaded'});
    await page.locator('body').waitFor({state:'visible'});
    assert.equal(await page.locator('.grid .tile').count(),6,'dashboard should show six navigation tiles including Bookkeeping');
    await page.getByRole('link',{name:/Billing & Membership/}).click();
    await page.waitForURL('**/billing.html');
    await page.locator('body').waitFor({state:'visible'});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile horizontal overflow');
    console.log('PASS: authenticated billing, signed-out redirect, inactive-founder redirect, dashboard navigation, mobile layout, no checkout');
    await page.close();
    await checkDashboardFeatures(browser);
    await checkVerifiedReceipts(browser);
  }finally{await browser.close()}
}
(async()=>{try{await new Promise(r=>setTimeout(r,1000));await main()}catch(e){console.error(e);process.exitCode=1}finally{server.kill()}})();
