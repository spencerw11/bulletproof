var CACHE = 'bulletproof-v1';
var ASSETS = ['./','index.html','manifest.json','icon-180.png','icon-192.png','icon-512.png'];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE).then(function(cache){
      // Cache each asset individually so one failure doesn't break install.
      return Promise.all(ASSETS.map(function(url){
        return cache.add(new Request(url, {cache: 'reload'})).catch(function(e){
          console.log('precache failed for', url, e);
        });
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        if(k !== CACHE){ return caches.delete(k); }
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event){
  var req = event.request;
  if(req.method !== 'GET'){ return; }

  if(req.mode === 'navigate'){
    // Navigations: network first, fall back to cache (then index.html shell).
    event.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); });
        return res;
      }).catch(function(){
        return caches.match(req).then(function(cached){
          return cached || caches.match('index.html') || caches.match('./');
        });
      })
    );
    return;
  }

  // Other GETs: cache first, fall back to network.
  event.respondWith(
    caches.match(req).then(function(cached){
      if(cached){ return cached; }
      return fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); });
        return res;
      });
    })
  );
});
