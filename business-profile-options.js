/* MzanConnect business field choices: sector and province only.
 * District and municipality are FREE TEXT to accommodate members' own locality wording.
 * Existing saved district and municipality values are kept without conversion.
 */
(()=>{'use strict';
const PROVINCES=['Eastern Cape','Free State','Gauteng','KwaZulu-Natal','Limpopo','Mpumalanga','North West','Northern Cape','Western Cape'];
const SECTORS=[
'Agriculture and Agribusiness',
'Automotive and Mechanical Services',
'Catering and Hospitality',
'Cleaning and Facilities Management',
'Construction',
'Creative, Media and Events',
'Education and Training',
'Energy and Renewable Energy',
'Hairdressing, Beauty and Wellness',
'Healthcare and Social Services',
'Information Technology and Digital Services',
'Manufacturing, Engineering and Fabrication',
'Mining and Industrial Services',
'Professional Services',
'Retail and Trading',
'Security Services',
'Tourism and Accommodation',
'Transport and Logistics',
'Waste Management and Recycling',
'Wholesale and Distribution'
];
const OTHER='__other__';
const byId=id=>document.getElementById(id);
function option(value,label){
 const node=document.createElement('option');node.value=value;node.textContent=label;return node;
}
function matches(values,value){
 return values.find(x=>x.toLocaleLowerCase('en-ZA')===String(value||'').toLocaleLowerCase('en-ZA'))||null;
}
function toggleOther(select,other){
 const enabled=select.value===OTHER;
 other.hidden=!enabled;
 other.disabled=!enabled;
 other.required=enabled;
 if(!enabled)other.value='';
}
function setChoices(select,other,values,current,placeholder){
 const clean=String(current||'').trim();
 select.replaceChildren(option('',placeholder));
 values.forEach(v=>select.append(option(v,v)));
 select.append(option(OTHER,'Other / Not listed (specify)'));
 const known=matches(values,clean);
 select.value=known||(clean?OTHER:'');
 other.value=clean&&!known?clean:'';
 toggleOther(select,other);
}
function readValue(select,other){
 return select.value===OTHER?other.value.trim():select.value;
}
function init(prefill={}){
 const sector=byId('sector'),sectorOther=byId('sectorOther');
 const province=byId('province'),provinceOther=byId('provinceOther');
 const district=byId('district'),municipality=byId('municipality');
 if(![sector,sectorOther,province,provinceOther,district,municipality].every(Boolean)){
  throw Error('Business profile field controls missing');
 }
 if(district.tagName!=='INPUT'||municipality.tagName!=='INPUT'){
  throw Error('District and municipality must be free-text inputs');
 }
 setChoices(sector,sectorOther,SECTORS,prefill.sector,'Select business sector');
 setChoices(province,provinceOther,PROVINCES,prefill.province,'Select province');
 district.value=String(prefill.district||'').trim();
 municipality.value=String(prefill.municipality||'').trim();
 sector.addEventListener('change',()=>toggleOther(sector,sectorOther));
 province.addEventListener('change',()=>toggleOther(province,provinceOther));
 return Object.freeze({
  values(){return {
   sector:readValue(sector,sectorOther),
   province:readValue(province,provinceOther),
   district:district.value.trim(),
   municipality:municipality.value.trim()
  };},
  snapshot(){return {sectors:SECTORS.slice(),provinces:PROVINCES.slice()};}
 });
}
window.MzanBusinessOptions=Object.freeze({init,PROVINCES,SECTORS});
})();
