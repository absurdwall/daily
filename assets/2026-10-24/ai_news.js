DailyWidget.register('ai_news', function(el, ctx){
  el.innerHTML =
    '<div class="w-grid2"><div>'+
    '<div class="w-row"><span class="w-label">'+ctx.bi('Secret message (Agent A)','秘密信息（智能体 A）')+'</span></div>'+
    '<div class="w-row"><input class="w-input mono" id="cc-msg" maxlength="6" value="HI" style="flex:1">'+
    '<button class="w-btn primary" id="cc-go">'+ctx.bi('Send via cache','借缓存发送')+'</button></div>'+
    '<canvas id="cc-cv" width="640" height="260" style="width:100%;border-radius:14px;background:#fff;border:1px solid var(--line)"></canvas>'+
    '<div class="w-row"><label class="w-label">'+ctx.bi('Noise','噪声')+'</label><input type="range" id="cc-noise" min="0" max="60" value="10" style="flex:1"></div>'+
    '</div><div class="w-panel">'+
    '<div class="w-label">'+ctx.bi('Agent B decoded','智能体 B 解码结果')+'</div><div class="w-big mono" id="cc-out">—</div>'+
    '<div class="w-muted mono" id="cc-bits" style="word-break:break-all;margin:8px 0"></div>'+
    '<p class="w-muted">'+ctx.bi('A evicts a cache line for a 1 and leaves it for a 0. B times each reload: slow (red) = 1, fast (green) = 0. No network, no shared file, just timing.','A 想发 1 就把一行缓存挤掉，发 0 就不动。B 测每次重新读取的耗时：慢（红）= 1，快（绿）= 0。没有网络、没有共享文件，只靠计时。')+'</p>'+
    '<p class="w-muted">'+ctx.bi('Crank up the noise and watch errors creep in, which is why real attackers repeat each bit.','把噪声调大，错误就会冒出来——所以真实攻击会把每一位重复发送多次。')+'</p></div></div>';
  var cv=el.querySelector('#cc-cv'), g=cv.getContext('2d'), out=el.querySelector('#cc-out'), bitsEl=el.querySelector('#cc-bits');
  var bits=[], times=[], decoded='', k=0, timer=null, TH=120;
  function draw(){
    g.clearRect(0,0,640,260);
    g.strokeStyle='#c7cbe0'; g.setLineDash([5,5]); g.beginPath(); g.moveTo(30,260-TH); g.lineTo(630,260-TH); g.stroke(); g.setLineDash([]);
    g.fillStyle='#7a8099'; g.font='12px Inter,sans-serif'; g.fillText(ctx.lang()==='zh'?'阈值：慢 = 1':'threshold: slow = 1',34,260-TH-6);
    var n=bits.length||1, w=Math.min(36,580/n);
    for(var i=0;i<times.length;i++){var h=times[i], x=34+i*w;
      g.fillStyle=h>TH?'#f0545c':'#10b981'; g.beginPath(); g.roundRect?g.roundRect(x,252-h,w-4,h,4):g.rect(x,252-h,w-4,h); g.fill();}
  }
  function step(){
    if(k>=bits.length){clearInterval(timer);timer=null;return}
    var noise=+el.querySelector('#cc-noise').value;
    var t=(bits[k]?170:55)+(Math.random()*2-1)*noise*1.6; t=Math.max(10,Math.min(240,t));
    times.push(t); var b=t>TH?1:0; k++;
    var got=times.map(function(t){return t>TH?1:0}).join('');
    bitsEl.textContent=got.replace(/(.{8})/g,'$1 ');
    decoded=''; for(var i=0;i+8<=got.length;i+=8){decoded+=String.fromCharCode(parseInt(got.substr(i,8),2))}
    out.textContent=decoded||'…'; draw();
  }
  function go(){
    var m=(el.querySelector('#cc-msg').value||'HI').replace(/[^\x20-\x7e]/g,'?');
    bits=[]; for(var i=0;i<m.length;i++){var s=m.charCodeAt(i).toString(2); while(s.length<8)s='0'+s; s.split('').forEach(function(c){bits.push(+c)})}
    times=[]; k=0; out.textContent='…'; if(timer)clearInterval(timer);
    timer=setInterval(step, ctx.reduced?10:90);
  }
  el.querySelector('#cc-go').onclick=go;
  ctx.onLang(draw);
  var started=false; ctx.onVisible(function(v){if(v&&!started){started=true;go()}});
  draw();
});
