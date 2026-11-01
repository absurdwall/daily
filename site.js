// Scroll-reveal + widget runtime. Loaded with defer on every page, after lang.js.
// Widget scripts call:  DailyWidget.register('<section-key>', function(el, ctx){ ... })
// ctx.lang() -> 'en'|'zh'; ctx.t({en,zh}) -> string; ctx.onLang(fn) re-run on toggle;
// ctx.bi(en, zh) -> HTML with both spans (CSS shows the right one automatically);
// ctx.onVisible(fn(visible)) to pause animations off-screen; ctx.reduced = prefers-reduced-motion.
(function(){
  var regs={};
  window.DailyWidget={register:function(key,fn){regs[key]=fn; mount(key)}};
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function mount(key){
    var el=document.querySelector('[data-widget="'+key+'"]');
    if(!el||el.__mounted||!regs[key]) return;
    el.__mounted=true;
    var visCbs=[];
    var ctx={
      lang:function(){return window.DailyLang.get()},
      t:function(p){return window.DailyLang.t(p)},
      bi:function(en,zh){return '<span data-lang="en">'+esc(en)+'</span><span data-lang="zh">'+esc(zh)+'</span>'},
      onLang:function(fn){document.addEventListener('langchange',function(e){fn(e.detail)})},
      onVisible:function(fn){visCbs.push(fn)},
      reduced: window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches
    };
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(es){es.forEach(function(e){visCbs.forEach(function(f){f(e.isIntersecting)})})},{threshold:0.05}).observe(el);
    } else setTimeout(function(){visCbs.forEach(function(f){f(true)})},0);
    try{ regs[key](el,ctx); el.classList.add('ready'); }
    catch(err){ console.error('widget '+key+' failed', err); el.innerHTML='<p class="widget-err">Interactive failed to load.</p>'; }
  }
  function init(){
    Object.keys(regs).forEach(mount);
    var els=document.querySelectorAll('.reveal');
    if(!('IntersectionObserver' in window)){for(var i=0;i<els.length;i++)els[i].classList.add('in');return}
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:0.08,rootMargin:'0px 0px -40px 0px'});
    for(var j=0;j<els.length;j++) io.observe(els[j]);
    // autoplay videos only when visible
    var vids=document.querySelectorAll('video[data-autoplay]');
    var vio=new IntersectionObserver(function(es){es.forEach(function(e){var v=e.target; if(e.isIntersecting){var p=v.play(); if(p&&p.catch)p.catch(function(){})} else v.pause()})},{threshold:0.2});
    for(var k=0;k<vids.length;k++) vio.observe(vids[k]);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
