const assert = require('node:assert/strict');
module.exports = async function checkPublicRegistration(browser, base) {
  const page = await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/supabase.min.js',route=>route.fulfill({contentType:'text/javascript',body:`
    const user={id:'public-member',app_metadata:{},user_metadata:{}};
    window.supabase={createClient:()=>({
      auth:{
        getUser:async()=>({data:{user}}),
        signUp:async args=>{sessionStorage.setItem('signup',JSON.stringify(args.options.data));return {data:{user,session:null}}},
        signInWithPassword:async()=>({data:{user}}),
        signOut:async()=>({error:null})
      },
      from(table){return {
        select(){return this},eq(){return this},order(){return this},gte(){return this},lt(){return this},
        in:async()=>({data:[]}),limit:async()=>({data:[]}),
        maybeSingle:async()=>({data:{user_id:user.id,business_name:'Public Business',sector:'Services'}}),
        then(resolve){resolve({data:[]})},
        insert:async row=>{if(row.user_id!==user.id)throw Error('Wrong user');sessionStorage.setItem(table,JSON.stringify(row));return {}},
        upsert:async row=>{sessionStorage.setItem(table,JSON.stringify(row));return {}}
      }}
    })};
  `}));
  await page.goto(base+'register.html');
  await page.locator('#category').selectOption('aspiring_entrepreneur');
  await page.locator('#business').fill('Public Business');
  await page.locator('#contact').fill('Test Member');
  await page.locator('#sector').selectOption('Other');
  await page.locator('#email').fill('test@example.invalid');
  await page.locator('#password').fill('TestPassword-123');
  await page.locator('#submitButton').click();
  await page.getByText('Registration request received.',{exact:false}).waitFor();
  assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('signup')).requested_package),'Member');
  await page.goto(base+'login.html');
  await page.locator('#email').fill('test@example.invalid');
  await page.locator('#password').fill('TestPassword-123');
  await page.locator('#loginButton').click();
  await page.waitForURL('**/dashboard.html');
  await page.locator('body').waitFor({state:'visible'});
  assert.equal(await page.locator('#profilePlan').innerText(),'MzanConnect Member');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('claimed')),null);
  await page.goto(base+'member.html');
  await page.locator('#profilePanel').waitFor({state:'visible'});
  await page.locator('#business').fill('Updated Public Business');
  await page.locator('#profileForm button').click();
  await page.getByText('Business profile saved successfully.').waitFor();
  for (const section of ['compliance','growth']) {
    await page.goto(base+'member.html?section='+section);
    await page.locator('#'+section+'Panel').waitFor({state:'visible'});
  }
  await page.goto(base+'bookkeeping.html');
  await page.locator('body').waitFor({state:'visible'});
  assert.equal(await page.locator('#entry').isVisible(),true);
  await page.goto(base+'support.html');
  await page.waitForFunction(()=>!document.getElementById('refreshSupport').disabled);
  assert.equal(await page.locator('#ownerInbox').isVisible(),false);
  await page.locator('#newRequest summary').click();
  await page.locator('#message').fill('Public member support test');
  await page.locator('#send').click();
  await page.getByText('Support request saved to your account.').waitFor();
  assert.equal(await page.locator('#newRequest').evaluate(el=>el.open),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.goto(base+'login.html');
  await page.locator('#email').fill('test@example.invalid');
  await page.locator('#password').fill('TestPassword-123');
  await page.locator('#loginButton').click();
  await page.waitForURL('**/dashboard.html');
  assert.equal(await page.locator('#inviteCode').count(),0);
  await page.locator('#logoutButton').click();
  await page.waitForURL('**/login.html');
  assert.deepEqual(errors,[]);
  await page.close();
  const signedOut=await browser.newPage();
  await signedOut.route('**/supabase.min.js',route=>route.fulfill({contentType:'text/javascript',body:'window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:null}})}})}'}));
  for(const file of ['dashboard.html','member.html','bookkeeping.html','support.html','billing.html']){
    await signedOut.goto(base+file);
    await signedOut.waitForURL('**/login.html');
  }
  await signedOut.close();
  console.log('PASS: public signup, no-code login, member pages, support, retired invitation removed, logout and signed-out protection');
};
