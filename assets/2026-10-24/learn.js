DailyWidget.register('learn', function(el, ctx){
  el.innerHTML='<div class="w-grid2"><div><div class="w-row"><span class="w-label">'+ctx.bi('People in the room','房间里的人数')+'</span><b id="bd-n" class="mono">23</b></div>'+
   '<input type="range" id="bd-r" min="2" max="80" value="23" style="width:100%">'+
   '<canvas id="bd-cv" width="640" height="300" style="width:100%;border-radius:14px;background:#fff;border:1px solid var(--line);margin-top:10px"></canvas>'+
   '<div class="w-row"><button class="w-btn primary" id="bd-sim">'+ctx.bi('Fill a random room','随机来一屋子人')+'</button><button class="w-btn" id="bd-100">'+ctx.bi('Try 100 rooms','试 100 个房间')+'</button></div></div>'+
   '<div class="w-panel"><div class="w-label">'+ctx.bi('Chance two share a birthday','有人同一天生日的概率')+'</div><div class="w-big" id="bd-p"></div>'+
   '<div class="w-muted" id="bd-pairs"></div><div id="bd-res" style="margin-top:12px;font-weight:650"></div></div></div>';
  var r=el.querySelector('#bd-r'), cv=el.querySelector('#bd-cv'), g=cv.getContext('2d'), room=null, match=-1;
  function P(n){var q=1;for(var i=0;i<n;i++)q*=(365-i)/365;return 1-q}
  function draw(){
    var n=+r.value; el.querySelector('#bd-n').textContent=n;
    el.querySelector('#bd-p').textContent=(P(n)*100).toFixed(1)+'%';
    var pairs=n*(n-1)/2; el.querySelector('#bd-pairs').textContent=ctx.lang()==='zh'?(n+' 人 = '+pairs+' 对可能撞生日'):(n+' people = '+pairs+' pairs that could match');
    g.clearRect(0,0,640,300);
    if(room){ // dots on a year ring
      var cx=320,cy=150,R=120;g.strokeStyle='#e9ebf2';g.lineWidth=14;g.beginPath();g.arc(cx,cy,R,0,7);g.stroke();
      room.forEach(function(d,i){var a=d/365*Math.PI*2-Math.PI/2, hit=room.indexOf(d)!==room.lastIndexOf(d);
        g.fillStyle=hit?'#f0545c':'#4f46e5';g.beginPath();g.arc(cx+Math.cos(a)*R,cy+Math.sin(a)*R,hit?8:5,0,7);g.fill()});
      g.fillStyle='#7a8099';g.font='13px Inter,sans-serif';g.textAlign='center';g.fillText(ctx.lang()==='zh'?'一年 365 天':'365 days of the year',cx,cy+4);g.textAlign='left';
      return;
    }
    g.strokeStyle='#e9ebf2';g.lineWidth=1;g.beginPath();g.moveTo(40,20);g.lineTo(40,270);g.lineTo(620,270);g.stroke();
    g.strokeStyle='#4f46e5';g.lineWidth=3;g.beginPath();for(var k=1;k<=80;k++){g.lineTo(40+(k-1)/79*580,270-P(k)*250)}g.stroke();
    g.setLineDash([4,4]);g.strokeStyle='#c7cbe0';g.beginPath();g.moveTo(40,145);g.lineTo(620,145);g.stroke();g.setLineDash([]);
    var x=40+(n-1)/79*580,y=270-P(n)*250;g.fillStyle='#f0545c';g.beginPath();g.arc(x,y,8,0,7);g.fill();
    g.fillStyle='#7a8099';g.font='12px Inter,sans-serif';g.fillText('50%',8,149);g.fillText(ctx.lang()==='zh'?'人数 →':'people →',560,290);
  }
  function fill(){var n=+r.value;room=[];for(var i=0;i<n;i++)room.push(Math.floor(Math.random()*365));
    var hit=room.some(function(d,i){return room.indexOf(d)!==i});
    el.querySelector('#bd-res').innerHTML=hit?ctx.bi('Match! Red dots share a birthday.','撞上了！红点就是同一天生日的人。'):ctx.bi('No match this time — try again.','这次没撞上，再试一次。');
    draw();}
  el.querySelector('#bd-sim').onclick=fill;
  el.querySelector('#bd-100').onclick=function(){var n=+r.value,h=0;for(var t=0;t<100;t++){var s={},hit=false;for(var i=0;i<n;i++){var d=Math.floor(Math.random()*365);if(s[d]){hit=true;break}s[d]=1}if(hit)h++}
    room=null;el.querySelector('#bd-res').innerHTML=ctx.bi(h+' of 100 rooms had a shared birthday.','100 个房间里有 '+h+' 个出现了同一天生日。');draw()};
  r.oninput=function(){room=null;el.querySelector('#bd-res').innerHTML='';draw()};
  ctx.onLang(draw); draw();
});
