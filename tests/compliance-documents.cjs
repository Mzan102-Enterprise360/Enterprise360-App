const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
const server=spawn('python3',['-m','http.server','8768','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});
const base='http://127.0.0.1:8768/';
const mock=String.raw`(()=>{
 const user={id:'11111111-1111-4111-8111-111111111111',email:'member@example.test',app_metadata:{mzanconnect_role:'member'}};
 const state={files:{},checks:{},failUpload:false,failSave:false,uploads:[],views:[]};
 window.mockCompliance=state;
 window.supabase={createClient:()=>({
   auth:{getUser:async()=>({data:{user},error:null})},
   from(table){
    if(table!=='compliance_items')throw Error('Unexpected table '+table);
    return {
     select(){return this},
     eq(field,value){if(field!=='user_id'||value!==user.id)throw Error('Unexpected user');return this},
     async in(field,keys){
      if(field!=='item_key')throw Error('Unexpected key');
      return {data:keys.filter(k=>k in state.checks).map(item_key=>({item_key,completed:state.checks[item_key]})),error:null};
     },
     async upsert(rows,options){
      if(options.onConflict!=='user_id,item_key')throw Error('Missing conflict keys');
      if(state.failSave)return {error:new Error('Mock checklist save failed')};
      for(const row of rows){
       if(row.user_id!==user.id)throw Error('Mismatched member');
       state.checks[row.item_key]=row.completed;
      }
      return {error:null};
     }
    }
   },
   storage:{from(bucket){
    if(bucket!=='mzanconnect-compliance-documents')throw Error('Unexpected bucket '+bucket);
    return {
     async list(folder){
      const files=Object.entries(state.files).filter(([key])=>key.startsWith(folder+'/'));
      return {data:files.map(([key])=>({id:key,name:key.split('/').at(-1),created_at:'2026-11-17T12:00:00Z'})),error:null};
     },
     async upload(key,file,options){
      if(state.failUpload)return {error:new Error('Mock upload rejected')};
      if(options.upsert!==false)throw Error('Must not overwrite uploaded files');
      if(!key.startsWith(user.id+'/'))throw Error('File leaked into another member folder');
      state.files[key]={size:file.size,contentType:options.contentType};
      state.uploads.push(key);
      return {data:{path:key},error:null};
     },
     async createSignedUrl(key,seconds){
      if(!state.files[key]||seconds>120)throw Error('Invalid private file access');
      state.views.push(key);
      return {data:{signedUrl:'https://example.test/private-file?token=temporary'},error:null};
     }
    }
   }}
 })};
})();
`;
async function testCompliance(browser){
 const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/supabase.min.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:mock}));
 await page.goto(base+'member.html?section=compliance',{waitUntil:'domcontentloaded'});
 const names=[
  'CIPC Records (Director + Shareholder)',
  'SARS Compliance',
  'CSD Compliance',
  'BBBEE Certificates',
  'Relevant Industry Licences',
  'Proof of Residence'
 ];
 await page.locator('.compliance-item').first().waitFor({state:'visible'});
 assert.equal(await page.locator('.compliance-item').count(),6);
 assert.equal(await page.getByRole('button',{name:/Upload document for/}).count(),6);
 for(let i=0;i<names.length;i++){
  const row=page.locator('.compliance-item').nth(i);
  assert.ok((await row.innerText()).includes(names[i]),'Missing compliance title: '+names[i]);
  assert.equal(await row.locator('input[type=checkbox]').isChecked(),false);
 }
 // A normal document upload must also persist and check the matching compliance box.
 await page.locator('.compliance-item').nth(0).locator('input[type=file]').setInputFiles({
  name:'cipc-register.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\\n')
 });
 await page.getByText('Document uploaded. ✓ CIPC Records',{exact:false}).waitFor();
 assert.equal(await page.locator('#c0').isChecked(),true);
 assert.equal(await page.evaluate(()=>window.mockCompliance.checks.c0),true);
 const uploaded=await page.evaluate(()=>window.mockCompliance.uploads[0]);
 assert.match(uploaded,/^11111111-1111-4111-8111-111111111111\/c0\/[a-f0-9-]{36}_cipc-register\.pdf$/);
 await page.locator('.compliance-item').first().getByRole('button',{name:/View cipc-register.pdf/}).click();
 await page.getByRole('link',{name:/Open cipc-register.pdf/}).waitFor();
 assert.equal(await page.getByRole('link',{name:/Open cipc-register.pdf/}).getAttribute('href'),'https://example.test/private-file?token=temporary');
 // Failed storage uploads must never tick a checkbox.
 await page.locator('.compliance-item').nth(5).locator('input[type=file]').setInputFiles({
  name:'proof-of-residence.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n')
 });
 await page.getByText('Document uploaded. ✓ Proof of Residence',{exact:false}).waitFor();
 assert.equal(await page.locator('#c5').isChecked(),true);
 assert.equal(await page.evaluate(()=>window.mockCompliance.checks.c5),true);
 assert.equal((await page.evaluate(()=>window.mockCompliance.uploads[1])).includes('/c5/'),true);
 await page.evaluate(()=>{window.mockCompliance.failUpload=true});
 await page.locator('.compliance-item').nth(1).locator('input[type=file]').setInputFiles({
  name:'tax.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\\n')
 });
 await page.getByText('Upload not completed:',{exact:false}).waitFor();
 assert.equal(await page.locator('#c1').isChecked(),false);
 await page.evaluate(()=>{window.mockCompliance.failUpload=false;window.mockCompliance.failSave=true});
 await page.locator('.compliance-item').nth(2).locator('input[type=file]').setInputFiles({
  name:'csd.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\\n')
 });
 await page.getByText('Document uploaded securely, but the checklist could not be ticked automatically.',{exact:false}).waitFor();
 assert.equal(await page.locator('#c2').isChecked(),false);
 // Manual checklist save still works with the same c0-c4 IDs.
 await page.evaluate(()=>{window.mockCompliance.failSave=false});
 await page.locator('#c1').check();
 await page.getByRole('button',{name:'Save checklist'}).click();
 await page.getByText('Checklist saved successfully.').waitFor();
 assert.equal(await page.evaluate(()=>window.mockCompliance.checks.c1),true);
 assert.deepEqual(errors,[],'No uncaught browser errors: '+errors.join(';'));
 await page.close();
}
async function testGrowthUnchanged(browser){
 const page=await browser.newPage({serviceWorkers:'block'});
 await page.route('**/supabase.min.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:mock}));
 await page.goto(base+'member.html?section=growth',{waitUntil:'domcontentloaded'});
 await page.locator('#growthPanel').waitFor({state:'visible'});
 assert.equal(await page.locator('.compliance-item').count(),0);
 await page.locator('.growth-card').first().waitFor({state:'visible'});
 assert.equal(await page.locator('.growth-card').count(),5);
 assert.equal(await page.locator('#growthChecks input[type=checkbox]').count(),0,'Growth Passport stages cannot be self-ticked');
 await page.close();
}
(async()=>{try{
 await new Promise(resolve=>setTimeout(resolve,1100));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{await testCompliance(browser);await testGrowthUnchanged(browser)}finally{await browser.close()}
 console.log('PASS: six compliance uploads, auto-ticking on persisted save, private files, error handling, Growth Passport read-only');
}catch(error){console.error(error);process.exitCode=1}finally{server.kill()}})();
