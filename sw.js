const CACHE='engineering-toolbox-github-v12';
const SHELL=['./','./index.html','./style.css','./app.js','./manifest.webmanifest','./toolbox-icon-180-v3.png','./toolbox-icon-192-v3.png','./toolbox-icon-512-v3.png','./favicon-v3.ico','./pcb-k-v2/index.html'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('engineering-toolbox-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith(fetch(request, request.mode === 'navigate' ? {cache:'no-cache'} : undefined).catch(async () => {
    const cache = await caches.open(CACHE);
    const exact = await cache.match(request);
    if (exact) return exact;
    if (request.mode !== 'navigate') return Response.error();

    const home = new URL('./', self.registration.scope);
    const homePage = new URL('index.html', home);
    const pcb = new URL('pcb-k-v2/', home);
    const pcbPage = new URL('index.html', pcb);
    if (url.pathname === home.pathname || url.pathname === homePage.pathname) {
      return (await cache.match(homePage.href)) || Response.error();
    }
    if (url.pathname === pcb.pathname || url.pathname === pcbPage.pathname) {
      return (await cache.match(pcbPage.href)) || Response.error();
    }
    return Response.error();
  }));
});
