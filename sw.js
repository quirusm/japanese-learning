/* Network-first HTML prevents an old Home Screen launch from pinning a release. */
const CACHE='japanese-every-day-0.2.0';
const FILES=['./','./index.html','./styles.css?v=0.2.0','./curriculum.js?v=0.2.0','./engine.js?v=0.2.0','./app.js?v=0.2.0','./manifest.webmanifest','./assets/icon-192.png','./assets/icon-512.png','./assets/apple-touch-icon.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('japanese-every-day-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
  if(url.pathname.endsWith('/version.json'))return;
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request,{cache:'no-cache'}).then(response=>{if(!response.ok)throw new Error('Navigation failed');const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(new URL('./',self.registration.scope),copy)));return response;}).catch(()=>caches.match(new URL('./',self.registration.scope))));return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
