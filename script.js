(function(){'use strict';
window.addEventListener('error',e=>{const m=document.getElementById('errMsg');if(m){m.textContent='Script error: '+e.message;document.querySelectorAll('.screen').forEach(x=>x.classList.toggle('on',x.id==='error'))}});
const $=id=>document.getElementById(id),cv=$('c'),ctx=cv.getContext('2d'),cam=$('cam');
const CDN='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODEL='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
let W,H,R,dpr;
function resize(){dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);R=Math.max(26,Math.min(58,Math.min(W,H)*.075))}
addEventListener('resize',resize);resize();
const S={state:'menu',mode:'classic',sens:3,mouse:false,stream:null,hl:null,score:0,shown:0,lives:3,time:60,fruits:[],halves:[],parts:[],texts:[],trail:[],spawnT:0,el:0,shake:0,flash:0,chain:{n:0,t:0},mute:false,lastHand:-1e9,handSince:0,ptr:{x:0,y:0,on:false,t:0},prev:null,sm:null,lastVT:-1,fx:1,splats:[],slashes:[],amb:null};
const FR={watermelon:{r:1.3,o:'#2e9a45',i:'#ff3b5c',j:'#ff6b81'},apple:{r:1,o:'#d7263d',i:'#fff1c9',j:'#ffd7a8'},banana:{r:1.1,o:'#ffd23f',i:'#fff3b0',j:'#ffe680'},orange:{r:1.05,o:'#ff8a1f',i:'#ffb347',j:'#ff9f2e'},pineapple:{r:1.2,o:'#e8b020',i:'#fff08a',j:'#ffe14d'},strawberry:{r:.85,o:'#e0183f',i:'#ff7a9a',j:'#ff4d6d'}};
const KEYS=Object.keys(FR),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rnd=(a,b)=>a+Math.random()*(b-a);
const hiKey=()=>'slicemotion_hi_'+S.mode,getHi=()=>{try{return +localStorage.getItem(hiKey())||0}catch(e){return 0}};
const setTxt=(el,v)=>{if(el._v!==v){el.textContent=v;el._v=v}};
/* ---------- sound ---------- */
let AC;
function tone(f,d,ty='sine',v=.12,f2,delay=0){if(S.mute)return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();const a=AC,t=a.currentTime+delay,o=a.createOscillator(),g=a.createGain();o.type=ty;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+d)}catch(e){}}
/* ---------- drawing ---------- */
function body(t,r){
  const f=FR[t];
  if(t==='banana'){ctx.lineCap='round';ctx.strokeStyle='#b8900a';ctx.lineWidth=r*.62;ctx.beginPath();ctx.arc(0,-r*.5,r*1.1,.2*Math.PI,.8*Math.PI);ctx.stroke();ctx.strokeStyle=f.o;ctx.lineWidth=r*.5;ctx.stroke();ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=r*.09;ctx.beginPath();ctx.arc(0,-r*.55,r*1,.3*Math.PI,.7*Math.PI);ctx.stroke();return}
  ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.arc(r*.1,r*.14,r,0,7);ctx.fill();
  if(t==='pineapple'){ctx.fillStyle='#2f9e44';for(let i=-2;i<=2;i++){ctx.beginPath();ctx.ellipse(i*r*.2,-r*1.05,r*.12,r*.5,i*.3,0,7);ctx.fill()}}
  ctx.fillStyle=f.o;ctx.beginPath();t==='pineapple'?ctx.ellipse(0,0,r*.8,r,0,0,7):ctx.arc(0,0,r,0,7);ctx.fill();
  const g=ctx.createRadialGradient(-r*.35,-r*.4,r*.05,0,0,r*1.1);g.addColorStop(0,'rgba(255,255,255,.6)');g.addColorStop(.5,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(0,0,30,.5)');ctx.fillStyle=g;ctx.fill();
  ctx.lineWidth=r*.08;
  if(t==='watermelon'){ctx.strokeStyle='rgba(0,70,15,.6)';for(const k of[.3,.65,.92]){ctx.beginPath();ctx.ellipse(0,0,r*k,r,0,-1.45,1.45);ctx.stroke();ctx.beginPath();ctx.ellipse(0,0,r*k,r,0,Math.PI-1.45,Math.PI+1.45);ctx.stroke()}}
  else if(t==='pineapple'){ctx.strokeStyle='rgba(120,60,0,.45)';for(let i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(i*r*.25-r*.5,-r*.8);ctx.lineTo(i*r*.25+r*.5,r*.8);ctx.moveTo(i*r*.25+r*.5,-r*.8);ctx.lineTo(i*r*.25-r*.5,r*.8);ctx.stroke()}}
  else if(t==='strawberry'){ctx.fillStyle='#ffe58a';for(let i=0;i<9;i++){ctx.beginPath();ctx.ellipse(Math.cos(i*2.4)*r*.5*Math.sqrt(i/9+.1),Math.sin(i*2.4)*r*.55*Math.sqrt(i/9+.1)+r*.1,r*.05,r*.08,0,0,7);ctx.fill()}ctx.fillStyle='#2fbf52';for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(Math.cos(i*1.26-1.57)*r*.35,-r*.85+Math.abs(Math.sin(i*1.26-1.57))*r*.1,r*.3,r*.1,i*1.26-1.57,0,7);ctx.fill()}}
  else if(t==='apple'){ctx.strokeStyle='#5a3a1a';ctx.lineWidth=r*.1;ctx.beginPath();ctx.moveTo(0,-r*.85);ctx.lineTo(r*.1,-r*1.2);ctx.stroke();ctx.fillStyle='#3fbf5a';ctx.beginPath();ctx.ellipse(r*.35,-r*1.05,r*.28,r*.12,-.5,0,7);ctx.fill()}
  else if(t==='orange'){ctx.fillStyle='rgba(120,50,0,.25)';for(let i=0;i<10;i++){ctx.beginPath();ctx.arc(Math.cos(i*2.1)*r*.65*Math.sqrt(i/10),Math.sin(i*2.1)*r*.65*Math.sqrt(i/10),r*.03,0,7);ctx.fill()}}
}
function halfFruit(h){
  const f=FR[h.t],r=h.r;ctx.save();ctx.translate(h.x,h.y);ctx.rotate(h.rot);ctx.beginPath();ctx.rect(h.s?0:-r*3,-r*3,r*3,r*6);ctx.clip();body(h.t,r);
  ctx.strokeStyle=f.i;ctx.lineWidth=r*.34;ctx.beginPath();ctx.moveTo(0,-r*1.2);ctx.lineTo(0,r*1.2);ctx.stroke();ctx.strokeStyle=f.j;ctx.lineWidth=r*.1;ctx.stroke();ctx.restore()}
function drawBomb(r,now){
  ctx.fillStyle='#12121d';ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fill();
  const g=ctx.createRadialGradient(-r*.35,-r*.4,r*.05,0,0,r*1.1);g.addColorStop(0,'rgba(255,255,255,.35)');g.addColorStop(1,'rgba(0,0,0,.4)');ctx.fillStyle=g;ctx.fill();
  ctx.strokeStyle='#999';ctx.lineWidth=r*.12;ctx.beginPath();ctx.moveTo(0,-r);ctx.quadraticCurveTo(r*.3,-r*1.3,r*.55,-r*1.2);ctx.stroke();
  ctx.fillStyle=(now/80|0)%2?'#ffd23f':'#ff5a1f';ctx.beginPath();ctx.arc(r*.55,-r*1.2,r*.18,0,7);ctx.fill();
  ctx.fillStyle='#ff3b3b';ctx.font=`${r}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('☠',0,r*.1)}
function drawAmb(now){
  if(!S.amb){S.amb=[];for(let i=0;i<14;i++)S.amb.push({k:KEYS[i%KEYS.length],x:rnd(0,1),y:rnd(0,1),r:rnd(.55,1.1),ph:rnd(0,6),sp:rnd(.5,1)})}
  const t=now/1000,hi=S.fx>.5;ctx.fillStyle='#b9a4ff';
  for(const a of S.amb){if(!hi&&a.r>.9)continue;const x=a.x*W+Math.sin(t*.12*a.sp+a.ph)*50,y=((a.y*H-t*9*a.sp)%H+H)%H,r=R*a.r*.9;
    ctx.save();ctx.translate(x,y);ctx.rotate(t*.05*a.sp+a.ph);ctx.globalAlpha=.05;ctx.beginPath();
    if(a.k==='banana'){ctx.lineCap='round';ctx.strokeStyle='#b9a4ff';ctx.lineWidth=r*.5;ctx.arc(0,-r*.4,r,.2*Math.PI,.8*Math.PI);ctx.stroke()}
    else{ctx.ellipse(0,0,r*(a.k==='pineapple'?.8:1),r,0,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(r*.25,-r*1.02,r*.3,r*.12,-.5,0,7);ctx.fill()}
    ctx.restore()}
  ctx.globalCompositeOperation='lighter';const n=hi?44:16;
  for(let i=0;i<n;i++){const k=i*97.13,x=(Math.sin(k)*.5+.5)*W,y=(Math.cos(k*1.7)*.5+.5)*H,tw=.5+.5*Math.sin(t*(.6+i%5*.3)+k);
    ctx.globalAlpha=tw*.5;ctx.fillStyle=i%4?'#8fe3ff':'#ffc86b';ctx.beginPath();ctx.arc(x,y,.8+tw*1.4*(i%3?1:1.6),0,7);ctx.fill()}
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
function drawStains(){
  for(const q of S.splats){ctx.globalAlpha=clamp(q.life/q.max,0,1)*.32;ctx.fillStyle=q.c;ctx.beginPath();ctx.arc(q.x,q.y,q.r,0,7);ctx.fill();
    for(const d of q.d){ctx.beginPath();ctx.arc(q.x+Math.cos(d.a)*d.l,q.y+Math.sin(d.a)*d.l,d.s,0,7);ctx.fill()}}
  ctx.globalAlpha=1}
function drawSlashes(){
  ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
  for(const q of S.slashes){const a=q.life/q.max,c=Math.cos(q.a)*q.l,s=Math.sin(q.a)*q.l;
    for(const[w,col]of[[14,'rgba(139,92,246,.5)'],[4,'#fff']]){ctx.globalAlpha=a;ctx.strokeStyle=col;ctx.lineWidth=w*a;ctx.beginPath();ctx.moveTo(q.x-c,q.y-s);ctx.lineTo(q.x+c,q.y+s);ctx.stroke()}}
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
function draw(now){
  ctx.clearRect(0,0,W,H);ctx.save();
  if(S.shake>0)ctx.translate(rnd(-1,1)*S.shake,rnd(-1,1)*S.shake);
  drawAmb(now);drawStains();
  for(const h of S.halves)halfFruit(h);
  for(const f of S.fruits){ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.rot);f.t==='bomb'?drawBomb(f.r,now):body(f.t,f.r);ctx.restore()}
  for(const p of S.parts){const a=clamp(p.life/p.max,0,1);ctx.globalCompositeOperation=p.add?'lighter':'source-over';ctx.globalAlpha=a;ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.sz*(.4+a*.6),0,7);ctx.fill()}
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';drawSlashes();
  for(const t of S.texts){ctx.globalAlpha=clamp(t.life/t.max*1.5,0,1);ctx.fillStyle=t.c;ctx.shadowColor=t.c;ctx.shadowBlur=14;ctx.font=`${t.sz}px 'Bagel Fat One',system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t.s,t.x,t.y)}
  ctx.shadowBlur=0;ctx.globalAlpha=1;
  const T=S.trail;while(T.length&&now-T[0].t>220)T.shift();
  if(T.length>1){ctx.globalCompositeOperation='lighter';ctx.lineCap=ctx.lineJoin='round';
    for(const[w,c]of[[22,'rgba(139,92,246,.3)'],[9,'rgba(143,227,255,.55)'],[3.5,'#fff']]){for(let i=1;i<T.length;i++){const a=1-(now-T[i].t)/220;ctx.globalAlpha=Math.max(0,a);ctx.strokeStyle=c;ctx.lineWidth=w*(.3+.7*a);ctx.beginPath();ctx.moveTo(T[i-1].x,T[i-1].y);ctx.lineTo(T[i].x,T[i].y);ctx.stroke()}}
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
  if(S.ptr.on){const p=S.ptr,g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,22);g.addColorStop(0,'#fff');g.addColorStop(.3,'rgba(143,227,255,.9)');g.addColorStop(1,'rgba(143,227,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,22,0,7);ctx.fill()}
  ctx.restore();
  if(S.flash>0){ctx.fillStyle=`rgba(255,90,40,${S.flash*.4})`;ctx.fillRect(0,0,W,H)}}
/* ---------- gameplay ---------- */
function spawn(bp){
  const bomb=Math.random()<bp,t=bomb?'bomb':KEYS[Math.random()*KEYS.length|0],x=rnd(.15,.85)*W,g=H*1.7,vy=-Math.sqrt(2*g*H*rnd(.55,.85)),T=-2*vy/g;
  S.fruits.push({x,y:H+R*1.6,vx:(rnd(.3,.7)*W-x)/T,vy,g,rot:rnd(0,6),vr:rnd(-5,5),t,r:R*(bomb?1:FR[t].r),dead:0})}
function burst(x,y,c,n,sp){for(let i=0;i<n&&S.parts.length<450;i++){const a=rnd(0,6.3),v=rnd(.2,1)*sp,l=rnd(.4,.9);S.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-sp*.3,life:l,max:l,c,sz:rnd(2,6),add:0});if(i%3===0)S.parts.push({x,y,vx:Math.cos(a)*v*1.3,vy:Math.sin(a)*v*1.3,life:l*.6,max:l*.6,c:'#fff',sz:rnd(1.5,3),add:1})}}
const say=(s,x,y,c,sz)=>S.texts.push({s,x,y,c,sz,life:.9,max:.9});
function segCircle(ax,ay,bx,by,cx,cy,r){const dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy||1,t=clamp(((cx-ax)*dx+(cy-ay)*dy)/l,0,1);return Math.hypot(ax+t*dx-cx,ay+t*dy-cy)<r}
const minSpeed=()=>H*(1.05-S.sens*.12);
function sample(x,y,now){
  const p=S.ptr,pv=S.prev;p.x=x;p.y=y;p.on=true;p.t=now;S.trail.push({x,y,t:now});
  if(pv&&now-pv.t<200&&(S.state==='play'||S.state==='practice')){
    const dx=x-pv.x,dy=y-pv.y,d=Math.hypot(dx,dy),sp=d/Math.max((now-pv.t)/1000,.001);
    if(d>4&&sp>minSpeed())for(const f of S.fruits)if(!f.dead&&segCircle(pv.x,pv.y,x,y,f.x,f.y,f.r*.95))cut(f,dx,dy,now)}
  S.prev={x,y,t:now}}
function cut(f,dx,dy,now){
  f.dead=1;const play=S.state==='play';
  if(f.t==='bomb'){tone(120,.5,'sawtooth',.22,30);burst(f.x,f.y,'#ff8a1f',Math.round(40*S.fx),420);S.shake=18;S.flash=1;
    if(play){if(S.mode==='classic')loseLife();else{S.score=Math.max(0,S.score-10);say('-10',f.x,f.y,'#ff5a5a',44)}}return}
  const c=S.chain;c.n=now-c.t<350?c.n+1:1;c.t=now;
  const rot=Math.atan2(dy,dx)-Math.PI/2,fr=FR[f.t];
  for(let s=0;s<2;s++){const q=s?1:-1;S.halves.push({x:f.x,y:f.y,vx:f.vx*.5+Math.cos(rot)*q*170,vy:f.vy*.5+Math.sin(rot)*q*170-60,rot,vr:q*rnd(1,4),t:f.t,r:f.r,s,g:f.g})}
  burst(f.x,f.y,fr.j,Math.round(16*S.fx),380);
  S.splats.push({x:f.x,y:f.y,r:f.r*rnd(.5,.8),c:fr.j,life:2.4,max:2.4,d:Array.from({length:7},()=>({a:rnd(0,6.3),l:f.r*rnd(.6,1.4),s:f.r*rnd(.08,.22)}))});
  S.slashes.push({x:f.x,y:f.y,a:Math.atan2(dy,dx),l:f.r*2.2,life:.22,max:.22});
  tone(rnd(700,1000),.14,'sawtooth',.07,180);tone(200,.1,'square',.05,70);
  if(!play)return;
  let pts=10*(S.mode==='arcade'?2:1);
  if(c.n>=3){pts+=c.n*5;say(c.n+'× COMBO!',W/2,H*.3,'#ffc86b',58);tone(660,.12,'triangle',.12);tone(990,.18,'triangle',.12,0,.1)}
  if(c.n>=3)burst(f.x,f.y,'#ffc86b',Math.round(24*S.fx),520);S.score+=pts;say('+'+pts,f.x,f.y-f.r,'#fff',30)}
function loseLife(){S.lives--;if(S.lives<=0)gameOver()}
function reset(){S.fruits=[];S.halves=[];S.parts=[];S.texts=[];S.splats=[];S.slashes=[];S.score=0;S.shown=0;S.lives=3;S.time=60;S.el=0;S.spawnT=.6;S.chain={n:0,t:0}}
function startGame(){reset();S.state='play';show(null)}
function gameOver(){
  S.state='over';tone(300,.7,'triangle',.15,70);const hi=getHi(),nb=S.score>hi;
  if(nb)try{localStorage.setItem(hiKey(),S.score)}catch(e){}
  $('overT').textContent=nb&&S.score>0?'New best!':'Game over';$('finalScore').textContent=S.score;$('finalBest').textContent='Best in '+S.mode+': '+Math.max(hi,S.score);show('over')}
function update(dt){
  if(S.state==='pause')return;
  S.shake=Math.max(0,S.shake-dt*50);S.flash=Math.max(0,S.flash-dt*2.5);
  const play=S.state==='play',prac=S.state==='practice';
  if(play||prac){
    S.el+=dt;S.spawnT-=dt;
    if(S.spawnT<=0){const lv=play?Math.min(S.el/70,1):0,m=S.mode,n=prac?1:1+(Math.random()<.3+lv*.4)+(Math.random()<lv*.4);
      for(let i=0;i<n;i++)spawn(prac||m==='zen'?0:.07+lv*.13);S.spawnT=prac?1.4:Math.max(.5,(m==='arcade'?.95:1.35)-lv*.5)}
    if(play&&S.mode!=='classic'){S.time-=dt;if(S.time<=0){S.time=0;gameOver()}}
  }
  if(S.ptr.on&&performance.now()-S.ptr.t>250){S.ptr.on=false;S.prev=null;S.sm=null}
  for(const f of S.fruits){f.vy+=f.g*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.rot+=f.vr*dt;
    if(f.vy>0&&f.y>H+f.r*1.6){if(!f.dead&&play&&f.t!=='bomb'&&S.mode==='classic')loseLife();f.dead=2}}
  S.fruits=S.fruits.filter(f=>!f.dead);
  for(const h of S.halves){h.vy+=h.g*dt;h.x+=h.vx*dt;h.y+=h.vy*dt;h.rot+=h.vr*dt}
  S.halves=S.halves.filter(h=>h.y<H+h.r*3);
  for(const p of S.parts){p.vy+=900*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}
  S.parts=S.parts.filter(p=>p.life>0);
  for(const t of S.texts){t.y-=40*dt;t.life-=dt}
  S.texts=S.texts.filter(t=>t.life>0);
  for(const q of S.splats)q.life-=dt;S.splats=S.splats.filter(q=>q.life>0);
  for(const q of S.slashes)q.life-=dt;S.slashes=S.slashes.filter(q=>q.life>0)}
function hud(){
  S.shown+=(S.score-S.shown)*.2;setTxt($('score'),Math.abs(S.score-S.shown)<1?S.score:Math.round(S.shown));
  const cl=S.mode==='classic';$('hearts').hidden=!cl;$('timer').hidden=cl;
  document.querySelectorAll('#hearts .h').forEach((h,i)=>h.classList.toggle('x',i>=S.lives));setTxt($('timer'),Math.ceil(S.time)+'s');
  setTxt($('best'),'Best '+Math.max(getHi(),S.score))}
/* ---------- hand tracking ---------- */
function track(now){
  if(S.hl&&!S.mouse&&S.stream&&cam.readyState>=2&&cam.currentTime!==S.lastVT){
    S.lastVT=cam.currentTime;let r=null;try{r=S.hl.detectForVideo(cam,now)}catch(e){}
    const L=r&&r.landmarks&&r.landmarks[0];
    if(L){const rc=1+S.sens*.2,x=clamp(.5+((1-L[8].x)-.5)*rc,0,1)*W,y=clamp(.5+(L[8].y-.5)*rc,0,1)*H;
      if(!S.sm)S.sm={x,y};else{S.sm.x+=(x-S.sm.x)*.6;S.sm.y+=(y-S.sm.y)*.6}
      sample(S.sm.x,S.sm.y,now);S.lastHand=now;if(!S.handSince)S.handSince=now}}
  const seen=now-S.lastHand<400;if(!seen)S.handSince=0;
  if(S.state!=='menu'){const st=S.mouse?'Mouse mode':seen?'Hand tracked ✓':S.stream?'Searching for hand… point your index finger':'Camera off';
    if($('status')._v!==st){$('status').textContent=st;$('status')._v=st;$('status').classList.toggle('ok',seen&&!S.mouse)}}
  $('begin').disabled=!(S.mouse||(S.handSince&&now-S.handSince>600))}
const fail=m=>{S.state='menu';$('errMsg').textContent=m;show('error')};
function camMsg(e){const n=e&&e.name;
  if(n==='NotAllowedError'||n==='SecurityError')return 'Camera access was blocked. Click the camera or lock icon in the address bar, set Camera to Allow, then reload the page and try again. Note: cameras only work on https:// pages or localhost.';
  if(n==='NotFoundError'||n==='OverconstrainedError')return 'No camera was found. Plug in a webcam, or play with your mouse instead.';
  if(n==='NotReadableError')return 'Your camera is in use by another app. Close it (Zoom, Teams, another tab) and try again.';
  return 'The camera could not start ('+(n||'unknown error')+'). You can retry or play with your mouse.'}
async function initCam(){
  S.mouse=false;S.state='menu';show('loading');$('loadMsg').textContent='Waiting for camera permission…';
  try{if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw{name:'SecurityError'};
    S.stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:'user'},audio:false});
    cam.srcObject=S.stream;await cam.play()}catch(e){stopCam();return fail(camMsg(e))}
  $('loadMsg').textContent='Loading hand-tracking model…';
  try{if(!S.hl){const v=await import(CDN+'/vision_bundle.mjs'),fs=await v.FilesetResolver.forVisionTasks(CDN+'/wasm');
      const mk=d=>v.HandLandmarker.createFromOptions(fs,{baseOptions:{modelAssetPath:MODEL,delegate:d},runningMode:'VIDEO',numHands:1,minHandDetectionConfidence:.5,minHandPresenceConfidence:.5,minTrackingConfidence:.5});
      try{S.hl=await mk('GPU')}catch(_){S.hl=await mk('CPU')}}
  }catch(e){stopCam();return fail('The hand-tracking model could not be loaded. Check your internet connection and that your network allows cdn.jsdelivr.net and storage.googleapis.com, or play with your mouse.')}
  document.body.classList.add('cam-on');enterPractice()}
function stopCam(){if(S.stream)S.stream.getTracks().forEach(t=>t.stop());S.stream=null;cam.srcObject=null;S.handSince=0;S.lastHand=-1e9;document.body.classList.remove('cam-on')}
function enterPractice(){reset();S.state='practice';S.spawnT=.3;document.body.classList.add('live');show('practice')}
function toMenu(){stopCam();S.mouse=false;S.state='menu';reset();S.ptr.on=false;S.trail=[];document.body.classList.remove('live');show('menu')}
function show(id){document.body.classList.toggle('inmenu',id==='menu');document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('on',s.id===id));$('hud').hidden=!(S.state==='play'||S.state==='pause')}
function pause(){if(S.state==='play'){S.state='pause';show('pause')}}
function resume(){if(S.state==='pause'){S.state='play';S.prev=null;show(null)}}
/* ---------- UI wiring ---------- */
document.querySelectorAll('.mode').forEach(b=>b.onclick=()=>{S.mode=b.dataset.m;document.querySelectorAll('.mode').forEach(x=>x.classList.toggle('on',x===b))});
$('sens').oninput=e=>{S.sens=+e.target.value;$('sensV').textContent=S.sens};
$('start').onclick=()=>{tone(1,.01,'sine',.001);initCam()};
const mouseMode=()=>{stopCam();S.mouse=true;enterPractice()};
$('mouseStart').onclick=mouseMode;$('errMouse').onclick=mouseMode;
$('retry').onclick=initCam;$('errBack').onclick=toMenu;$('backP').onclick=toMenu;
$('begin').onclick=startGame;$('again').onclick=startGame;$('restart').onclick=startGame;
$('resume').onclick=resume;$('toMenu').onclick=toMenu;$('overMenu').onclick=toMenu;$('pauseBtn').onclick=pause;
const setMute=m=>{S.mute=m;$('mute').textContent=m?'🔇':'🔊';const b=$('snd');b.textContent=m?'Off':'On';b.setAttribute('aria-pressed',!m)};
$('mute').onclick=()=>setMute(!S.mute);$('snd').onclick=()=>setMute(!S.mute);
$('fxb').onclick=()=>{S.fx=S.fx>.5?.35:1;$('fxb').textContent=S.fx>.5?'High':'Low';$('fxb').setAttribute('aria-pressed',S.fx>.5)};
$('gear').onclick=()=>{const p=$('settings');p.hidden=!p.hidden;$('gear').setAttribute('aria-expanded',!p.hidden)};
$('how').onclick=()=>show('howto');$('howBack').onclick=()=>show('menu');
$('menu').addEventListener('pointermove',e=>{const m=$('menu').style;m.setProperty('--mx',(e.clientX/W-.5).toFixed(3));m.setProperty('--my',(e.clientY/H-.5).toFixed(3))});
function camPill(st){const t={granted:'Webcam ready for hand tracking',prompt:'Allow the camera when you press Play',denied:'Camera blocked in browser. Mouse mode still works',none:'No camera detected. Mouse mode still works'};
  const p=$('camPill');p.dataset.s=st==='none'?'denied':st;p.lastElementChild.textContent=t[st]||t.prompt}
try{if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)camPill('none');else if(navigator.permissions)navigator.permissions.query({name:'camera'}).then(q=>{camPill(q.state);q.onchange=()=>camPill(q.state)}).catch(()=>camPill('prompt'));else camPill('prompt')}catch(e){camPill('prompt')}
cv.addEventListener('pointermove',e=>{if(S.mouse)sample(e.clientX,e.clientY,performance.now())});
addEventListener('keydown',e=>{if(e.key==='Escape'||e.key==='p'||e.key==='P')S.state==='play'?pause():resume()});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
addEventListener('pagehide',stopCam);
let last=performance.now();
(function loop(){requestAnimationFrame(loop);const now=performance.now(),dt=Math.min((now-last)/1000,.05);last=now;track(now);update(dt);draw(now);hud()})();

})();
