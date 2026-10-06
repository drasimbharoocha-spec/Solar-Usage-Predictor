var N='srp1';
self.addEventListener('install',function(){self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',function(e){
var r=e.request;
if(r.method!=='GET'||new URL(r.url).origin!==self.location.origin)return;
e.respondWith(fetch(r).then(function(x){var c=x.clone();caches.open(N).then(function(h){h.put(r,c)});return x})['catch'](function(){return caches.match(r)}));
});
