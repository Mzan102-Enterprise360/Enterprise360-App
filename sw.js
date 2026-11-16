// MzanConnect: prefer fresh pages; retain only same-origin offline shell.
const CACHE='mzanconnect-live-v7-m-logo';
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['./','./index.html','./manifest.webmanifest?v=20261116m1','./mzanconnect-icon.svg?v=20261116m1','./mzanconnect-icon-192.png?v=20261116m1','./mzanconnect-icon-512.png?v=20261116m1'])))});
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))),self.clients.claim()])));
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 event.respondWith(fetch(request).then(response=>{if(response.ok&&request.url.endsWith('/index.html')){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});}return response;}).catch(()=>caches.match(request)));
});
