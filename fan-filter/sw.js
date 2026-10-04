const CACHE='fan-filter-v1-2';
const SHELL=['./','./index.html','./style.css?v=1.1','./app.js?v=1.1','./calc.mjs','./logo.svg','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL.map(p=>new Request(p,{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('fan-filter-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const url=new URL(e.request.url);if(url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;e.respondWith(fetch(e.request).then(response=>{if(response.ok){const copy=response.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)));}return response;}).catch(()=>caches.match(e.request).then(r=>r||(e.request.mode==='navigate'?caches.match('./index.html'):Response.error()))));});

