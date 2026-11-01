// Shared EN / 中文 toggle. Any element with data-lang="en" | "zh" is shown only in its language
// (pure CSS via html[data-current-lang]), so content added later by widgets switches too.
// API: DailyLang.get(), DailyLang.set('en'|'zh'), event 'langchange' on document (detail = lang).
(function(){
  var KEY='daily-lang';
  function get(){try{return localStorage.getItem(KEY)==='zh'?'zh':'en'}catch(e){return 'en'}}
  function apply(lang){
    var h=document.documentElement;
    h.setAttribute('lang', lang==='zh'?'zh-CN':'en');
    h.setAttribute('data-current-lang', lang);
    var btns=document.querySelectorAll('.lang-toggle');
    for(var j=0;j<btns.length;j++){
      btns[j].innerHTML = '<span class="'+(lang==='en'?'on':'')+'">EN</span><span class="'+(lang==='zh'?'on':'')+'">中文</span>';
      btns[j].setAttribute('aria-label', lang==='zh'?'Switch to English':'切换到中文');
    }
    document.dispatchEvent(new CustomEvent('langchange',{detail:lang}));
  }
  apply(get()); // runs in <head>: no flash of the wrong language
  window.DailyLang={get:get,apply:apply,set:function(l){try{localStorage.setItem(KEY,l)}catch(e){};apply(l)},
    t:function(p){return p? (p[get()]||p.en||'') : ''}};
  document.addEventListener('DOMContentLoaded',function(){
    apply(get());
    var btns=document.querySelectorAll('.lang-toggle');
    for(var j=0;j<btns.length;j++){btns[j].addEventListener('click',function(){window.DailyLang.set(get()==='zh'?'en':'zh')});}
  });
})();
