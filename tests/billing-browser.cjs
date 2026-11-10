const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawn } = require('node:child_process');
const server = spawn('python3', ['-m', 'http.server', '8765', '--bind', '127.0.0.1'], { cwd: path.resolve(__dirname, '..'), stdio: 'ignore' });
const base='http://127.0.0.1:8765/';
const clientMock = (signedIn, active) => `window.supabase={createClient:()=>({
  auth:{getUser:async()=>({data:{user:${signedIn ? '{id:"test-user"}' : 'null'}},error:null}),signOut:async()=>({error:null})},
  from:(table)=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:table==="founding_memberships"?{pilot_status:"${active?'active':'inactive'}"}:{business_name:"Test Co",sector:"Services"},error:null}),then:(resolve)=>resolve({data:[],error:null})})})})})};`;
async function main(){
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    for(const [signedIn,active,expected] of [[true,true,'billing.html'],[false,false,'login.html'],[true,false,'dashboard.html']]){
      const page=await browser.newPage();
      await page.route('**/supabase.min.js',async route=>route.fulfill({status:200,contentType:'text/javascript',body:clientMock(signedIn,active)}));
      await page.goto(base+'billing.html',{waitUntil:'domcontentloaded'});
      await page.waitForURL(url=>url.pathname.endsWith(expected),{timeout:10000});
      if(signedIn&&active){
        await page.locator('body').waitFor({state:'visible'});
        assert.match(await page.locator('#status').innerText(),/Founding Member/);
        assert.match(await page.locator('main').innerText(),/No payment is required/);
        assert.equal(await page.locator('form').count(),0);
        await page.getByRole('link',{name:/Back to dashboard/}).click();
        await page.waitForURL('**/dashboard.html');
      }
      await page.close();
    }
    const page=await browser.newPage({viewport:{width:375,height:812}});
    await page.route('**/supabase.min.js',async route=>route.fulfill({status:200,contentType:'text/javascript',body:clientMock(true,true)}));
    await page.goto(base+'dashboard.html',{waitUntil:'domcontentloaded'});
    await page.locator('body').waitFor({state:'visible'});
    assert.equal(await page.locator('.grid .tile').count(),5);
    await page.getByRole('link',{name:/Billing & Membership/}).click();
    await page.waitForURL('**/billing.html');
    await page.locator('body').waitFor({state:'visible'});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile horizontal overflow');
    console.log('PASS: authenticated billing, signed-out redirect, inactive-founder redirect, dashboard navigation, mobile layout, no checkout');
    await page.close();
  }finally{await browser.close()}
}
(async()=>{try{await new Promise(r=>setTimeout(r,1000));await main()}catch(e){console.error(e);process.exitCode=1}finally{server.kill()}})();
