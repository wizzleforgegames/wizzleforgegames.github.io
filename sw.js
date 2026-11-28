/* Wizzle Forge Games — офлайн-оболочка. HTML: сеть→кэш; статика: кэш→сеть. */
var V='wzf-v1';
var SHELL=['/','/index.html','/styles.css','/site.js','/logo.png','/favicon.ico','/apple-touch-icon.png','/icon-192.png',
           '/fonts/inter.css','/fonts/inter-cyrillic.woff2','/fonts/inter-latin.woff2',
           '/vendor/fontawesome/css/all.min.css','/vendor/fontawesome/webfonts/fa-solid-900.woff2','/manifest.webmanifest'];
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(V).then(function(c){ return c.addAll(SHELL).catch(function(){}); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){return k!==V;}).map(function(k){return caches.delete(k);})); }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch',function(e){
  var r=e.request;
  if(r.method!=='GET') return;
  var u=new URL(r.url);
  if(u.origin!==location.origin) return;
  if(u.pathname.indexOf('/pay/')===0) return;
  if(r.mode==='navigate'){
    e.respondWith(fetch(r).then(function(res){
      var cp=res.clone(); caches.open(V).then(function(c){ c.put('/', cp); });
      return res;
    }).catch(function(){ return caches.match(r).then(function(x){ return x || caches.match('/'); }); }));
    return;
  }
  if(/\.(css|js|woff2?|png|jpe?g|webp|ico|webmanifest)$/.test(u.pathname)){
    e.respondWith(caches.match(r).then(function(hit){
      var net=fetch(r).then(function(res){ if(res && res.status===200){ var cp=res.clone(); caches.open(V).then(function(c){ c.put(r,cp); }); } return res; }).catch(function(){ return hit; });
      return hit || net;
    }));
  }
});
