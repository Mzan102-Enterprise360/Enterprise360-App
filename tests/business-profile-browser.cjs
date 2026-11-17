const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
const server=spawn('python3',['-m','http.server','8770','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});
const base='http://127.0.0.1:8770/';
const mock=String.raw`(()=>{
 const newMember=new URLSearchParams(location.search).get('simulateNew')==='1';
 const user={id:'11111111-1111-4111-8111-111111111111',email:'member@example.test',app_metadata:{mzanconnect_role:'member'},user_metadata:newMember?{
  business_name:'New Signup Trading',registered_name:'New Signup (Pty) Ltd',
  registration_number:'2026/111111/07',contact_name:'Signup Member',
  contact_phone:'0711111111',business_sector:'Retail and Trading',
  province:'Northern Cape',district:'John Taolo Gaetsewe',municipality:'Gamagara'
 }:{} };
 const initial={
   business_name:'Hair dress',contact_name:'Test Member',sector:'Mining and Industrial Services',
   region:'Kathu legacy location',description:'Legacy notes must be preserved'
 };
 const state={profile:JSON.parse(sessionStorage.getItem('mock-business-profile')||'null')||(newMember?null:initial),
  signedUp:null,lastUpdate:null,inserted:null};
 window.mockBusiness=state;
 function tableQuery(table){
  return {
   select(){return this},eq(){return this},gt(){return this},order(){return this},
   async maybeSingle(){
    if(table==='business_profiles')return {data:state.profile,error:null};
    if(table==='founding_memberships')return {data:null,error:null};
    throw Error('Unexpected maybeSingle '+table);
   },
   in(key,keys){if(table!=='compliance_items')throw Error('Wrong checklist');return Promise.resolve({data:[],error:null})},
   limit:async()=>({data:[],error:null}),
   range:async()=>({data:[],error:null}),
   then(resolve,reject){return Promise.resolve({data:[],error:null}).then(resolve,reject)},
   async upsert(row,options){
    if(table!=='business_profiles'||options?.onConflict!=='user_id')throw Error('Unexpected business profile upsert');
    state.lastUpdate=row;
    if(row.user_id!==user.id)throw Error('Cross-member profile write');
    state.profile={...state.profile,...row};
    sessionStorage.setItem('mock-business-profile',JSON.stringify(state.profile));
    return {error:null};
   },
   async insert(row){
    if(table!=='business_profiles'||row.user_id!==user.id)throw Error('Unexpected insert');
    state.inserted=row;state.profile=row;sessionStorage.setItem('mock-business-profile',JSON.stringify(row));
    return {error:null};
   }
  }
 }
 window.supabase={createClient:()=>({
  auth:{
   getUser:async()=>({data:{user},error:null}),
   signUp:async options=>{
    state.signedUp=options;
    return {data:{session:{access_token:'fake'},user},error:null};
   }
  },
  from:table=>tableQuery(table)
 })};
})();
`;
async function open(browser,url){
 const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/supabase.min.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:mock}));
 await page.addInitScript(()=>{window.print=()=>{window.printRequested=true}});
 await page.goto(base+url,{waitUntil:'domcontentloaded'});
 return {page,errors};
}
async function member(browser){
 const {page,errors}=await open(browser,'member.html');
 await page.locator('#registeredName').waitFor({state:'visible'});
 assert.equal(await page.locator('#business').inputValue(),'Hair dress');
 assert.equal(await page.locator('#contact').inputValue(),'Test Member');
 assert.equal(await page.locator('#sector').inputValue(),'Mining and Industrial Services');
 assert.equal(await page.locator('#registeredName').count(),1);
 assert.equal(await page.getByText('Business Registered Name',{exact:true}).count(),1);
 await page.locator('#registeredName').fill('Example Holdings (Pty) Ltd');
 await page.locator('#registrationNumber').fill('2026/123456/07');
 await page.locator('#business').fill('Example Hair Studio');
 await page.locator('#contactPhone').fill('073 111 2233');
 await page.locator('#contactEmail').fill('hello@example.test');
 await page.locator('#sector').selectOption('Hairdressing, Beauty and Wellness');
 await page.locator('#province').selectOption('Northern Cape');
 await page.locator('#district').selectOption('John Taolo Gaetsewe');
 assert.deepEqual(await page.locator('#municipality option').allTextContents(),[
   'Select local / metropolitan municipality','Ga-Segonyana','Gamagara','Joe Morolong','Other / Not listed (specify)'
 ]);
 await page.locator('#municipality').selectOption('Gamagara');
 await page.getByRole('button',{name:'Save Business Profile'}).click();
 await page.getByText('Business profile saved successfully.',{exact:false}).waitFor();
 const state=await page.evaluate(()=>window.mockBusiness);
 assert.equal(state.profile.business_name,'Example Hair Studio');
 assert.equal(state.profile.registered_name,'Example Holdings (Pty) Ltd');
 assert.equal(state.profile.registration_number,'2026/123456/07');
 assert.equal(state.profile.sector,'Hairdressing, Beauty and Wellness');
 assert.equal(state.profile.province,'Northern Cape');
 assert.equal(state.profile.district,'John Taolo Gaetsewe');
 assert.equal(state.profile.municipality,'Gamagara');
 assert.equal(state.profile.contact_phone,'073 111 2233');
 assert.equal(state.profile.contact_email,'hello@example.test');
 assert.equal(state.profile.region,'Kathu legacy location');
 assert.equal(state.profile.description,'Legacy notes must be preserved');
 assert.equal(state.lastUpdate.region,'Kathu legacy location','Legacy region must be retained on save');
 assert.equal(state.lastUpdate.description,'Legacy notes must be preserved','Legacy description must be retained on save');
 await page.reload();
 await page.locator('#municipality').waitFor({state:'visible'});
 assert.equal(await page.locator('#municipality').inputValue(),'Gamagara');
 assert.equal(await page.locator('#sector').inputValue(),'Hairdressing, Beauty and Wellness');
 await page.evaluate(()=>{
  const profile={...mockBusiness.profile,sector:'Funeral and Memorial Services'};
  sessionStorage.setItem('mock-business-profile',JSON.stringify(profile));
 });
 await page.reload();
 await page.locator('#sector').waitFor({state:'visible'});
 assert.equal(await page.locator('#sector').inputValue(),'__other__','Unlisted existing sector must be preserved');
 assert.equal(await page.locator('#sectorOther').inputValue(),'Funeral and Memorial Services');
 assert.equal(await page.locator('#sectorOther').isVisible(),true);
 await page.getByRole('button',{name:'Save Business Profile'}).click();
 await page.getByText('Business profile saved successfully.',{exact:false}).waitFor();
 assert.equal(await page.evaluate(()=>mockBusiness.profile.sector),'Funeral and Memorial Services');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No mobile overflow');
 assert.deepEqual(errors,[],'No browser errors');
 await page.close();
}
async function register(browser){
 const {page,errors}=await open(browser,'register.html');
 await page.locator('#category').selectOption('business_owner');
 await page.locator('#business').fill('Sample Trading');
 await page.locator('#registeredName').fill('Sample Registered (Pty) Ltd');
 await page.locator('#registrationNumber').fill('2026/987654/07');
 await page.locator('#contact').fill('Sample Applicant');
 await page.locator('#contactPhone').fill('0720001234');
 await page.locator('#sector').selectOption('Retail and Trading');
 await page.locator('#province').selectOption('Northern Cape');
 await page.locator('#district').selectOption('John Taolo Gaetsewe');
 await page.locator('#municipality').selectOption('Gamagara');
 await page.locator('#email').fill('sample@example.test');
 await page.locator('#password').fill('example-long-passphrase-456!');
 await page.getByRole('button',{name:'Create My Account'}).click();
 await page.getByText('Account created.',{exact:false}).waitFor();
 const state=await page.evaluate(()=>window.mockBusiness);
 assert.equal(state.signedUp.options.data.business_name,'Sample Trading');
 assert.equal(state.signedUp.options.data.registered_name,'Sample Registered (Pty) Ltd');
 assert.equal(state.signedUp.options.data.municipality,'Gamagara');
 assert.equal(state.profile.business_name,'Sample Trading');
 assert.equal(state.profile.contact_email,'sample@example.test','Business email defaults to sign-in email');
 assert.equal(state.profile.region,'Kathu legacy location','Existing historical information stays intact');
 assert.deepEqual(errors,[],'No browser errors in registration');
 await page.close();
}
async function report(browser){
 const {page,errors}=await open(browser,'business-report.html');
 await page.getByText('Report ready. Review before printing or sharing.').waitFor();
 const p=await page.locator('#profile').innerText();
 assert.match(p,/Business Trading Name/);
 assert.match(p,/Business Registered Name/);
 assert.match(p,/Business Registration Number/);
 assert.match(p,/Contact Telephone/);
 assert.match(p,/District/);
 assert.match(p,/Municipality/);
 assert.doesNotMatch(p,/Business description/);
 assert.match(await page.locator('#complianceSummary').innerText(),/of 6/);
 await page.getByRole('button',{name:/Print Full Business Report/}).click();
 assert.equal(await page.evaluate(()=>window.printRequested),true);
 assert.deepEqual(errors,[],'No browser errors in printable business report');
 await page.close();
}
async function firstLogin(browser){
 const {page,errors}=await open(browser,'member.html?simulateNew=1');
 await page.locator('#business').waitFor({state:'visible'});
 assert.equal(await page.locator('#business').inputValue(),'New Signup Trading');
 assert.equal(await page.locator('#registeredName').inputValue(),'New Signup (Pty) Ltd');
 assert.equal(await page.locator('#registrationNumber').inputValue(),'2026/111111/07');
 assert.equal(await page.locator('#municipality').inputValue(),'Gamagara');
 assert.equal(await page.evaluate(()=>mockBusiness.inserted.user_id),'11111111-1111-4111-8111-111111111111');
 assert.deepEqual(errors,[]);
 await page.close();
}
(async()=>{try{
 await new Promise(resolve=>setTimeout(resolve,1100));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{await member(browser);await register(browser);await report(browser);await firstLogin(browser)}
 finally{await browser.close()}
 console.log('PASS: business registered/trading names, contacts, sector and municipality options, privacy, registration and PDF');
}catch(error){console.error(error);process.exitCode=1}finally{server.kill()}})();
