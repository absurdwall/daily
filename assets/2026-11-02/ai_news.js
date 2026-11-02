DailyWidget.register('ai_news', function(el, ctx){
  var SL={en:[["The","A","This","One"],["quick","calm","bright","small","clever","quiet"],["robot","model","writer","machine","bot","agent"],["wrote","made","drafted","typed","shaped","sent"],["a","one","another","the"],["short","simple","gentle","lovely","tiny","neat"],["poem","note","story","reply","line","message"],["today.","tonight.","at dawn.","for fun.","again.","quickly."]],
          zh:[["今天","早上","刚才","晚上"],["那个","这个","一个","某个"],["聪明的","安静的","可爱的","勤快的","友好的","机灵的"],["机器人","模型","助手","程序","智能体","写手"],["写了","发了","编了","想了","改了","画了"],["一首","一段","一封","一句","一篇","一则"],["短诗。","留言。","故事。","回信。","笔记。","小文。"]]};
  el.innerHTML='<div class="w-grid2"><div>'+
   '<div class="w-row"><button class="w-btn primary" id="wm-on">'+ctx.bi('Write with watermark','带水印写一段')+'</button><button class="w-btn" id="wm-off">'+ctx.bi('Write without','不带水印写一段')+'</button><button class="w-btn" id="wm-para">'+ctx.bi('Paraphrase 25%','改写 25% 的词')+'</button></div>'+
   '<div class="w-row"><span class="w-label">'+ctx.bi('Length (words)','长度（词数）')+'</span><input type="range" id="wm-len" min="8" max="160" value="64" style="flex:1"><b class="mono" id="wm-ln">64</b></div>'+
   '<div class="w-row"><label class="w-label"><input type="checkbox" id="wm-show"> '+ctx.bi('Reveal the secret green list','显示秘密“绿名单”')+'</label></div>'+
   '<div id="wm-text" style="line-height:2;background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;min-height:140px;font-size:1rem"></div></div>'+
   '<div class="w-panel"><div class="w-label">'+ctx.bi('Detector says','检测器结论')+'</div><div class="w-big" id="wm-verdict" style="font-size:2.2rem">—</div>'+
   '<div class="w-muted mono" id="wm-stats" style="margin:8px 0"></div>'+
   '<canvas id="wm-cv" width="420" height="70" style="width:100%"></canvas>'+
   '<p class="w-muted">'+ctx.bi('Each word is secretly "green" or "red", decided by a hash of the word before it. Normal text lands on green about half the time. A watermarking model quietly prefers green words, so its text is green far more often than chance.','每个词都被秘密地分成“绿”或“红”，由它前一个词的哈希决定。普通文本大约一半落在绿色。带水印的模型会悄悄偏爱绿词，所以它写的东西绿得远超偶然。')+'</p>'+
   '<p class="w-muted">'+ctx.bi('Try short text, or paraphrase a few times: the signal fades. That is why the docs say longer text gives a stronger signal.','试试短文本，或多改写几次：信号会变弱。这正是文档说“文本越长信号越强”的原因。')+'</p></div></div>';
  var words=[], marked=false;
  function h(s){var x=2166136261;for(var i=0;i<s.length;i++){x^=s.charCodeAt(i);x=Math.imul(x,16777619)}return x>>>0}
  function green(prev,w){return h(prev+'|'+w)%2===0}
  function slots(){return SL[ctx.lang()==='zh'?'zh':'en']}
  function write(wm){marked=wm;var S=slots(),n=+el.querySelector('#wm-len').value;words=[];var prev='^';
    for(var i=0;words.length<n;i++){var opts=S[i%S.length],pick;
      if(wm&&Math.random()<0.9){var g=opts.filter(function(w){return green(prev,w)});pick=(g.length?g:opts)[Math.floor(Math.random()*(g.length?g.length:opts.length))]}
      else pick=opts[Math.floor(Math.random()*opts.length)];
      words.push({w:pick,slot:i%S.length});prev=pick}
    render()}
  function para(){var S=slots();words.forEach(function(o){if(Math.random()<0.25){var opts=S[o.slot]||S[0];o.w=opts[Math.floor(Math.random()*opts.length)]}});render()}
  function render(){var show=el.querySelector('#wm-show').checked,zh=ctx.lang()==='zh',prev='^',G=0,html='';
    words.forEach(function(o){var g=green(prev,o.w);if(g)G++;prev=o.w;
      html+='<span style="padding:2px 4px;border-radius:6px;'+(show?(g?'background:#d1fae5;color:#065f46':'background:#fee2e2;color:#991b1b'):'')+'">'+o.w+'</span>'+(zh?'':' ')});
    el.querySelector('#wm-text').innerHTML=html||'<span class="w-muted">…</span>';
    var N=words.length;if(!N)return;var z=(G-N/2)/Math.sqrt(N/4),v=el.querySelector('#wm-verdict');
    v.textContent=z>4?(zh?'有水印':'Watermarked'):z>2?(zh?'不确定':'Uncertain'):(zh?'无水印':'Not watermarked');
    v.style.color=z>4?'#4f46e5':z>2?'#d97706':'#7a8099';
    el.querySelector('#wm-stats').textContent=(zh?'绿词 ':'green ')+G+'/'+N+' ('+Math.round(G/N*100)+'%) · z = '+z.toFixed(1);
    var cv=el.querySelector('#wm-cv'),g=cv.getContext('2d');g.clearRect(0,0,420,70);
    var bands=[[-2,2,'#e5e7eb'],[2,4,'#fde68a'],[4,12,'#c7d2fe']];
    function X(z){return 10+(Math.max(-2,Math.min(12,z))+2)/14*400}
    bands.forEach(function(b){g.fillStyle=b[2];g.fillRect(X(b[0]),22,X(b[1])-X(b[0]),18)});
    g.fillStyle='#f0545c';g.beginPath();g.arc(X(z),31,9,0,7);g.fill();
    g.fillStyle='#7a8099';g.font='12px Inter,sans-serif';[0,2,4,8,12].forEach(function(t){g.fillText(t,X(t)-3,58)});g.fillText('z',2,14);
  }
  el.querySelector('#wm-on').onclick=function(){write(true)};
  el.querySelector('#wm-off').onclick=function(){write(false)};
  el.querySelector('#wm-para').onclick=para;
  el.querySelector('#wm-show').onchange=render;
  el.querySelector('#wm-len').oninput=function(){el.querySelector('#wm-ln').textContent=this.value};
  el.querySelector('#wm-len').onchange=function(){write(marked)};
  ctx.onLang(function(){write(marked)});
  write(true);
});
