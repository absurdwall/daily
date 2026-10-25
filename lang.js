// Shared EN / 中文 toggle. Elements carry data-lang="en" or data-lang="zh".
(function(){
  var KEY='daily-lang';
  function get(){try{return localStorage.getItem(KEY)||'en'}catch(e){return 'en'}}
  function apply(lang){
    document.documentElement.setAttribute('lang', lang==='zh'?'zh-CN':'en');
    document.documentElement.setAttribute('data-current-lang', lang);
    var els=document.querySelectorAll('[data-lang]');
    for(var i=0;i<els.length;i++){els[i].hidden = els[i].getAttribute('data-lang')!==lang;}
    var btns=document.querySelectorAll('.lang-toggle');
    for(var j=0;j<btns.length;j++){btns[j].textContent = lang==='zh'?'EN':'中文';
      btns[j].setAttribute('aria-label', lang==='zh'?'Switch to English':'切换到中文');}
    document.dispatchEvent(new CustomEvent('langchange',{detail:lang}));
  }
  window.DailyLang={get:get,apply:apply,set:function(l){try{localStorage.setItem(KEY,l)}catch(e){};apply(l)}};
  document.addEventListener('DOMContentLoaded',function(){
    apply(get());
    var btns=document.querySelectorAll('.lang-toggle');
    for(var j=0;j<btns.length;j++){btns[j].addEventListener('click',function(){window.DailyLang.set(get()==='zh'?'en':'zh')});}
  });
})();
