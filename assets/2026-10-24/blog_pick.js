DailyWidget.register('blog_pick', function(el, ctx){
  el.innerHTML='<div class="w-grid2"><canvas id="wt" width="600" height="420" style="width:100%;border-radius:14px;background:#fff;border:1px solid var(--line)"></canvas>'+
   '<div class="w-panel"><div class="w-label">'+ctx.bi('Balance wheel beats','摆轮振频')+'</div><div class="w-big" id="wt-hz">3 Hz</div>'+
   '<input type="range" id="wt-f" min="1" max="5" step="0.5" value="3" style="width:100%">'+
   '<div class="w-label" style="margin-top:12px">'+ctx.bi('Mainspring wind','发条上紧程度')+'</div>'+
   '<input type="range" id="wt-w" min="0" max="100" value="80" style="width:100%">'+
   '<div class="w-row"><button class="w-btn primary" id="wt-wind">'+ctx.bi('Wind it up','上满发条')+'</button></div>'+
   '<p class="w-muted">'+ctx.bi('Each swing of the balance wheel (purple) flicks the pallet fork (blue), which lets the escape wheel (teal) advance exactly one tooth. Faster beats = finer ticks. Let the spring run down and the swing shrinks until the watch stops.','摆轮（紫）每摆一次，就拨动擒纵叉（蓝），让擒纵轮（青）正好前进一齿。振频越高，“嘀嗒”越细密。发条走完，摆幅越来越小，表就停了。')+'</p></div></div>';
  var cv=el.querySelector('#wt'), g=cv.getContext('2d'), fR=el.querySelector('#wt-f'), wR=el.querySelector('#wt-w');
  var t=0, teeth=0, last=performance.now(), vis=false, prevSide=0, secs=0;
  fR.oninput=function(){el.querySelector('#wt-hz').textContent=fR.value+' Hz'};
  el.querySelector('#wt-wind').onclick=function(){wR.value=100};
  function gear(x,y,r,n,a,col){g.save();g.translate(x,y);g.rotate(a);g.fillStyle=col;g.beginPath();
    for(var i=0;i<n;i++){var a0=i/n*Math.PI*2,a1=(i+.5)/n*Math.PI*2;g.lineTo(Math.cos(a0)*r,Math.sin(a0)*r);g.lineTo(Math.cos(a0+.08)*(r+12),Math.sin(a0+.08)*(r+12));g.lineTo(Math.cos(a1)*r,Math.sin(a1)*r)}
    g.closePath();g.fill();g.fillStyle='#fff';g.beginPath();g.arc(0,0,6,0,7);g.fill();g.restore()}
  function frame(now){
    var dt=Math.min(.05,(now-last)/1000); last=now;
    var wind=+wR.value, amp=wind>0?Math.min(1,.25+wind/100):0, f=+fR.value;
    if(vis&&wind>0){t+=dt; wR.value=Math.max(0,wind-dt*1.2)}
    var ang=amp*1.9*Math.sin(t*Math.PI*f), side=ang>0?1:-1;
    if(side!==prevSide&&wind>0){teeth++;prevSide=side; secs+=1/(2*f)}
    g.clearRect(0,0,600,420);
    // balance wheel
    g.save();g.translate(170,210);g.rotate(ang);g.strokeStyle='#8b5cf6';g.lineWidth=10;g.beginPath();g.arc(0,0,105,0,7);g.stroke();
    g.lineWidth=6;for(var i=0;i<3;i++){g.rotate(Math.PI*2/3);g.beginPath();g.moveTo(0,0);g.lineTo(105,0);g.stroke()}
    g.fillStyle='#f0545c';g.beginPath();g.arc(0,-60,8,0,7);g.fill();g.restore();
    // hairspring
    g.strokeStyle='#d9a441';g.lineWidth=2;g.beginPath();for(var a=0;a<Math.PI*10;a+=.1){var r=6+a*2.4+Math.sin(ang)*a*.15;g.lineTo(170+Math.cos(a+ang)*r,210+Math.sin(a+ang)*r)}g.stroke();
    // pallet fork
    g.save();g.translate(335,210);g.rotate(side*.18);g.fillStyle='#3b82f6';g.fillRect(-60,-6,120,12);g.fillRect(40,-30,10,60);g.restore();
    // escape wheel
    gear(470,210,70,15,teeth*Math.PI*2/30,'#14b8a6');
    // seconds dial
    g.strokeStyle='#e9ebf2';g.lineWidth=2;g.beginPath();g.arc(530,70,40,0,7);g.stroke();
    g.strokeStyle='#0f1222';g.lineWidth=3;g.beginPath();g.moveTo(530,70);var sa=secs/60*Math.PI*2-Math.PI/2;g.lineTo(530+Math.cos(sa)*34,70+Math.sin(sa)*34);g.stroke();
    g.fillStyle='#7a8099';g.font='13px Inter,sans-serif';g.fillText((ctx.lang()==='zh'?'嘀嗒 ':'ticks ')+teeth,20,30);
    g.fillText((ctx.lang()==='zh'?'发条 ':'spring ')+Math.round(+wR.value)+'%',20,50);
    requestAnimationFrame(frame);
  }
  ctx.onVisible(function(v){vis=v}); requestAnimationFrame(frame);
});
