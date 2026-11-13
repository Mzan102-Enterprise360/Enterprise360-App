/* Shared legal footer. Does not read, collect or transmit member data. */
(()=>{'use strict';if(document.getElementById('mzan-legal-footer'))return;
const style=document.createElement('style');style.textContent='#mzan-legal-footer{box-sizing:border-box;clear:both;text-align:center;background:#14283b;color:#fff;padding:15px 12px 22px;font:13px/1.6 Arial,sans-serif}#mzan-legal-footer a{color:#d5fff7;text-decoration:underline;margin:0 5px}#mzan-legal-footer a:focus-visible{outline:3px solid #ffbf47;outline-offset:2px}@media print{#mzan-legal-footer{background:#fff;color:#000;padding:10px}#mzan-legal-footer a{color:#000}}';document.head.append(style);
const footer=document.createElement('footer');footer.id='mzan-legal-footer';footer.setAttribute('aria-label','Privacy, copyright and credits');
const line=document.createElement('div');line.textContent='© 2026 Mzan 102 (Pty) Ltd · MzanConnect · All rights reserved.';
const links=document.createElement('div');
for(const [name,url] of [['Privacy & POPIA','privacy.html'],['Copyright & Credits','copyright.html']]){const a=document.createElement('a');a.href=new URL(url,document.baseURI).href;a.textContent=name;links.append(a);}
const credit=document.createElement('div');credit.textContent='Inspired by Phenyo Gladwin Lumatha · Constructed by QueenMaur with AI assistance.';
footer.append(line,links,credit);document.body.append(footer);
})();