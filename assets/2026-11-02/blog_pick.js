DailyWidget.register('blog_pick', function(el, ctx){
  el.innerHTML='<div class="w-grid2"><div><canvas id="hx-cv" width="640" height="480" style="width:100%;border-radius:14px;background:#fff;border:1px solid var(--line);cursor:pointer;touch-action:manipulation"></canvas>'+
   '<div class="w-row"><button class="w-btn" id="hx-mode">'+ctx.bi('Toggle: rings / line','切换：环 / 直线')+'</button><button class="w-btn" id="hx-rot">'+ctx.bi('Rotate 60° around start','绕起点旋转 60°')+'</button></div></div>'+
   '<div class="w-panel"><div class="w-label">'+ctx.bi('Hovered hex (q, r, s)','鼠标所指六边形 (q, r, s)')+'</div><div class="w-big mono" id="hx-co" style="font-size:2rem">0, 0, 0</div>'+
   '<div class="w-muted" style="margin:6px 0">'+ctx.bi('q + r + s is always 0. That one rule makes hex math as easy as squares.','q + r + s 永远等于 0。就这一条规则，让六边形的数学和方格一样简单。')+'</div>'+
   '<div class="w-label" style="margin-top:12px">'+ctx.bi('Distance from the start','离起点的距离')+'</div><div class="w-big" id="hx-d">0</div>'+
   '<div class="w-muted mono" id="hx-f"></div>'+
   '<p class="w-muted">'+ctx.bi('Click a hex to move the start (amber). Hover to measure. Rotating is just shuffling (q, r, s) to (−r, −s, −q). In line mode you see the straight hex line, drawn with a simple lerp-and-round trick from the article.','点一个六边形把起点（琥珀色）挪过去，移动鼠标量距离。旋转只是把 (q, r, s) 换成 (−r, −s, −q)。直线模式会画出六边形直线，用的是文中“插值再取整”的小技巧。')+'</p></div></div>';
  var cv=el.querySelector('#hx-cv'),g=cv.getContext('2d'),S=26,cx=320,cy=240,N=5,start=[0,0],hov=[2,-1],mode='line',walls={};
  var cells=[];for(var q=-N;q<=N;q++)for(var r=Math.max(-N,-q-N);r<=Math.min(N,-q+N);r++)cells.push([q,r]);
  function px(q,r){return [cx+S*Math.sqrt(3)*(q+r/2),cy+S*1.5*r]}
  function dist(a,b){return (Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])+Math.abs(a[0]+a[1]-b[0]-b[1]))/2}
  function round(q,r){var s=-q-r,rq=Math.round(q),rr=Math.round(r),rs=Math.round(s),dq=Math.abs(rq-q),dr=Math.abs(rr-r),ds=Math.abs(rs-s);
    if(dq>dr&&dq>ds)rq=-rr-rs;else if(dr>ds)rr=-rq-rs;return [rq,rr]}
  function line(a,b){var n=dist(a,b),out=[];for(var i=0;i<=n;i++){var t=n?i/n:0;out.push(round(a[0]+(b[0]-a[0])*t+1e-6,a[1]+(b[1]-a[1])*t+1e-6))}return out}
  function hex(x,y,s,fill,stroke){g.beginPath();for(var i=0;i<6;i++){var a=Math.PI/180*(60*i-30);g.lineTo(x+s*Math.cos(a),y+s*Math.sin(a))}g.closePath();g.fillStyle=fill;g.fill();g.strokeStyle=stroke||'#e3e6f0';g.lineWidth=1.5;g.stroke()}
  var ringC=['#fff7e6','#eef2ff','#e0e7ff','#c7d2fe','#a5b4fc','#818cf8','#6366f1','#4f46e5','#4338ca','#3730a3','#312e81'];
  function draw(){g.clearRect(0,0,640,480);var L=mode==='line'?line(start,hov).map(function(c){return c+''}):[];
    cells.forEach(function(c){var p=px(c[0],c[1]),k=c+'',d=dist(c,start),f='#f8f9fc';
      if(mode==='rings')f=ringC[Math.min(d,10)];
      if(L.indexOf(k)>=0)f='#fecaca';
      if(walls[k])f='#cbd5e1';
      if(k===start+'')f='#fbbf24';
      if(k===hov+'')f=mode==='rings'?'#f0545c':'#f0545c';
      hex(p[0],p[1],S-1.5,f);
      if(mode==='rings'&&d<=N*2){g.fillStyle=d>5?'#fff':'#4b5563';g.font='11px Inter,sans-serif';g.textAlign='center';g.fillText(d,p[0],p[1]+4);g.textAlign='left'}
    });
    el.querySelector('#hx-co').textContent=hov[0]+', '+hov[1]+', '+(-hov[0]-hov[1]);
    el.querySelector('#hx-d').textContent=dist(start,hov);
    el.querySelector('#hx-f').textContent='(|Δq| + |Δr| + |Δs|) / 2 = '+dist(start,hov);
  }
  function pick(e){var b=cv.getBoundingClientRect(),x=(e.clientX-b.left)*640/b.width-cx,y=(e.clientY-b.top)*480/b.height-cy;
    var q=(Math.sqrt(3)/3*x-y/3)/S,r=(2/3*y)/S,c=round(q,r);return dist(c,[0,0])<=N?c:null}
  cv.onmousemove=function(e){var c=pick(e);if(c&&c+''!==hov+''){hov=c;draw()}};
  cv.onclick=function(e){var c=pick(e);if(c){start=c;hov=c;draw()}};
  el.querySelector('#hx-mode').onclick=function(){mode=mode==='line'?'rings':'line';draw()};
  el.querySelector('#hx-rot').onclick=function(){var dq=hov[0]-start[0],dr=hov[1]-start[1],ds=-dq-dr,c=[start[0]-dr,start[1]-ds];if(dist(c,[0,0])<=N){hov=c;draw()}};
  ctx.onLang(draw);draw();
});
