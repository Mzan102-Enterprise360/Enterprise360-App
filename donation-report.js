/* MzanConnect: complete, owner-only donation request register and print report. */
(() => {
'use strict';
const $=id=>document.getElementById(id);
const OWNER_UID='820a18ee-3482-4b6c-bd75-469cf198b9df';
const PAGE_SIZE=200; // below Supabase's default 1,000-row Data API response limit
const statuses={
 new:'Submitted',reviewing:'Under review',awaiting_documents:'More information needed',
 quoted:'Review in progress',in_progress:'In progress',completed:'Review completed',cancelled:'Closed'
};
const active=new Set(['reviewing','awaiting_documents','quoted','in_progress']);
const currency=n=>new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR'}).format(n);
const formatDate=value=>{
 const date=new Date(value);
 return Number.isNaN(date.getTime())?'Date unavailable':date.toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric',timeZone:'Africa/Johannesburg'});
};
const formatAsOf=value=>new Date(value).toLocaleString('en-ZA',{dateStyle:'long',timeStyle:'medium',timeZone:'Africa/Johannesburg'})+' (SAST)';
const make=(tag,text,className)=>{
 const node=document.createElement(tag);
 if(text!==undefined)node.textContent=text;
 if(className)node.className=className;
 return node;
};
function readPart(source,label,nextLabel){
 const start=new RegExp('(?:^|\\n)'+label+':\\s*','i').exec(source);
 if(!start)return '';
 const remainder=source.slice(start.index+start[0].length);
 const next=nextLabel?new RegExp('\\n'+nextLabel+':\\s*','i').exec(remainder):null;
 return (next?remainder.slice(0,next.index):remainder).trim();
}
function fieldsFromDetails(source){
 const details=String(source||'');
 const type=readPart(details,'Support requested','Area');
 const area=readPart(details,'Area','Estimated value');
 const amountText=readPart(details,'Estimated value','Purpose');
 const purpose=readPart(details,'Purpose','Expected impact');
 const impact=readPart(details,'Expected impact');
 const requested=amountText.match(/^R\s*([\d\s,.]+)$/i);
 let amount=null;
 if(requested){
  const parsed=Number(requested[1].replace(/[\s,]/g,''));
  if(Number.isFinite(parsed)&&parsed>=0)amount=parsed;
 }
 return {
  type:type||'Not specified',
  area:area||'Not specified',
  amount,
  purpose:purpose||details||'Not provided',
  impact:impact||'Not specified'
 };
}
function metric(root,label,value){
 const item=make('div',undefined,'metric');
 item.append(make('strong',String(value)),make('span',label));
 root.append(item);
}
function row(root,values,lastRight=false){
 const tr=make('tr');
 for(let i=0;i<values.length;i++){
  const td=make('td',String(values[i]));
  if(i===values.length-1&&lastRight)td.style.textAlign='right';
  tr.append(td);
 }
 root.append(tr);
}
function detail(root,label,value,wide=false){
 const box=make('div',undefined,wide?'wide':'');
 const dt=make('dt',label);
 const dd=make('dd',String(value));
 box.append(dt,dd);
 root.append(box);
}
function render(rows,loadedAt){
 const total=rows.length;
 const withFields=rows.map(r=>({r,parsed:fieldsFromDetails(r.details)}));
 const counts={submitted:0,progress:0,completed:0,closed:0,other:0};
 const statusCounts=new Map();
 const categoryCounts=new Map();
 let requestedTotal=0,valuedCount=0;
 for(const {r,parsed} of withFields){
  const status=r.status||'unknown';
  statusCounts.set(status,(statusCounts.get(status)||0)+1);
  if(status==='new')counts.submitted++;
  else if(active.has(status))counts.progress++;
  else if(status==='completed')counts.completed++;
  else if(status==='cancelled')counts.closed++;
  else counts.other++;
  const group=categoryCounts.get(parsed.type)||{count:0,total:0,provided:0};
  group.count++;
  if(parsed.amount!==null){group.total+=parsed.amount;group.provided++;requestedTotal+=parsed.amount;valuedCount++;}
  categoryCounts.set(parsed.type,group);
 }
 $('reportAsOf').textContent='Generated '+formatAsOf(loadedAt)+' · All saved donation applications as of this report.';
 const metrics=$('reportMetrics');
 metrics.replaceChildren();
 metric(metrics,'Total applications',total);
 metric(metrics,'Submitted',counts.submitted);
 metric(metrics,'In progress / under review',counts.progress);
 metric(metrics,'Review completed',counts.completed);
 metric(metrics,'Closed',counts.closed);
 metric(metrics,'Other status',counts.other);
 metric(metrics,'Total stated requested value (not awarded)',currency(requestedTotal));
 metric(metrics,'Applications stating a rand value',valuedCount+' of '+total);
 const statusBody=$('reportStatusRows');
 statusBody.replaceChildren();
 for(const [key,label] of Object.entries(statuses))row(statusBody,[label,statusCounts.get(key)||0],true);
 for(const [key,count] of statusCounts){if(!Object.hasOwn(statuses,key))row(statusBody,[key,count],true);}
 row(statusBody,['TOTAL',total],true);
 const categoryBody=$('reportCategoryRows');
 categoryBody.replaceChildren();
 const sorted=[...categoryCounts].sort((a,b)=>a[0].localeCompare(b[0]));
 for(const [category,v] of sorted)row(categoryBody,[category,v.count,v.provided?currency(v.total):'Not stated']);
 if(!sorted.length)row(categoryBody,['No donation applications',0,'—']);
 row(categoryBody,['TOTAL',total,valuedCount?currency(requestedTotal):'Not stated']);
 const records=$('reportRecords');
 records.replaceChildren();
 if(!total){records.append(make('p','No donation requests have been submitted yet.'));return;}
 for(let i=0;i<withFields.length;i++){
  const {r,parsed}=withFields[i];
  const article=make('article',undefined,'donation-entry');
  article.append(make('h3',(i+1)+'. '+(r.business_name||'Unnamed applicant')));
  const dl=make('dl',undefined,'detail-grid');
  detail(dl,'Submitted',formatDate(r.created_at));
  detail(dl,'Reference',r.id||'Unavailable');
  detail(dl,'Latest status',statuses[r.status]||r.status||'Not specified');
  detail(dl,'Contact email',r.contact_email||'Not provided');
  detail(dl,'Area',parsed.area);
  detail(dl,'Support requested',parsed.type);
  detail(dl,'Estimated requested value',parsed.amount===null?'Not stated':currency(parsed.amount));
  detail(dl,'Last status update',r.updated_at?formatDate(r.updated_at):'Not recorded');
  detail(dl,'Purpose / requested items',parsed.purpose,true);
  detail(dl,'Expected impact',parsed.impact,true);
  article.append(dl);
  records.append(article);
 }
}
let client=null,owner=false,ready=false,loading=false;
async function loadFullReport(){
 if(!owner||!client||loading)return;
 loading=true;ready=false;
 $('reportLoaded').hidden=true;
 $('reportPrint').disabled=true;
 $('reportReload').disabled=true;
 $('reportStatus').textContent='Loading every donation request for the complete report…';
 const snapshot=new Date().toISOString();
 try{
  const all=[];
  let expectedTotal=null;
  for(let offset=0;;offset+=PAGE_SIZE){
   const result=await client.from('business_service_requests')
    .select('id,business_name,details,contact_email,status,created_at,updated_at',{count:'exact'})
    .eq('service_type','donation_request')
    .lte('created_at',snapshot)
    .order('created_at',{ascending:false})
    .order('id',{ascending:false})
    .range(offset,offset+PAGE_SIZE-1);
   if(result.error)throw result.error;
   if(!Array.isArray(result.data))throw new Error('Missing records');
   if(expectedTotal===null&&Number.isInteger(result.count))expectedTotal=result.count;
   if(result.data.length>PAGE_SIZE)throw new Error('Unexpected response size');
   all.push(...result.data);
   $('reportStatus').textContent='Preparing complete report: '+all.length+' requests loaded…';
   if(result.data.length<PAGE_SIZE)break;
  }
  if(expectedTotal!==null&&expectedTotal!==all.length)throw new Error('Count changed while loading');
  render(all,snapshot);
  $('reportLoaded').hidden=false;
  ready=true;
  $('reportStatus').textContent='Complete report ready: '+all.length+' donation requests. You can print or save as PDF.';
 }catch(error){
  $('reportLoaded').hidden=true;
  $('reportStatus').textContent='The complete report could not be verified. Printing is disabled to prevent an incomplete report. Please try Refresh full report.';
  ready=false;
 }finally{
  loading=false;
  $('reportReload').disabled=false;
  $('reportPrint').disabled=!ready;
 }
}
$('reportReload').addEventListener('click',()=>void loadFullReport());
$('reportPrint').addEventListener('click',()=>{
 if(!owner||!ready||loading)return;
 window.print();
});
(async()=>{
 try{
  if(!window.supabase)throw new Error('Authentication library unavailable');
  client=window.supabase.createClient(
   'https://akxzubckdebawqwwwaoe.supabase.co',
   'sb_publishable_XEeBfPCzJ0MzGpHWHygeug_rGptbzno'
  );
  const {data,error}=await client.auth.getUser();
  if(error)throw error;
  // Server-side RLS in Supabase independently authorises this same owner UUID.
  if(data.user?.id!==OWNER_UID){
   $('reportStatus').textContent='Owner access required.';
   $('reportDenied').hidden=false;
   return;
  }
  owner=true;
  await loadFullReport();
 }catch(error){
  $('reportStatus').textContent='Unable to verify your owner login. Sign in again.';
  $('reportDenied').hidden=false;
 }
})();
})();
