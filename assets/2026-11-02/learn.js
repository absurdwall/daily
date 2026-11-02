DailyWidget.register('learn', function(el, ctx){
  var LM=[[1.8,'a person','一个人'],[828,'Burj Khalifa','哈利法塔'],[8849,'Mount Everest','珠穆朗玛峰'],[100e3,'edge of space (Kármán line)','太空边界（卡门线）'],[408e3,'Space Station orbit','空间站轨道'],[384400e3,'the Moon','月球'],[149.6e9,'the Sun','太阳']];
  el.innerHTML='<div class="w-grid2"><div><div class="w-row"><span class="w-label">'+ctx.bi('Folds','对折次数')+'</span><input type="range" id="pf-n" min="0" max="52" value="0" style="flex:1"><b class="mono" id="pf-nv">0</b></div>'+
   '<canvas id="pf-cv" width="640" height="320" style="width:100%;border-radius:14px;background:linear-gradient(#eef2ff,#fff);border:1px solid var(--line)"></canvas>'+
   '<div class="w-row"><button class="w-btn primary" id="pf-fold">'+ctx.bi('Fold once more','再折一次')+'</button><button class="w-btn" id="pf-auto">'+ctx.bi('Fold to the Moon','一路折到月球')+'</button><button class="w-btn" id="pf-reset">'+ctx.bi('Reset','重来')+'</button></div></div>'+
   '<div class="w-panel"><div class="w-label">'+ctx.bi('Stack height (0.1 mm paper)','纸堆高度（0.1 毫米厚的纸）')+'</div><div class="w-big" id="pf-h" style="font-size:2.4rem">0.1 mm</div>'+
   '<div id="pf-lm" style="margin:10px 0;font-weight:650"></div>'+
   '<div class="w-label">'+ctx.bi('Paper strip you would need (Gallivan’s formula)','需要多长的纸条（Gallivan 公式）')+'</div><div class="mono" id="pf-L" style="font-size:1.2rem;font-weight:700;color:var(--sec)"></div>'+
   '<p class="w-muted">'+ctx.bi('Each fold doubles the thickness, but the curved edges eat paper. The length you need grows about 4× per fold, which is why the real record is 12.','每折一次厚度翻倍，但弯折处会“吃掉”纸。所需长度每折大约变成 4 倍，所以真实纪录只有 12 次。')+'</p></div></div>';
  var n=0,timer=null,cv=el.querySelector('#pf-cv'),g=cv.getContext('2d'),t=1e-4;
  function fmt(m){var zh=ctx.lang()==='zh';if(m<0.01)return (m*1000).toFixed(m<0.001?1:0)+(zh?' 毫米':' mm');if(m<1)return (m*100).toFixed(1)+(zh?' 厘米':' cm');if(m<1000)return m.toFixed(m<10?1:0)+(zh?' 米':' m');
    var km=m/1000;if(km<1e9)return Math.round(km).toLocaleString()+(zh?' 公里':' km');var ly=m/9.4607e15;if(ly<0.1)return (km/1.496e8).toFixed(1)+(zh?' 个日地距离':' Sun distances');return Math.round(ly).toLocaleString()+(zh?' 光年':' light-years')}
  function draw(){var zh=ctx.lang()==='zh',H=t*Math.pow(2,n);el.querySelector('#pf-n').value=n;el.querySelector('#pf-nv').textContent=n;
    el.querySelector('#pf-h').textContent=fmt(H);
    var passed=LM.filter(function(l){return H>=l[0]}).pop(),next=LM.filter(function(l){return H<l[0]})[0];
    el.querySelector('#pf-lm').innerHTML=(passed?('✅ '+(zh?'超过了':'Past ')+(zh?passed[2]:passed[1])):'')+(next?('<div class="w-muted">'+(zh?'下一站：':'Next: ')+(zh?next[2]:next[1])+' · '+fmt(next[0])+'</div>'):'');
    var L=Math.PI*t/6*(Math.pow(2,n)+4)*(Math.pow(2,n)-1);el.querySelector('#pf-L').textContent=n?fmt(L):'—';
    g.clearRect(0,0,640,320);var lo=-4,hi=12;function Y(m){return 300-(Math.log10(m)-lo)/(hi-lo)*280}
    g.strokeStyle='#c7cbe0';g.beginPath();g.moveTo(90,20);g.lineTo(90,300);g.stroke();
    g.font='12px Inter,sans-serif';LM.concat([[1e-4,'one sheet','一张纸']]).forEach(function(l){var y=Y(l[0]);g.fillStyle=H>=l[0]?'#4f46e5':'#9aa0b5';g.fillRect(84,y-1,12,2);g.fillText(zh?l[2]:l[1],104,y+4+(l[0]===408e3?-9:l[0]===100e3?6:0))});
    var top=Y(Math.max(H,1e-4)),grd=g.createLinearGradient(0,300,0,top);grd.addColorStop(0,'#4f46e5');grd.addColorStop(1,'#f0545c');
    g.fillStyle=grd;g.fillRect(30,Math.max(20,top),36,300-Math.max(20,top));g.fillStyle='#7a8099';g.fillText(zh?'对数刻度':'log scale',14,14);
  }
  function fold(){if(n<52){n++;draw()}}
  el.querySelector('#pf-n').oninput=function(){n=+this.value;draw()};
  el.querySelector('#pf-fold').onclick=fold;
  el.querySelector('#pf-reset').onclick=function(){clearInterval(timer);n=0;draw()};
  el.querySelector('#pf-auto').onclick=function(){clearInterval(timer);n=0;draw();timer=setInterval(function(){if(n>=42){clearInterval(timer);return}fold()},ctx.reduced?20:160)};
  ctx.onLang(draw);draw();
});
