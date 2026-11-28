var METRIA_ID=114655120;
(function(){
  document.documentElement.classList.add('js');
  var h=document.querySelector('.header');
  function onScroll(){ if(h) h.classList.toggle('scrolled', window.scrollY>18); }
  onScroll(); window.addEventListener('scroll', onScroll, {passive:true});

  var burger=document.querySelector('.burger'), nav=document.querySelector('.nav');
  if(burger&&nav) burger.addEventListener('click', function(){ nav.classList.toggle('nav--open'); });
  if(nav) nav.addEventListener('click', function(e){ if(e.target.tagName==='A') nav.classList.remove('nav--open'); });

  var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); } }); }, {threshold:.05, rootMargin:'0px 0px 300px 0px'});
  document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });
  setTimeout(function(){ document.querySelectorAll('.reveal:not(.visible)').forEach(function(el){ var r=el.getBoundingClientRect(); if(r.top<window.innerHeight+400) el.classList.add('visible'); }); }, 1200);

  document.querySelectorAll('.faq__q').forEach(function(q){
    q.addEventListener('click', function(){ q.parentNode.classList.toggle('open'); });
  });

  document.querySelectorAll('.play-frame').forEach(function(f){
    var b=f.querySelector('.playbtn'); if(!b) return;
    b.addEventListener('click', function(){
      var src=f.getAttribute('data-src'); if(!src) return;
      var ifr=document.createElement('iframe');
      ifr.setAttribute('allow','fullscreen; autoplay; gamepad');
      ifr.setAttribute('allowfullscreen','');
      ifr.src=src; f.innerHTML=''; f.appendChild(ifr);
      try{ if(window.ym) ym(METRIA_ID,'reachGoal','play'); }catch(e){}
    });
  });

  document.querySelectorAll('video').forEach(function(v){
    v.addEventListener('play', function(){ try{ if(window.ym) ym(METRIA_ID,'reachGoal','video'); }catch(e){} }, {once:true});
  });

  var imgs=[], idx=0;
  document.querySelectorAll('.shot img').forEach(function(im){ imgs.push(im.src); });
  var lb=document.querySelector('.lb');
  function show(i){ if(!lb) return; idx=(i+imgs.length)%imgs.length; lb.querySelector('img').src=imgs[idx]; lb.classList.add('on'); }
  document.querySelectorAll('.shot').forEach(function(el){
    el.addEventListener('click', function(){ show(imgs.indexOf(el.querySelector('img').src)); });
  });
  if(lb){
    lb.addEventListener('click', function(e){
      if(e.target.classList.contains('lb__close')||e.target===lb) lb.classList.remove('on');
      if(e.target.classList.contains('prev')) show(idx-1);
      if(e.target.classList.contains('next')) show(idx+1);
    });
    document.addEventListener('keydown', function(e){
      if(!lb.classList.contains('on')) return;
      if(e.key==='Escape') lb.classList.remove('on');
      if(e.key==='ArrowLeft') show(idx-1);
      if(e.key==='ArrowRight') show(idx+1);
    });
  }
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();
/*sw*/
  if('serviceWorker' in navigator && location.protocol==='https:'){
    try{ navigator.serviceWorker.register('/sw.js'); }catch(e){}
  }
})();