/* South African province → district → municipality selector.
 * Municipality reference data: Open Admin Data, South Africa Administrative Divisions
 * https://github.com/open-admin-data/south-africa-administrative-divisions
 * Data licence: CC-BY-4.0; snapshot June 2026. Names corrected to current
 * common official forms for selected renamed districts (Sarah Baartman,
 * Garden Route, Harry Gwala, King Cetshwayo, ZF Mgcawu).
 * Always verify jurisdiction before using a profile for a formal tender.
 */
(()=>{'use strict';
const AREAS={"Eastern Cape":{"Alfred Nzo":["Matatiele","Mbizana","Ntabankulu","Umzimvubu"],"Amathole":["Amahlathi","Great Kei","Mbhashe","Mnquma","Ngqushwa","Raymond Mhlaba"],"Buffalo City":["Buffalo City"],"Chris Hani":["Emalahleni","Engcobo","Enoch Mgijima","Intsika Yethu","Inxuba Yethemba","Sakhisizwe"],"Joe Gqabi":["Elundini","Senqu","Walter Sisulu"],"Nelson Mandela Bay":["Nelson Mandela Bay"],"O.R.Tambo":["King Sabata Dalindyebo","Mhlontlo","Ngquza Hill","Nyandeni","Port St Johns"],"Sarah Baartman":["Blue Crane Route","Dr Beyers Naude","Kou-Kamma","Kouga","Makana","Ndlambe","Sundays River Valley"]},"Free State":{"Fezile Dabi":["Mafube","Metsimaholo","Moqhaka","Ngwathe"],"Lejweleputswa":["Masilonyana","Matjhabeng","Nala","Tokologo","Tswelopele"],"Mangaung":["Mangaung"],"Thabo Mofutsanyane":["Dihlabeng","Maluti a Phofung","Mantsopa","Nketoana","Phumelela","Setsoto"],"Xhariep":["Kopanong","Letsemeng","Mohokare"]},"Gauteng":{"City of Johannesburg":["City of Johannesburg"],"City of Tshwane":["City of Tshwane"],"Ekurhuleni":["City of Ekurhuleni"],"Sedibeng":["Emfuleni","Lesedi","Midvaal"],"West Rand":["Merafong City","Mogale City","Rand West City"]},"KwaZulu-Natal":{"Amajuba":["Dannhauser","Emadlangeni","Newcastle"],"eThekwini":["eThekwini"],"Harry Gwala":["Dr Nkosazana Dlamini Zuma","Greater Kokstad","Ubuhlebezwe","Umzimkhulu"],"iLembe":["KwaDukuza","Mandeni","Maphumulo","Ndwedwe"],"King Cetshwayo":["Mfolozi","Mthonjaneni","Nkandla","uMhlathuze","uMlalazi"],"Ugu":["Ray Nkonyeni","Umdoni","uMuziwabantu","Umzumbe"],"Umgungundlovu":["Impendle","Mkhambathini","Mpofana","Richmond","The Msunduzi","uMngeni","uMshwathi"],"Umkhanyakude":["Big Five Hlabisa","Jozini","Mtubatuba","Umhlabuyalingana"],"Umzinyathi":["Endumeni","Msinga","Nqutu","Umvoti"],"Uthukela":["Alfred Duma","Inkosi Langalibalele","Okhahlamba"],"Zululand":["Abaqulusi","eDumbe","Nongoma","Ulundi","uPhongolo"]},"Limpopo":{"Capricorn":["Blouberg","Lepele-Nkumpi","Molemole","Polokwane"],"Mopani":["Ba-Phalaborwa","Greater Giyani","Greater Letaba","Greater Tzaneen","Maruleng"],"Sekhukhune":["Elias Motsoaledi","Ephraim Mogale","Greater Tubatse/Fetakgomo","Makhuduthamaga"],"Vhembe":["Collins Chabane","Makhado","Musina","Thulamela"],"Waterberg":["Bela-Bela","Lephalale","Modimolle/Mookgophong","Mogalakwena","Thabazimbi"]},"Mpumalanga":{"Ehlanzeni":["Bushbuckridge","Mbombela","Nkomazi","Thaba Chweu"],"Gert Sibande":["Chief Albert Luthuli","Dipaleseng","Dr Pixley Ka Isaka Seme","Govan Mbeki","Lekwa","Mkhondo","Msukaligwa"],"Nkangala":["Dr JS Moroka","Emakhazeni","Emalahleni","Steve Tshwete","Thembisile","Victor Khanye"]},"North West":{"Bojanala":["Kgetlengrivier","Local Municipality of Madibeng","Moretele","Moses Kotane","Rustenburg"],"Dr Kenneth Kaunda":["City of Matlosana","Maquassi Hills","Ventersdorp/Tlokwe"],"Dr Ruth Segomotsi Mompati":["Greater Taung","Kagisano/Molopo","Lekwa-Teemane","Mamusa","Naledi"],"Ngaka Modiri Molema":["Ditsobotla","Mafikeng","Ramotshere Moiloa","Ratlou","Tswaing"]},"Northern Cape":{"Frances Baard":["Dikgatlong","Magareng","Phokwane","Sol Plaatje"],"John Taolo Gaetsewe":["Ga-Segonyana","Gamagara","Joe Morolong"],"Namakwa":["Hantam","Kamiesberg","Karoo Hoogland","Khâi-Ma","Nama Khoi","Richtersveld"],"Pixley ka Seme":["Emthanjeni","Kareeberg","Renosterberg","Siyancuma","Siyathemba","Thembelihle","Ubuntu","Umsobomvu"],"ZF Mgcawu":["Dawid Kruiper","Kai Garib","Kgatelopele","Kheis","Tsantsabane"]},"Western Cape":{"Cape Winelands":["Breede Valley","Drakenstein","Langeberg","Stellenbosch","Witzenberg"],"Central Karoo":["Beaufort West","Laingsburg","Prince Albert"],"City of Cape Town":["City of Cape Town"],"Garden Route":["Bitou","George","Hessequa","Kannaland","Knysna","Mossel Bay","Oudtshoorn"],"Overberg":["Cape Agulhas","Overstrand","Swellendam","Theewaterskloof"],"West Coast":["Bergrivier","Cederberg","Matzikama","Saldanha Bay","Swartland"]}};
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
function option(value,label){const node=document.createElement('option');node.value=value;node.textContent=label;return node;}
function matches(values,value){
 return values.find(x=>x.toLocaleLowerCase('en-ZA')===String(value||'').toLocaleLowerCase('en-ZA'))||null;
}
function setChoices(select,other,values,current,placeholder){
 const clean=String(current||'').trim();
 select.replaceChildren(option('',placeholder));
 values.forEach(v=>select.append(option(v,v)));
 select.append(option(OTHER,'Other / Not listed (specify)'));
 const known=matches(values,clean);
 select.value=known|| (clean?OTHER:'');
 other.value=clean&&!known?clean:'';
 toggleOther(select,other);
}
function toggleOther(select,other){
 const enabled=select.value===OTHER;
 other.hidden=!enabled;
 other.disabled=!enabled;
 other.required=enabled;
 if(!enabled)other.value='';
}
function readValue(select,other){
 return select.value===OTHER?other.value.trim():select.value;
}
function init(prefill={}){
 const sector=byId('sector'),sectorOther=byId('sectorOther');
 const province=byId('province'),provinceOther=byId('provinceOther');
 const district=byId('district'),districtOther=byId('districtOther');
 const municipality=byId('municipality'),municipalityOther=byId('municipalityOther');
 if(![sector,sectorOther,province,provinceOther,district,districtOther,municipality,municipalityOther].every(Boolean)){
  throw Error('Business profile selection controls missing');
 }
 let originalProvince=String(prefill.province||'').trim();
 let originalDistrict=String(prefill.district||'').trim();
 let originalMunicipality=String(prefill.municipality||'').trim();
 // Recover province for older records with a recognisable district or municipality.
 if(!originalProvince&&(originalDistrict||originalMunicipality)){
  for(const [p,ds] of Object.entries(AREAS)){
   if(Object.keys(ds).some(x=>x.toLowerCase()===originalDistrict.toLowerCase())||
      Object.values(ds).some(arr=>arr.some(x=>x.toLowerCase()===originalMunicipality.toLowerCase()))){
    originalProvince=p;break;
   }
  }
 }
 function districtsForProvince(){return Object.keys(AREAS[readValue(province,provinceOther)]||{});}
 function municipalitiesForDistrict(){
  return AREAS[readValue(province,provinceOther)]?.[readValue(district,districtOther)]||[];
 }
 setChoices(sector,sectorOther,SECTORS,prefill.sector,'Select business sector');
 setChoices(province,provinceOther,Object.keys(AREAS),originalProvince,'Select province');
 setChoices(district,districtOther,districtsForProvince(),originalDistrict,'Select district / metro');
 setChoices(municipality,municipalityOther,municipalitiesForDistrict(),originalMunicipality,'Select local / metropolitan municipality');
 sector.addEventListener('change',()=>toggleOther(sector,sectorOther));
 province.addEventListener('change',()=>{
  toggleOther(province,provinceOther);
  setChoices(district,districtOther,districtsForProvince(),'','Select district / metro');
  setChoices(municipality,municipalityOther,[],'','Select municipality');
 });
 provinceOther.addEventListener('change',()=>{
  setChoices(district,districtOther,districtsForProvince(),'','Select district / metro');
  setChoices(municipality,municipalityOther,[],'','Select municipality');
 });
 district.addEventListener('change',()=>{
  toggleOther(district,districtOther);
  setChoices(municipality,municipalityOther,municipalitiesForDistrict(),'','Select local / metropolitan municipality');
 });
 districtOther.addEventListener('change',()=>{
  setChoices(municipality,municipalityOther,municipalitiesForDistrict(),'','Select local / metropolitan municipality');
 });
 municipality.addEventListener('change',()=>toggleOther(municipality,municipalityOther));
 return Object.freeze({
  values(){return {
   sector:readValue(sector,sectorOther),
   province:readValue(province,provinceOther),
   district:readValue(district,districtOther),
   municipality:readValue(municipality,municipalityOther)
  };},
  snapshot(){return {sectors:SECTORS.slice(),provinces:Object.keys(AREAS)};}
 });
}
window.MzanBusinessOptions=Object.freeze({init,AREAS,SECTORS});
})();
