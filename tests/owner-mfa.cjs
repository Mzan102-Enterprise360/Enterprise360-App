const assert=require('node:assert/strict');
module.exports=async function testOwnerMfa(browser,base) {
  // Owner can enroll using a manual key on the same phone.
  const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  const stub=`
    const owner={id:'owner-test',app_metadata:{mzanconnect_role:'owner'}};
    let factorsActive=false,assurance='aal1';
    window.supabase={createClient:()=>({
      auth:{
        getUser:async()=>({data:{user:owner},error:null}),
        mfa:{
          listFactors:async()=>({data:{totp:factorsActive?[{id:'mfa-test',status:'verified'}]:[]},error:null}),
          getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:assurance,nextLevel:factorsActive?'aal2':'aal1'},error:null}),
          enroll:async()=>({data:{id:'mfa-test',totp:{secret:'TESTPRIVATEKEY0123456'}},error:null}),
          challenge:async({factorId})=>({data:{id:'challenge-test'},error:factorId==='mfa-test'?null:new Error('Wrong factor')}),
          verify:async({factorId,challengeId,code})=>{if(factorId==='mfa-test'&&challengeId==='challenge-test'&&code==='123456'){factorsActive=true;assurance='aal2';return {error:null}}return {error:new Error('Invalid code')}}
        }
      }
    })};
  `;
  await page.route('**/supabase.min.js',route=>route.fulfill({contentType:'text/javascript',body:stub}));
  await page.goto(base+'owner-security.html');
  await page.getByText('Two-step verification is not yet enabled',{exact:false}).waitFor();
  assert.equal(await page.locator('#setupKey').isVisible(),false);
  await page.getByRole('button',{name:'Begin secure setup'}).click();
  assert.equal(await page.locator('#setupKey').inputValue(),'TESTPRIVATEKEY0123456');
  await page.locator('#enrollCode').fill('123456');
  await page.getByRole('button',{name:'Verify and activate'}).click();
  await page.getByText('Two-step verification activated',{exact:false}).waitFor();
  assert.equal(await page.locator('#setupKey').inputValue(),'');
  assert.equal(await page.locator('#securedCard').isVisible(),true);
  assert.deepEqual(errors,[]);
  await page.close();

  // An enrolled owner is sent to a challenge after entering a correct password.
  const login=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
  await login.route('**/supabase.min.js',route=>route.fulfill({contentType:'text/javascript',body:`
    const user={id:'owner-test',app_metadata:{mzanconnect_role:'owner'},user_metadata:{}};
    window.supabase={createClient:()=>({
      auth:{
        signInWithPassword:async()=>({data:{user},error:null}),
        getUser:async()=>({data:{user},error:null}),
        mfa:{
          listFactors:async()=>({data:{totp:[{id:'owner-factor',status:'verified'}]},error:null}),
          getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal1',nextLevel:'aal2'},error:null}),
          challenge:async()=>({data:{id:'challenge-2'},error:null}),
          verify:async({code})=>({error:code==='654321'?null:new Error('Incorrect')})
        }
      },
      from:()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:{user_id:user.id},error:null})})
    })};
  `}));
  await login.goto(base+'login.html');
  await login.locator('#email').fill('owner@example.invalid');
  await login.locator('#password').fill('Any-Password-For-Test');
  await login.locator('#loginButton').click();
  await login.waitForURL(url=>new URL(url).pathname.endsWith('/owner-security.html'));
  await login.getByText('Enter your authenticator code to complete owner sign-in.',{exact:false}).waitFor();
  await login.locator('#verifyCode').fill('654321');
  await login.getByRole('button',{name:'Verify owner sign-in'}).click();
  await login.getByText('Owner sign-in verified.',{exact:false}).waitFor();
  await login.close();

  // Member users and signed-out visitors cannot access owner security.
  for(const [user,destination] of [
    [{id:'member-test',app_metadata:{}},'/dashboard.html'],
    [null,'/login.html']
  ]) {
    const other=await browser.newPage({serviceWorkers:'block'});
    await other.route('**/supabase.min.js',route=>route.fulfill({contentType:'text/javascript',body:
      'window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:'+JSON.stringify(user)+'},error:null})}})}'
    }));
    await other.goto(base+'owner-security.html');
    await other.waitForURL(url=>new URL(url).pathname.endsWith(destination));
    await other.close();
  }
  console.log('PASS: owner MFA enrollment, code challenge, owner login redirection, non-owner and signed-out denial');
};