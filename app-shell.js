/* Shared app navigation and viewport layout. Does not access account data. */
(()=>{'use strict';
if(document.getElementById('mzan-app-navigation'))return;
const page=location.pathname.split('/').pop()||'index.html';
const main=document.querySelector('main');
if(!main)return;
document.body.classList.add('mzan-app-page');
if(page==='dashboard.html')document.body.classList.add('mzan-dashboard-page');
const style=document.createElement('style');
style.textContent=`
.mzan-home-return[hidden]{display:none!important}
.mzan-home-return{box-sizing:border-box;flex:0 0 auto;width:calc(100% - 20px);max-width:1030px;margin:4px auto}
.mzan-home-return a{display:flex;align-items:center;justify-content:center;min-height:44px;padding:8px 12px;border:2px solid #148c8f;border-radius:12px;background:#14283b;color:#fff;font:700 16px/1.2 Arial,sans-serif;text-decoration:none;box-shadow:0 3px 9px #14283b20}
body #mzan-app-navigation{box-sizing:border-box;position:relative;flex:0 0 auto;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px;width:calc(100% - 20px);max-width:1030px;margin:4px auto;padding:5px;background:#fff;border:1px solid #dce9eb;border-radius:16px;box-shadow:0 4px 14px #14283b0d}
body #mzan-app-navigation a,body #mzan-app-navigation button{box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-width:0;min-height:58px;margin:0;padding:5px 2px;border:1px solid #ffffff80;border-radius:11px;background:#116a71;color:#fff;font:700 clamp(9px,2.3vw,12px)/1.2 Arial,sans-serif;overflow-wrap:anywhere;text-align:center;text-decoration:none;box-shadow:none;cursor:pointer}
body #mzan-app-navigation [aria-current=page]{background:#14283b;box-shadow:inset 0 -3px #80f0d7}
#mzan-app-navigation .nav-icon{font-size:19px;line-height:1}
#mzan-app-navigation :focus-visible,.mzan-home-return a:focus-visible{outline:3px solid #ffbf47;outline-offset:2px}
@media screen{
body.mzan-app-page:not(.mzan-dashboard-page):not(:has(.welcome-cover)){height:100vh;height:100dvh;min-height:0;display:flex;flex-direction:column;overflow:hidden}
body.mzan-app-page:not(.mzan-dashboard-page):not(:has(.welcome-cover)) > header{flex:0 0 auto;padding:10px 14px!important}
body.mzan-app-page:not(.mzan-dashboard-page):not(:has(.welcome-cover)) > header h1{font-size:clamp(21px,5vw,28px)!important;line-height:1.15;margin:0 0 4px!important}
body.mzan-app-page:not(.mzan-dashboard-page):not(:has(.welcome-cover)) > header p{font-size:13px!important;line-height:1.3;margin:3px 0!important}
body.mzan-app-page:not(.mzan-dashboard-page):not(:has(.welcome-cover)) > main{box-sizing:border-box;flex:1 1 0;min-height:0;width:100%;margin:0 auto!important;padding:8px 12px!important;overflow:auto;overscroll-behavior:contain;scroll-padding:12px}
body.mzan-app-page:not(.mzan-dashboard-page):not(:has(.welcome-cover)) main .card{padding:12px;margin:0 0 8px}
body.mzan-app-page:not(.mzan-dashboard-page):not(:has(.welcome-cover)) main h2{font-size:21px;margin:4px 0 10px}
body.mzan-app-page:not(.mzan-dashboard-page):not(:has(.welcome-cover)) main label{margin-top:9px}
body.mzan-app-page:not(.mzan-dashboard-page):not(:has(.welcome-cover)) main input:not([type=checkbox]),body.mzan-app-page main select{min-height:44px;font-size:16px}
body.mzan-app-page #mzan-legal-footer{flex:0 0 auto;max-width:none;width:100%;margin:0;box-sizing:border-box;padding:5px 8px;font-size:11px;line-height:1.2}
body.mzan-app-page #mzan-legal-footer div{margin:2px 0}
/* Preserve access when a keyboard, landscape view or enlarged text leaves very little height. */
@media(max-height:480px){body.mzan-app-page:not(.mzan-dashboard-page):not(:has(.welcome-cover)){height:auto;min-height:100dvh;overflow:auto}body.mzan-app-page:not(.mzan-dashboard-page):not(:has(.welcome-cover)) > main{flex:1 0 auto;overflow:visible}}
}
@media print{.mzan-home-return,#mzan-app-navigation{display:none!important}body.mzan-app-page,body.mzan-app-page > main{height:auto!important;max-height:none!important;overflow:visible!important}}
`;
document.head.append(style);
const homeRow=document.createElement('div');homeRow.className='mzan-home-return no-print';
const existingHome=[...document.querySelectorAll('a[href]')].find(a=>{
const url=new URL(a.getAttribute('href'),document.baseURI);
return url.origin===location.origin&&url.pathname.endsWith('/index.html')&&!url.hash&&!a.closest('nav');
});
const home=existingHome||document.createElement('a');
home.href='index.html';home.textContent='⌂ Back to Home';home.setAttribute('aria-label','Back to Home');
homeRow.append(home);main.before(homeRow);
let nav=page==='index.html'?document.querySelector('body > nav'):null;
if(!nav){
nav=document.createElement('nav');
for(const [label,icon,href] of [['Home','⌂','index.html'],['Business Support','☏','business-support.html'],['Explore','▣','index.html#opportunities'],['Billing & Membership','▤','billing.html'],['Dashboard','⚙','dashboard.html']]){
const a=document.createElement('a');a.href=href;
const symbol=document.createElement('span');symbol.className='nav-icon';symbol.setAttribute('aria-hidden','true');symbol.textContent=icon;
const text=document.createElement('span');text.textContent=label;a.append(symbol,text);nav.append(a);
}
const footer=document.getElementById('mzan-legal-footer');
if(footer)footer.before(nav);else main.after(nav);
}
nav.id='mzan-app-navigation';nav.setAttribute('aria-label','Main navigation');
main.tabIndex=0;
function sync(){
const isHome=page==='index.html'&&!!document.querySelector('.welcome-cover');
homeRow.hidden=isHome;
const active=isHome?'Home':page==='index.html'?(document.getElementById('opportunitySearch')?'Explore':''):page==='business-support.html'?'Business Support':page==='billing.html'?'Billing & Membership':page==='dashboard.html'?'Dashboard':'';
for(const item of nav.querySelectorAll('a,button')){
if(item.textContent.trim().endsWith(active)&&active)item.setAttribute('aria-current','page');else item.removeAttribute('aria-current');
}
main.scrollTop=0;
}
sync();
const view=document.getElementById('view');
if(view)new MutationObserver(sync).observe(view,{childList:true});
})();
