'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const loading=document.getElementById('loading'),fill=document.getElementById('loadFill'),loadText=document.getElementById('loadText');
const title=document.getElementById('titleScreen'),hud=document.getElementById('hud'),mobile=document.getElementById('mobile');
const DPR=()=>Math.min(2,window.devicePixelRatio||1); let W=innerWidth,H=innerHeight;
const img={}; const sounds={};
const ASSETS={
  zombie_tp:'assets/atlas/zombie_tp.png', zombie_fp:'assets/atlas/zombie_fp.png',
  player_tp:'assets/atlas/player_tp.png', player_fp:'assets/atlas/player_fp.png',
  cow_tp:'assets/atlas/cow_tp.png', cow_fp:'assets/atlas/cow_fp.png',
  clown_tp:'assets/atlas/clown_tp.png', clown_fp:'assets/atlas/clown_fp.png',
  boss_tp:'assets/atlas/boss_tp.png', boss_fp:'assets/atlas/boss_fp.png',
  ufo_tp:'assets/atlas/ufo_tp.png', ufo_fp:'assets/atlas/ufo_fp.png', pizza_boy_tp:'assets/sprites/pizza_boy_tp.svg'
};
const MUSIC={normal:'assets/sounds/normal.mp3',title:'assets/sounds/title.mp3',boss:'assets/sounds/boss.ogg',event:'assets/sounds/clown.mp3'};   // title menu | normal gameplay | every random event | boss fights
let audioCtx=null,music={el:null,key:null};
function resize(){W=innerWidth;H=innerHeight;canvas.width=W*DPR();canvas.height=H*DPR();ctx.setTransform(DPR(),0,0,DPR(),0,0)} addEventListener('resize',resize);resize();
function loadImage(k,src){return new Promise(r=>{const im=new Image();im.onload=()=>{img[k]=im;r()};im.onerror=()=>r() ;im.src=src})}
let audioUnlocked=false,voiceOn=!(('ontouchstart' in window)||navigator.maxTouchPoints>0);
function startAudio(){try{if(!audioCtx){const C=window.AudioContext||window.webkitAudioContext;if(C)audioCtx=new C()}if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume().catch(()=>{})}catch(e){}}
try{if('speechSynthesis' in window)speechSynthesis.onvoiceschanged=()=>{}}catch(e){}
function unlockAudioFromGesture(){startAudio();if(audioUnlocked)return;audioUnlocked=true;
  try{const a=new Audio();a.src='data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAAA';a.muted=true;a.volume=0;a.playsInline=true;const pr=a.play();if(pr&&pr.catch)pr.catch(()=>{})}catch(e){}
  try{if('speechSynthesis' in window){const u=new SpeechSynthesisUtterance('');u.volume=0;speechSynthesis.speak(u)}}catch(e){}}
function duckMusic(on){try{if(music.el)music.el.volume=on?.12:.34}catch(e){}}
function wantMusic(){return(G.running||G.over)?(music.key||'normal'):'title'}
function resumeGameAudio(){startAudio();if(typeof musicOn!=='undefined'&&musicOn&&music.el&&music.el.paused&&music.key)music.el.play().catch(()=>{})}
addEventListener('pageshow',resumeGameAudio,{passive:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)resumeGameAudio()},{passive:true});
// spoken lines (zombies = low & slow, player = brighter). Used by the speech bubbles.
function pickVoice(kind){
  const all=speechSynthesis.getVoices().filter(x=>/^en/i.test(x.lang));if(!all.length)return null;
  const want=kind==='zombie'?/fred|ralph|bruce|junior|bad news|daniel|david|mark|guy|male/i:/alex|daniel|david|mark|guy|google (uk|us) english|male/i;
  return all.find(x=>want.test(x.name))||all.find(x=>/male/i.test(x.name))||all.find(x=>/en(-|_)?US/i.test(x.lang))||all[0];
}
function speak(text,kind){
  if(!voiceOn||!audioUnlocked||!('speechSynthesis' in window))return;
  try{const ss=speechSynthesis;if(ss.speaking&&kind!=='player')return;ss.cancel();
    let line=String(text);if(kind==='zombie'){line=line.replace(/\.\s+/g,'... ').replace(/\?\s+/g,'?... ');if(Math.random()<.4)line=pick(['Uhhhh... ','Hhhhh... ','Mmmmm... '])+line}   // zombies drag their words out
    const u=new SpeechSynthesisUtterance(line);u.lang='en-US';duckMusic(true);const done=()=>{duckMusic(false);setTimeout(resumeGameAudio,120)};u.onend=done;u.onerror=done;
    u.volume=.95;u.rate=kind==='zombie'?.7+Math.random()*.12:1.08;u.pitch=kind==='zombie'?.12+Math.random()*.26:1+Math.random()*.1;
    const v=pickVoice(kind);if(v)u.voice=v;ss.speak(u)}catch(e){}
}
function musicKey(key){
  if(!musicOn && typeof musicOn!=='undefined')return;
  if(!MUSIC[key])return;
  startAudio();
  if(music.key===key && music.el){if(music.el.paused)music.el.play().catch(()=>{});return}
  if(music.el){music.el.pause();music.el.currentTime=0;}
  const a=new Audio();
  a.playsInline=true; a.setAttribute('playsinline',''); a.src=encodeURI(MUSIC[key]); a.loop=true; a.volume=.34; a.preload='auto';
  a.addEventListener('error',()=>{if(music.el===a)music={el:null,key:null}});
  music={el:a,key};
  a.addEventListener('pause',()=>{setTimeout(()=>{if(music.el===a&&musicOn&&audioUnlocked&&!document.hidden&&a.paused)a.play().catch(()=>{})},250)});
  a.play().catch(()=>{if(music.el===a)music.key=null});
}

let ATLAS={};async function preload(){try{ATLAS=await (await fetch('assets/atlas/atlas.json')).json()}catch(e){}const tasks=Object.entries(ASSETS).map(([k,v])=>loadImage(k,v)); let done=0; for(const p of tasks){await p;done++;fill.style.width=(done/tasks.length*100)+'%';loadText.textContent=Math.round(done/tasks.length*100)+'%'} loading.style.display='none';}
const G={running:false,over:false,wave:1,score:0,kills:0,hp:100,maxHp:100,x:0,y:0,angle:0,shootCd:0,reload:0,ammo:12,mag:12,weapon:0,autoAim:true,view:'tp',shake:0,event:null,eventT:0,eventCooldown:0,disco:false,combo:0,comboT:0,zombies:[],bullets:[],particles:[],decals:[],cows:[],clowns:[],ufo:null,boss:null,spawnT:0,stepT:0,attackT:0,attackType:'shoot',waveKills:0,phoneT:7,pizzaT:42,pizzaBoy:null,footT:0,footFlip:false};
const WEAPONS=[{name:'Pistol',ammo:12,rate:170,dmg:26,pellets:1,spread:.02,reload:900},{name:'Duck Gun',ammo:8,rate:520,dmg:18,pellets:5,spread:.26,reload:1200},{name:'Pizza Cannon',ammo:5,rate:850,dmg:80,pellets:1,spread:0,reload:1500,explosive:true},{name:'Guitar Maxe',ammo:3,rate:1100,dmg:999,pellets:1,spread:0,reload:1800,shock:true},{name:'Machine Gun',ammo:40,rate:80,dmg:13,pellets:1,spread:.11,reload:1800,auto:true}];
// per-weapon muzzle flash / recoil / haptics:  r=flash size, dur=seconds, kick=player knockback px, hap=vibration ms, shell=ejects casings
const FX=[{r:26,dur:.07,c:'255,200,60',spikes:6,kick:2.5,hap:25,shell:true,cam:3},{r:42,dur:.10,c:'255,170,40',spikes:9,kick:8,hap:70,shell:true,cam:7},{r:54,dur:.13,c:'255,120,20',spikes:7,kick:11,hap:100,cam:12},{r:60,dur:.15,c:'120,190,255',spikes:12,kick:13,hap:140,cam:16},{r:30,dur:.05,c:'255,210,80',spikes:6,kick:1.7,hap:14,shell:true,cam:3.6}];
function reset(){G.prints=[];G.feetBlood=0;G.corpses=[];G.meteors=[];G.pickups=[];G.rings=[];G.fx={};G.lastEv=null;{const cv=document.getElementById('game');if(cv)cv.style.transform=''}G.bubbles=[];G.ammoBy=[];G.hurtT=0;G.flashT=0;G.mgShots=0;G.zTalkT=2;G.pTalkT=4;Object.assign(G,{running:true,over:false,wave:1,score:0,kills:0,hp:100,x:W*.5,y:H*.55,angle:0,shootCd:0,reload:0,ammo:12,weapon:0,event:null,eventT:0,eventCooldown:12,disco:false,combo:0,comboT:0,zombies:[],bullets:[],particles:[],decals:[],cows:[],clowns:[],ufo:null,boss:null,spawnT:0,attackT:0,attackType:'shoot',waveKills:0,phoneT:7,pizzaT:42,pizzaBoy:null,footT:0,footFlip:false}); title.classList.add('hidden');hud.style.display='block';musicKey('normal');startWave(1)}
function startWave(n){G.wave=n;G.waveKills=0;G.spawnT=0;G.eventCooldown=Math.max(5,12-Math.min(6,n*.03));G.zombies.length=0;G.cows.length=0;G.clowns.length=0;G.boss=null;for(let i=0;i<Math.min(6+Math.floor(n*1.5),42);i++)spawnZombie();if(n%5===0)spawnBoss();updateHUD()}
function spawnZombie(){const a=Math.random()*Math.PI*2,d=Math.max(W,H)*.65+Math.random()*400;G.zombies.push({x:G.x+Math.cos(a)*d,y:G.y+Math.sin(a)*d,hp:50+G.wave*2,speed:35+Math.random()*20+G.wave*.7,r:25,frame:0,t:0,dead:false,hitT:0})}
function spawnCow(){const a=Math.random()*Math.PI*2,d=Math.max(W,H)*.8;G.cows.push({x:G.x+Math.cos(a)*d,y:G.y+Math.sin(a)*d,hp:80+G.wave*3,speed:120+G.wave*.6,r:30,t:0,hitT:0})}
function spawnClown(){const a=Math.random()*Math.PI*2,d=Math.max(W,H)*.7;G.clowns.push({x:G.x+Math.cos(a)*d,y:G.y+Math.sin(a)*d,hp:100+G.wave*3,speed:75+G.wave,r:28,t:0,hitT:0})}
function spawnBoss(){G.boss={x:G.x+(Math.random()<.5?-1:1)*Math.max(W,H)*.6,y:G.y-Math.max(W,H)*.5,hp:1000+G.wave*100,max:1000+G.wave*100,r:65,speed:35,t:0,hitT:0};G.event='BOSS';G.eventT=10;sndBossRoar();musicKey('boss');}
function beginEvent(type){eventSnd(type);G.event=type;G.eventT=(EV[type]&&EV[type].dur)||8;G.fx={};G.eventCooldown=30;musicKey(type==='BOSS'?'boss':'event'); if(type==='COW')for(let i=0;i<Math.min(5+G.wave,20);i++)spawnCow();if(type==='CLOWN')for(let i=0;i<Math.min(4+Math.floor(G.wave/3),14);i++)spawnClown();if(type==='UFO')G.ufo={x:G.x,y:G.y-300,r:55,t:0,hitT:0,hp:300+G.wave*20};if(type==='DISCO'){G.disco=true;G.eventT=12}if(type==='COW')G.eventT=9;if(EV[type]){EV[type].start();if(EVENT_TALK[type])say(G,EVENT_TALK[type],{kind:'p',dur:3.6})}}
function endEvent(){musicKey(G.boss?'boss':'normal');G.event=null;G.disco=false;G.fx={};const cv=document.getElementById('game');if(cv)cv.style.transform=''}
// ── EVENTS: 15 total ──────────────────────────────────────────────
// original 5: COW, CLOWN, UFO, DISCO, BOSS (boss waves)   |   10 new: HORDE, TITAN, MINI, BLACKOUT, BOOM, SPLIT, METEOR, PIZZA, DRUNK, FRENZY
const EVENT_LABELS={DISCO:'🪩 DISCO FEVER',COW:'🐄 ZOMBIE COW STAMPEDE',CLOWN:'🤡 KILLER CLOWN NIGHT',UFO:'🛸 UFO INVASION',BOSS:'👹 BOSS',HORDE:'🧟 ZOMBIE HORDE SURGE',TITAN:'🦣 TITAN MARCH',NIGHTMARE:'🎪 CLOWN NIGHTMARE',BLACKOUT:'🔦 BLACKOUT',BOOM:'💥 BOOM TOWN',SPLIT:'🧬 SPLITTERS',ASTEROID:'☄️ ASTEROID SHOWER',PIZZA:'🍕 PIZZA RAIN',DRUNK:'🍺 DRUNK ZOMBIE JUICE',FRENZY:'🔥 AMMO FRENZY'};
const EVENT_POOL=['COW','CLOWN','UFO','DISCO','HORDE','TITAN','NIGHTMARE','BLACKOUT','BOOM','SPLIT','ASTEROID','PIZZA','DRUNK','FRENZY'];   // BOSS comes on every 5th wave
const EVENT_TALK={HORDE:"Oh great, an all-you-can-kill buffet!",TITAN:"Okay... those are NOT normal-sized zombies.",NIGHTMARE:"Clowns. Why does it ALWAYS have to be clowns?!",BLACKOUT:"Who turned off the lights?! I can hear them breathing.",BOOM:"Everything explodes now? Best. Day. Ever.",SPLIT:"Why are there MORE of them now?!",ASTEROID:"Asteroids?! Mother Nature just joined the zombies!",PIZZA:"Pizza from the sky! I love this planet!",DRUNK:"Whoa... why is the floor moving... hic!",FRENZY:"Infinite ammo. I'm in love all over again!"};
function edgePoint(){const side=Math.floor(Math.random()*4),pad=60;return side===0?[-pad,Math.random()*H]:side===1?[W+pad,Math.random()*H]:side===2?[Math.random()*W,-pad]:[Math.random()*W,H+pad]}
function eventZombies(n,mul){for(let i=0;i<n;i++){spawnZombie();const z=G.zombies[G.zombies.length-1],p=edgePoint();z.x=p[0];z.y=p[1];z.spd=45*(mul||1.1)}}
function spawnMini(x,y,hp,speed,scale){G.zombies.push({x,y,hp,speed,spd:speed,r:Math.max(11,25*scale*.8),frame:0,t:0,dead:false,hitT:0,scale,mini:true})}
const EV={
  HORDE:{dur:10,start(){eventZombies(Math.min(40,20+Math.floor(G.wave/2)),1.25)}},
  TITAN:{dur:12,start(){const n=3+Math.floor(G.wave/8);for(let i=0;i<n;i++){spawnZombie();const z=G.zombies[G.zombies.length-1],p=edgePoint();z.x=p[0];z.y=p[1];z.hp=(50+G.wave*2)*6;z.spd=26+G.wave*.2;z.r=48;z.scale=1.9}}},
  NIGHTMARE:{dur:14,start(){G.fx.nightmare=true;G.fx.nT=.7;for(let i=0;i<8;i++){spawnClown();const c=G.clowns[G.clowns.length-1],p=edgePoint();c.x=p[0];c.y=p[1];c.speed*=1.35;c.hp=70+G.wave*2}}},
  BLACKOUT:{dur:12,start(){G.fx.blackout=true;eventZombies(10,1.15)}},
  BOOM:{dur:12,start(){G.fx.boom=true;eventZombies(12,1.1)}},
  SPLIT:{dur:12,start(){G.fx.split=true;eventZombies(10,1.1)}},
  ASTEROID:{dur:12,start(){G.fx.meteor=true;G.fx.mT=0}},
  PIZZA:{dur:10,start(){G.fx.pizza=true;G.fx.pT=0;eventZombies(8,1.1)}},
  DRUNK:{dur:10,start(){G.fx.drunk=true;eventZombies(10,1.1)}},
  FRENZY:{dur:10,start(){G.fx.frenzy=true;eventZombies(16,1.15);G.ammo=WEAPONS[G.weapon].ammo;G.reload=0}}
};
function boomAt(x,y){
  G._bd=(G._bd||0)+1;
  if(G._bd<=3){
    burst(x,y,'#ff9b00',24);burst(x,y,'#fff2a8',10);(G.rings||(G.rings=[])).push({x,y,t:.4,max:.4,r:100});sndBoomSmall();G.shake=Math.max(G.shake,IS_TOUCH?9:6);
    for(const q of allEnemies()){if(q.hp<=0)continue;const d=Math.hypot(q.x-x,q.y-y);if(d<105)damage(q,48*(1-d/170))}
    if(Math.hypot(G.x-x,G.y-y)<92&&!(G.fx.hCd>0)){G.fx.hCd=.4;hurt(9)}
  }
  G._bd--;
}
function meteorImpact(m){
  G.shake=Math.max(G.shake,IS_TOUCH?15:11);vibrate([60,30,90]);sndBoomSmall();burst(m.x,m.y,'#ff7a1a',36);burst(m.x,m.y,'#ffe08a',14);(G.rings||(G.rings=[])).push({x:m.x,y:m.y,t:.55,max:.55,r:100});
  G.decals.push({x:m.x,y:m.y,t:8});
  for(const q of allEnemies()){if(q.hp>0&&Math.hypot(q.x-m.x,q.y-m.y)<100)damage(q,75)}
  if(Math.hypot(G.x-m.x,G.y-m.y)<92)hurt(20);
}
function tickEvents(dt){
  const fx=G.fx||(G.fx={});if(!G.meteors)G.meteors=[];if(!G.pickups)G.pickups=[];if(!G.rings)G.rings=[];
  if(fx.hCd>0)fx.hCd-=dt;
  if(fx.nightmare){fx.nT-=dt;if(fx.nT<=0){fx.nT=1.4+Math.random()*.6;if(G.clowns.length<18){const a=Math.random()*Math.PI*2,d=150+Math.random()*90;spawnClown();const c=G.clowns[G.clowns.length-1];c.x=Math.max(30,Math.min(W-30,G.x+Math.cos(a)*d));c.y=Math.max(70,Math.min(H-30,G.y+Math.sin(a)*d));c.hp=70+G.wave*2;c.speed*=1.25;burst(c.x,c.y,'#ff3df0',14);burst(c.x,c.y,'#ffe45e',8);voice(700,220,.16,.3,'square',{lp:1600});noiseHit(.12,.25,1500,'bandpass');if(Math.random()<.5)say(c,pick(CLOWN_SORRY),{kind:'z'})}}}
  if(fx.meteor){fx.mT-=dt;if(fx.mT<=0){fx.mT=.5+Math.random()*.4;const near=Math.random()<.45,x=near?G.x+(Math.random()-.5)*280:30+Math.random()*(W-60),y=near?G.y+(Math.random()-.5)*280:30+Math.random()*(H-60);G.meteors.push({x:Math.max(30,Math.min(W-30,x)),y:Math.max(30,Math.min(H-30,y)),t:1.1,max:1.1})}}
  for(const m of G.meteors){m.t-=dt;if(m.t<=0&&!m.hit){m.hit=true;meteorImpact(m)}}
  G.meteors=G.meteors.filter(m=>m.t>-.5);
  if(fx.pizza){fx.pT-=dt;if(fx.pT<=0){fx.pT=.85;G.pickups.push({x:40+Math.random()*(W-80),y:70+Math.random()*(H-130),t:0,life:12})}}
  for(const p of G.pickups){p.t+=dt;if(!p.got&&p.t>.45&&Math.hypot(p.x-G.x,p.y-G.y)<40){p.got=true;G.hp=Math.min(100,Math.max(G.hp,G.hp+18));G.ammo=WEAPONS[G.weapon].ammo;G.reload=0;const rl=document.getElementById('reload');if(rl)rl.style.display='none';G.score+=50;burst(p.x,p.y,'#ffd34e',16);tone(740,.1,'sine',.06);setTimeout(()=>tone(990,.12,'sine',.05),90);if(Math.random()<.5)say(G,pick(["Mmm, free pizza!","Heal me, pepperoni!","Gooey cheese of life!"]),{kind:'p'});updateHUD()}}
  G.pickups=G.pickups.filter(p=>!p.got&&p.t<p.life);
  for(const r of G.rings)r.t-=dt;G.rings=G.rings.filter(r=>r.t>0);
  const cv=document.getElementById('game');if(cv){const want=fx.drunk?'rotate('+(Math.sin(performance.now()/380)*2.4).toFixed(2)+'deg) scale(1.05)':'';if(cv.style.transform!==want)cv.style.transform=want}
}
function drawEventLayer(){
  for(const m of (G.meteors||[])){
    if(m.t>0){const k=1-m.t/m.max;ctx.save();
      ctx.fillStyle='rgba(255,60,30,'+(.07+.13*k)+')';ctx.beginPath();ctx.arc(m.x,m.y,100,0,7);ctx.fill();
      ctx.strokeStyle='rgba(255,'+(90+Math.floor(80*Math.sin(performance.now()/70)))+',50,'+(.5+.4*k)+')';ctx.lineWidth=3;ctx.beginPath();ctx.arc(m.x,m.y,100*(.3+.7*k),0,7);ctx.stroke();
      const fy=m.y-(m.t/m.max)*460,fx2=m.x+(m.t/m.max)*70;
      ctx.globalCompositeOperation='lighter';const tg=ctx.createLinearGradient(fx2,fy,fx2+(m.t/m.max)*70,fy-90);tg.addColorStop(0,'rgba(255,170,60,.9)');tg.addColorStop(1,'rgba(255,80,20,0)');ctx.strokeStyle=tg;ctx.lineWidth=14;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(fx2,fy);ctx.lineTo(fx2+(m.t/m.max)*70+10,fy-90);ctx.stroke();
      ctx.globalCompositeOperation='source-over';ctx.shadowColor='#ff6a1a';ctx.shadowBlur=26;ctx.fillStyle='#9a6a42';ctx.beginPath();for(let i=0;i<10;i++){const a=i/10*Math.PI*2,r=13+((i*37)%5)*1.8;ctx.lineTo(fx2+Math.cos(a)*r,fy+Math.sin(a)*r)}ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#4a2a16';ctx.beginPath();ctx.arc(fx2-5,fy-3,5,0,7);ctx.arc(fx2+6,fy+5,3.5,0,7);ctx.fill();
      ctx.restore()}
  }
  for(const r of (G.rings||[])){const k=1-r.t/r.max;ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle='rgba(255,190,90,'+(.8*(1-k))+')';ctx.lineWidth=10*(1-k)+2;ctx.beginPath();ctx.arc(r.x,r.y,r.r*(.25+.75*k),0,7);ctx.stroke();const g=ctx.createRadialGradient(r.x,r.y,0,r.x,r.y,r.r);g.addColorStop(0,'rgba(255,220,140,'+(.55*(1-k))+')');g.addColorStop(1,'rgba(255,120,30,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,7);ctx.fill();ctx.restore()}
  for(const p of (G.pickups||[])){const drop=Math.max(0,1-p.t/.45),bob=Math.sin(p.t*4)*3,y=p.y-drop*260+bob,fade=Math.min(1,(p.life-p.t)/1.5);ctx.save();ctx.globalAlpha=fade;ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(p.x,p.y+16,14,6,0,0,7);ctx.fill();ctx.font='34px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='#ffd34e';ctx.shadowBlur=14;ctx.fillText('🍕',p.x,y);ctx.restore()}
}
function drawNightmare(){
  if(!(G.fx&&G.fx.nightmare))return;const t=performance.now()/1000,fl=Math.random()<.04?.32:0;
  ctx.save();const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.22,W/2,H/2,Math.max(W,H)*.72);g.addColorStop(0,'rgba(60,0,20,0)');g.addColorStop(1,'rgba(130,0,35,'+(.58+.12*Math.sin(t*3)+fl)+')');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(40,0,15,.16)';ctx.fillRect(0,0,W,H);ctx.restore()}
let darkCv=null;
function drawDark(){
  if(!(G.fx&&G.fx.blackout))return;
  if(!darkCv||darkCv.width!==W||darkCv.height!==H){darkCv=document.createElement('canvas');darkCv.width=W;darkCv.height=H}
  const d=darkCv.getContext('2d');d.globalCompositeOperation='source-over';d.clearRect(0,0,W,H);d.fillStyle='rgba(0,0,8,.965)';d.fillRect(0,0,W,H);d.globalCompositeOperation='destination-out';
  let g=d.createRadialGradient(G.x,G.y,8,G.x,G.y,100);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(1,'rgba(0,0,0,0)');d.fillStyle=g;d.beginPath();d.arc(G.x,G.y,100,0,7);d.fill();
  d.save();d.translate(G.x,G.y);d.rotate(G.angle);const cg=d.createRadialGradient(0,0,20,0,0,380);cg.addColorStop(0,'rgba(0,0,0,.97)');cg.addColorStop(1,'rgba(0,0,0,0)');d.fillStyle=cg;d.beginPath();d.moveTo(0,0);d.arc(0,0,380,-.38,.38);d.closePath();d.fill();d.restore();
  ctx.drawImage(darkCv,0,0);
  ctx.save();ctx.fillStyle='#ff2a2a';ctx.shadowColor='#ff0000';ctx.shadowBlur=9;for(const e of allEnemies()){if(e.hp>0){const s=(e.scale||1);ctx.beginPath();ctx.arc(e.x-6*s,e.y-9*s,2.2*s,0,7);ctx.arc(e.x+6*s,e.y-9*s,2.2*s,0,7);ctx.fill()}}ctx.restore();
}
function pickEvent(){const a=EVENT_POOL.filter(t=>t!==G.lastEv);const t=a[Math.floor(Math.random()*a.length)];G.lastEv=t;beginEvent(t)}
function fire(){
  if(!G.running||G.over||G.reload>0||G.shootCd>0)return;
  const w=WEAPONS[G.weapon],fx=FX[G.weapon]||FX[0];
  if(G.ammo<=0){sndClick();startReload();return}
  G.attackType='shoot';G.attackDur=Math.max(.12,Math.min(.28,w.rate/1000*2));G.attackT=G.attackDur;
  const fz=G.fx&&G.fx.frenzy;if(!fz)G.ammo--;G.shootCd=w.rate*(fz?.45:1);startAudio();sndShot(G.weapon);
  for(let i=0;i<w.pellets;i++){let a=G.angle+(Math.random()-.5)*w.spread;G.bullets.push({x:G.x,y:G.y,vx:Math.cos(a)*760,vy:Math.sin(a)*760,dmg:w.dmg,life:1.2,explosive:w.explosive,shock:w.shock})}
  // muzzle flash + recoil (screen shake, player knock-back, phone/gamepad rumble)
  G.flashT=fx.dur;G.flashMax=fx.dur;G.flashFx=fx;
  if(IS_TOUCH)G.shake=Math.max(G.shake,fx.cam);   // recoil shake + buzz are phone-only; desktop keeps flash + knock-back
  const kk=fx.kick*(.8+Math.random()*.4);G.x=Math.max(24,Math.min(W-24,G.x-Math.cos(G.angle)*kk));G.y=Math.max(24,Math.min(H-24,G.y-Math.sin(G.angle)*kk));
  vibrate(fx.hap);
  const mx=G.x+Math.cos(G.angle)*30,my=G.y+Math.sin(G.angle)*30;
  burst(mx,my,w.explosive?'#ff8a00':w.shock?'#7cc4ff':'#ffe9a0',w.explosive?18:w.shock?14:5);
  if(fx.shell){const sa=G.angle+Math.PI/2+(Math.random()-.5)*.8,sp=90+Math.random()*90;G.particles.push({x:G.x+Math.cos(G.angle)*14,y:G.y+Math.sin(G.angle)*14,vx:Math.cos(sa)*sp,vy:Math.sin(sa)*sp,t:.9,life:.9,c:'#ffcf4a',r:2.2})}
  if(G.weapon===4&&(G.mgShots=(G.mgShots||0)+1)%28===0)say(G,pick(P_LOVE[4]),{kind:'p'});
  if(G.ammo===0&&!(G.fx&&G.fx.frenzy))startReload();updateHUD()}
function switchWeapon(i){
  i=(i+WEAPONS.length)%WEAPONS.length;if(i===G.weapon||!G.running)return;
  (G.ammoBy||(G.ammoBy=[]))[G.weapon]=G.ammo;G.reload=0;const rl=document.getElementById('reload');if(rl)rl.style.display='none';
  G.weapon=i;G.mag=WEAPONS[i].ammo;G.ammo=G.ammoBy[i]===undefined?WEAPONS[i].ammo:G.ammoBy[i];G.shootCd=140;
  sndClick();say(G,pick(P_LOVE[i]),{kind:'p'});updateHUD()}
function startReload(){if(G.reload>0||G.ammo===G.mag)return;G.attackType='reload';G.reload=WEAPONS[G.weapon].reload;sndReload();document.getElementById('reload').style.display='block';if(Math.random()<.7)say(G,pick(P_RELOAD),{kind:'p'});}
function melee(){if(G._melee)return;G._melee=true;setTimeout(()=>G._melee=false,350);G.shake=5;vibrate(45);G.attackT=.3;G.attackType='melee';sndMelee();const a=G.angle;for(const e of allEnemies()){const dx=e.x-G.x,dy=e.y-G.y,d=Math.hypot(dx,dy),ad=Math.atan2(dy,dx)-a;if(d<85&&Math.abs(Math.atan2(Math.sin(ad),Math.cos(ad)))<.8)damage(e,90)}burst(G.x+Math.cos(a)*55,G.y+Math.sin(a)*55,'#ff3344',10)}
function allEnemies(){return [...G.zombies,...G.cows,...G.clowns,...(G.boss?[G.boss]:[]),...(G.ufo?[G.ufo]:[])]}
function damage(e,dmg){if(e.hp<=0)return;e.hitT=.16;e.hp-=dmg;burst(e.x,e.y,e===G.ufo?'#7cf7ff':'#ff3158',8);enemyHitSnd(e);if(e.hp<=0){addCorpse(e);enemyDeathSnd(e);onKillTalk(e);G.kills++;G.waveKills++;G.score+=100+G.wave*5;G.combo++;G.comboT=2.5;if(e!==G.ufo)G.decals.push({x:e.x,y:e.y,t:8});burst(e.x,e.y,e===G.ufo?'#ffb347':G.disco?'#ff3cff':'#d21f3c',G.disco?20:10);if(G.disco)burst(e.x,e.y,'#00eaff',14);if(e.scale>1.5)G.score+=400;if(G.fx){if(G.fx.boom&&e!==G.boss&&e!==G.ufo)boomAt(e.x,e.y);if(G.fx.split&&G.zombies.includes(e)&&!e.mini){for(let i=0;i<2;i++)spawnMini(e.x+(i?18:-18),e.y+(Math.random()-.5)*20,15,85+Math.random()*30,.6);burst(e.x,e.y,'#5ef0ff',10)}}if(e===G.boss){G.score+=1000;G.boss=null;musicKey('normal')}if(e===G.ufo){G.score+=500*G.wave;G.ufo=null;musicKey('normal')}}}
function burst(x,y,c,n){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=40+Math.random()*180;G.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,t:.4,c,r:2+Math.random()*5})}}
function hurt(d){G.hp-=d;G.shake=8;vibrate(60);G.hurtT=.25;sndPlayerHurt();if(G.hp<=0)gameOver()}

const ZOMBIE_QUOTES=[
"Sorry I tried to eat you. I was having a difficult day.",
"Have you ever wondered if brains are just emotionally complicated soup?",
"I apologize for chasing you. It's nothing personal. Actually, it's very personal.",
"Do you think zombies have souls?",
"I think I had a soul once. I misplaced it.",
"Please don't shoot me. I'm working through some things.",
"Is murder still murder if you're already dead?",
"That's a very complicated question.",
"I used to have dreams. Now I mostly have cravings.",
"I'm sorry about the screaming. I'm still adjusting to being undead.",
"Do you ever feel like you're running in circles?",
"I'm literally running in circles right now.",
"My therapist says I need to let things go.",
"Unfortunately, my arms fell off.",
"Before I kill you, could we discuss the meaning of existence?",
"I'm sorry.",
"For what?",
"I forgot.",
"Have you seen my cow?",
"Never mind. That's not my cow.",
"Could you stop shooting while I'm talking?",
"Thank you.",
"Okay, now you can shoot.",
"I have reconsidered.",
"RUN.",
"Why are you so good at this?",
"Wave 150? Seriously?",
"We're going to need more zombies.",
"I don't want to be undead anymore.",
"Do zombies get weekends?",
"I miss being alive. The commute was terrible.",
"Technically, I'm already having a bad day.",
"Your bullets are very persuasive.",
"Please tell my mother I became a philosopher.",
"Never mind. She ate my mother.",
"Do you believe in an afterlife? Because I'm starting to think this is it."
];
// ── MUZZLE FLASH ─────────────────────────────────────────────
function drawFlash(){
  if(!(G.flashT>0)||!G.flashFx)return;const f=G.flashFx,k=Math.min(1,G.flashT/(G.flashMax||.07)),a=G.angle,off=G.weapon===4?54:42,
    mx=G.x+Math.cos(a)*off,my=G.y+Math.sin(a)*off,R=f.r*(.6+.8*k);
  ctx.save();ctx.globalCompositeOperation='lighter';
  const sp=ctx.createRadialGradient(G.x,G.y,0,G.x,G.y,260);sp.addColorStop(0,'rgba('+f.c+','+(.28*k)+')');sp.addColorStop(1,'rgba('+f.c+',0)');ctx.fillStyle=sp;ctx.beginPath();ctx.arc(G.x,G.y,260,0,7);ctx.fill();   // light spilling on the floor
  ctx.translate(mx,my);ctx.rotate(a);
  const g=ctx.createRadialGradient(0,0,0,0,0,R*1.5);g.addColorStop(0,'rgba(255,255,235,'+k+')');g.addColorStop(.3,'rgba('+f.c+','+(.85*k)+')');g.addColorStop(1,'rgba('+f.c+',0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,R*1.5,0,7);ctx.fill();
  ctx.fillStyle='rgba(255,246,200,'+(.95*k)+')';ctx.beginPath();const n=f.spikes*2,j=Math.random()*.6;     // jagged star + forward blast
  for(let i=0;i<n;i++){const ang=i*Math.PI/f.spikes+j,rad=(i%2?R*.32:R*(i===0?2.1:1.1+Math.random()*.6));const px=Math.cos(ang)*rad,py=Math.sin(ang)*rad;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}
  ctx.closePath();ctx.fill();ctx.restore();
}
// ── CHAOS TALK: zombies apologise philosophically, the player trash-talks and loves his guns ──
const pick=a=>{const live=(G.bubbles||[]).map(b=>b.text),f=a.filter(t=>!live.includes(t));const l=f.length?f:a;return l[Math.floor(Math.random()*l.length)]};
const Z_SORRY=["I'm so sorry... but is hunger not just desire wearing a coat?","Forgive me. We are all just meat contemplating meat.","Apologies in advance. Free will was always a rumor.","I regret this... yet to regret is to have chosen. Did I?","Sorry! If a brain falls in a forest, does anyone hear it scream?","Pardon the biting. Existence precedes appetite.","I apologize. The void bites back, and so do I.","Sorry about your arm. Nothing is truly ours.","I mean no harm. What even is harm, after all?","So sorry. Who among us chooses what he craves?","Excuse me, I must eat you. Please don't take it personally. Or do. Identity is fluid.","Sorry. I think, therefore I chase.","I'm sorry. Death is only life's very rude intermission.","Forgive the groaning. Silence terrifies me more than you do.","My apologies. The abyss told me to say hi.","I'd say sorry, but would sorry even matter in an infinite universe? ...Sorry."];
const Z_DIE=["Thank you... I apologize for existing.","Sorry... I was only a metaphor.","Tell my brain... I was sorry.","So this is nothingness... sorry for the mess.","I regret nothing. I regret everything. Ow.","Forgive me... for I have been shot."];
const COW_SORRY=["Moo... sorry. What is a cow, really, but grass remembering itself?","Apologies. The herd is a social construct.","Moo. I'm sorry. I'm sorry. Is the barn real?"];
const CLOWN_SORRY=["Sorry! Comedy is just tragedy wearing big shoes.","Pardon me. We're all clowns in the circus of entropy.","I apologize. Laughter is how the void clears its throat."];
const P_TRASH=["Come on, you rotten sacks of mush!","Is that all you got, dead boy?","I've met scarier salads!","You walk like my Wi-Fi: slow and dead!","Your mama was a casserole!","Smell ya later, corpse!","Who's your daddy? ...Wait, don't answer that, you're rotting.","I'd say rest in peace, but you're about to be in pieces!","Nice teeth! Shame about the face!","Zero brains, all drool. Truly inspiring!","Hold still so I can ventilate you!","You call that a lunge? My grandma bites harder!"];
const P_KILL=["Boom, pal. Boom.","Sit down, you tragic noodle!","Another one for the pile!","That's what you get for chewing!","Next victim, step right up!","Don't apologize to ME, apologize to my gun!"];
const P_LOVE=[["Hello, little Pistol. You still the only one who gets me.","Pistol, baby, you complete me."],["Duck Gun... my feathered darling. Quack me, baby.","Oh, Duck Gun, I'd take a bullet for you. Several."],["Pizza Cannon... you had me at pepperoni.","Pizza Cannon, my cheesy, explosive soulmate."],["Maxe, we make beautiful music together.","Guitar Maxe! Shred me like you mean it!"],["Machine Gun... oh, baby, you're so loud. I LOVE it.","I'd marry you twice, Chatterbox!","Oh Chatterbox, don't ever stop talking to me!"]];
const P_RELOAD=["Hold on, sweetheart, mama's reloading you.","Open wide, honey, I've got a snack for you.","One sec, my love. Getting you dressed.","I'd never leave you hungry, baby."];
function say(ent,text,o){o=o||{};const B=G.bubbles||(G.bubbles=[]);if(o.kind==='z'&&B.filter(b=>b.kind==='z').length>=4)return;if(o.kind==='p')for(let i=B.length;i--;)if(B[i].kind==='p')B.splice(i,1);
  if(o.kind==='p')speak(text,'player');else if(o.kind==='z'&&Math.random()<.35)speak(text,'zombie');
  B.push({ent:o.stat?null:ent,x:ent.x,y:ent.y,text,t:0,dur:o.dur||(2.6+text.length*.035),kind:o.kind||'z',dy:o.dy||(ent===G?64:54)})}
function onKillTalk(e){
  if(G.zombies.includes(e)&&Math.random()<.3)say(e,pick(Z_DIE),{kind:'z',stat:true,dur:2.2});
  else if(Math.random()<.16)say(G,pick(P_KILL),{kind:'p'});if(Math.random()<.22)sndPlayerKill()}
function tickTalk(dt){
  const B=G.bubbles||(G.bubbles=[]);for(const b of B){b.t+=dt;if(b.ent&&b.ent.hp>0||b.ent===G){b.x=b.ent.x;b.y=b.ent.y}}G.bubbles=B.filter(b=>b.t<b.dur&&!(b.ent&&b.ent!==G&&b.ent.hp<=0));
  G.zTalkT=(G.zTalkT===undefined?2:G.zTalkT)-dt;
  if(G.zTalkT<=0){G.zTalkT=.9+Math.random()*1.6;const near=[...G.zombies,...G.cows,...G.clowns].filter(e=>{const d=Math.hypot(e.x-G.x,e.y-G.y);return d<420&&e.x>40&&e.x<W-40&&e.y>60&&!G.bubbles.some(b=>b.ent===e)});
    if(near.length){const e=pick(near);say(e,G.cows.includes(e)?pick(COW_SORRY):G.clowns.includes(e)?pick(CLOWN_SORRY):pick(Z_SORRY),{kind:'z'})}}
  G.pTalkT=(G.pTalkT===undefined?4:G.pTalkT)-dt;
  if(G.pTalkT<=0){G.pTalkT=5+Math.random()*4;if([...G.zombies,...G.cows,...G.clowns].some(e=>Math.hypot(e.x-G.x,e.y-G.y)<380))say(G,pick(P_TRASH),{kind:'p'})}}
function drawBubbles(){
  ctx.save();ctx.font='700 13px system-ui,Arial';ctx.textBaseline='middle';
  for(const b of G.bubbles||[]){
    const fade=Math.min(1,b.t/.15,(b.dur-b.t)/.4),maxW=b.kind==='p'?230:200,words=b.text.split(' '),lines=[];let cur='';
    for(const w of words){const t=cur?cur+' '+w:w;if(ctx.measureText(t).width>maxW&&cur){lines.push(cur);cur=w}else cur=t}lines.push(cur);
    const lw=Math.max(...lines.map(l=>ctx.measureText(l).width)),bw=lw+18,bh=lines.length*16+12;
    let bx=Math.max(8+bw/2,Math.min(W-8-bw/2,b.x)),by=Math.max(bh+10,b.y-b.dy);
    ctx.globalAlpha=fade;ctx.fillStyle=b.kind==='p'?'#fff7c8':'#e8f2e0';ctx.strokeStyle=b.kind==='p'?'#ff3c8e':'#58703f';ctx.lineWidth=2;
    ctx.beginPath();ctx.roundRect?ctx.roundRect(bx-bw/2,by-bh,bw,bh,9):ctx.rect(bx-bw/2,by-bh,bw,bh);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(bx-6,by-1);ctx.lineTo(Math.max(bx-bw/2+8,Math.min(bx+bw/2-8,b.x)),by+9);ctx.lineTo(bx+6,by-1);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#161616';ctx.textAlign='center';lines.forEach((l,i)=>ctx.fillText(l,bx,by-bh+14+i*16))}
  ctx.restore()}
// ── SFX BANK (procedural Web Audio: no files needed) ──────────────
let sfxBus=null;const lastSnd={};
function bus(){startAudio();if(!audioCtx)return null;if(!sfxBus){sfxBus=audioCtx.createGain();sfxBus.gain.value=.9;sfxBus.connect(audioCtx.destination)}return sfxBus}
function can(k,ms){const n=performance.now();if(n-(lastSnd[k]||0)<ms)return false;lastSnd[k]=n;return true}
function out(pan,vol){const b=bus();if(!b)return null;const g=audioCtx.createGain();g.gain.value=vol;let n=g;if(audioCtx.createStereoPanner){const p=audioCtx.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan||0));g.connect(p);p.connect(b)}else g.connect(b);return g}
// pitched voice: f0->f1 sweep, optional vibrato + lowpass
function voice(f0,f1,dur,vol,type,o){o=o||{};try{const c=audioCtx&&bus()?audioCtx:null;if(!c)return;const t=c.currentTime,osc=c.createOscillator(),g=c.createGain(),lp=c.createBiquadFilter(),dst=out(o.pan,1);
  osc.type=type||'sawtooth';osc.frequency.setValueAtTime(f0,t+(o.delay||0));osc.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+(o.delay||0)+dur);
  lp.type='lowpass';lp.frequency.value=o.lp||1400;lp.Q.value=o.q||2;
  g.gain.setValueAtTime(.0001,t+(o.delay||0));g.gain.exponentialRampToValueAtTime(vol,t+(o.delay||0)+(o.att||.03));g.gain.exponentialRampToValueAtTime(.0001,t+(o.delay||0)+dur);
  if(o.vib){const l=c.createOscillator(),lg=c.createGain();l.frequency.value=o.vib;lg.gain.value=o.vibD||f0*.06;l.connect(lg);lg.connect(osc.frequency);l.start(t);l.stop(t+dur+.1)}
  osc.connect(lp);lp.connect(g);g.connect(dst);osc.start(t+(o.delay||0));osc.stop(t+(o.delay||0)+dur+.05)}catch(e){}}
function noiseHit(dur,vol,freq,type,o){o=o||{};try{if(!bus())return;const c=audioCtx,t=c.currentTime+(o.delay||0),buf=c.createBuffer(1,Math.max(1,Math.floor(c.sampleRate*dur)),c.sampleRate),d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,o.decay||2);
  const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=buf;f.type=type||'lowpass';f.frequency.value=freq||800;f.Q.value=o.q||.8;g.gain.value=vol;
  s.connect(f);f.connect(g);g.connect(out(o.pan,1));s.start(t)}catch(e){}}
// ── FORMANT VOICE: a buzzing "vocal cord" (sawtooth) shaped by 3 vowel resonances + breath noise.  v -> v2 morphs the vowel (e.g. 'uh'->'o').
const VOWELS={a:[[730,9,1],[1090,9,.7],[2440,10,.35]],o:[[570,9,1],[840,9,.55],[2410,10,.2]],u:[[320,8,1],[870,8,.4],[2240,10,.15]],e:[[530,9,1],[1840,9,.6],[2480,10,.3]],i:[[280,8,1],[2250,9,.5],[3010,10,.3]],uh:[[640,9,1],[1190,9,.6],[2390,10,.25]],ae:[[660,9,1],[1720,9,.6],[2410,10,.3]]};
const FV_GAIN=3.2;
function fvoice(o){
  try{
    if(!bus())return;const c=audioCtx,t=c.currentTime+(o.delay||0),dur=o.dur,att=o.att||.04,rel=Math.min(.28,dur*.45),dst=out(o.pan,1);if(!dst)return;
    const src=c.createOscillator();src.type='sawtooth';src.frequency.setValueAtTime(o.f0,t);src.frequency.exponentialRampToValueAtTime(Math.max(35,o.f1||o.f0),t+dur);
    const lfo=c.createOscillator(),lg=c.createGain();lfo.frequency.value=o.vib||5.2;lg.gain.value=o.vibD!==undefined?o.vibD:o.f0*.03;lfo.connect(lg);lg.connect(src.frequency);          // vibrato
    const jit=c.createOscillator(),jg=c.createGain();jit.type='triangle';jit.frequency.value=7.5+Math.random()*3.5;jg.gain.value=o.f0*.012;jit.connect(jg);jg.connect(src.frequency);   // tiny pitch wobble = sounds alive
    const v1=VOWELS[o.v||'a'],v2=VOWELS[o.v2||o.v||'a'],mix=c.createGain();
    const nb=c.createBuffer(1,Math.max(1,Math.floor(c.sampleRate*(dur+.15))),c.sampleRate),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
    const ns=c.createBufferSource();ns.buffer=nb;const ng=c.createGain();ng.gain.value=(o.breath||0)*4;ns.connect(ng);                                                                  // breath / rasp
    for(let i=0;i<3;i++){const bp=c.createBiquadFilter();bp.type='bandpass';bp.Q.value=v1[i][1];bp.frequency.setValueAtTime(v1[i][0],t);bp.frequency.linearRampToValueAtTime(v2[i][0],t+dur);
      const g=c.createGain();g.gain.value=v1[i][2]*(o.fgain||1);src.connect(bp);ng.connect(bp);bp.connect(g);g.connect(mix)}
    const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=o.lp||3000;
    const vol=Math.max(.0004,o.vol*FV_GAIN),amp=c.createGain();amp.gain.setValueAtTime(.0001,t);amp.gain.exponentialRampToValueAtTime(vol,t+att);amp.gain.setValueAtTime(vol,t+Math.max(att,dur-rel));amp.gain.exponentialRampToValueAtTime(.0001,t+dur);
    const nodes=[src,lfo,jit,ns];
    if(o.rough){const r=c.createOscillator(),rg=c.createGain();r.type='square';r.frequency.value=o.rough;rg.gain.value=vol*.4;r.connect(rg);rg.connect(amp.gain);nodes.push(r)}                // growly throat roughness
    mix.connect(lp);lp.connect(amp);amp.connect(dst);nodes.forEach(n=>{n.start(t);n.stop(t+dur+.12)});
  }catch(e){}
}
// ── player voice ──
function sndPlayerHurt(){if(!can('phurt',380))return;const r=Math.random(),pan=0;
  if(r<.4)fvoice({f0:150,f1:96,dur:.26,vol:.5,v:'uh',v2:'o',breath:.22,att:.012,vib:7,vibD:4});                      // "ugh!"
  else if(r<.75)fvoice({f0:132,f1:82,dur:.3,vol:.5,v:'o',v2:'u',breath:.28,att:.01});                                // "oof"
  else fvoice({f0:196,f1:125,dur:.3,vol:.48,v:'a',v2:'o',breath:.2,att:.012,vib:8,vibD:6});                          // "aah!"
  noiseHit(.1,.3,500,'lowpass')}
function sndPlayerDeath(){fvoice({f0:210,f1:72,dur:1.15,vol:.55,v:'a',v2:'o',breath:.25,att:.03,vib:6,vibD:9});fvoice({f0:92,f1:48,dur:.65,vol:.4,v:'u',v2:'o',rough:20,breath:.35,lp:1700,delay:.75});noiseHit(.45,.45,300,'lowpass',{delay:.2})}
function sndPlayerEffort(){if(!can('peffort',260))return;fvoice({f0:142,f1:118,dur:.17,vol:.34,v:'a',v2:'e',breath:.5,att:.012,delay:.04})}                // "hah!" when swinging
function sndPlayerKill(){if(!can('pkill',900))return;fvoice({f0:168,f1:138,dur:.15,vol:.28,v:'e',v2:'uh',breath:.4,att:.01})}                         // "heh"
// ── player ──
function sndShot(w){
  if(w===0){noiseHit(.05,.8,2500,'highpass');noiseHit(.14,.7,500,'lowpass');voice(220,40,.12,.5,'sawtooth',{lp:700})}
  else if(w===1){noiseHit(.08,.9,2000,'highpass');noiseHit(.28,.9,320,'lowpass',{decay:1.6});voice(120,28,.22,.7,'sawtooth',{lp:500});voice(160,35,.15,.4,'square',{lp:500,delay:.02})}
  else if(w===2){voice(90,30,.3,.8,'sine',{lp:400});noiseHit(.3,.6,600,'lowpass');voice(500,120,.18,.3,'triangle',{delay:.08});setTimeout(()=>{noiseHit(.22,.5,1800,'bandpass')},90)}
  else if(w===4){const j=.9+Math.random()*.25;noiseHit(.035,.75,2800,'highpass');noiseHit(.09,.65,650*j,'lowpass');voice(250*j,65,.08,.45,'sawtooth',{lp:900})}
  else{voice(110,420,.35,.5,'sawtooth',{vib:30,vibD:40,lp:2400});noiseHit(.5,.5,3000,'bandpass',{q:3});voice(880,110,.4,.35,'square',{delay:.05,lp:2200})}
}
function sndClick(){if(!can('click',180))return;voice(900,700,.04,.25,'square',{lp:3000,att:.005})}
function sndReload(){noiseHit(.04,.5,2200,'highpass');voice(300,200,.07,.25,'square',{lp:1500,att:.005});setTimeout(()=>{noiseHit(.05,.45,1800,'highpass');voice(220,150,.08,.25,'square',{lp:1200,att:.005})},260)}
function sndReloadDone(){noiseHit(.06,.6,2500,'highpass');voice(480,260,.06,.3,'square',{lp:2500,att:.004});setTimeout(()=>voice(340,200,.09,.3,'square',{lp:1800,att:.004}),90)}
function sndMelee(){sndPlayerEffort();noiseHit(.22,.55,1500,'bandpass',{q:1.2,decay:.8});setTimeout(()=>{noiseHit(.12,.7,260,'lowpass');voice(120,50,.12,.5,'sine')},110)}
function sndSqueak(k,left){            // rubber soles on wet blood: stick-slip squeak + wet slap
  const j=(left?1:1.15)*(.92+Math.random()*.16),v=.5+.3*k;
  voice(1000*j,2100*j,.09,v,'triangle',{lp:4800,q:6,att:.006,vib:52,vibD:120});
  if(Math.random()<.6)voice(1500*j,2500*j,.055,v*.6,'sine',{lp:5200,att:.005,delay:.05});
  noiseHit(.07,.18+.1*k,560,'lowpass',{decay:2});noiseHit(.04,.1,3400,'bandpass',{q:2});
}
function sndStep(){if(!can('step',120))return;noiseHit(.07,.8,420+Math.random()*200,'lowpass',{decay:3});voice(95,55,.06,.16,'sine',{lp:300,att:.004})}
// ── zombies & friends ──
function panFor(e){return (e.x-G.x)/420}
function volFor(e,max){const d=Math.hypot(e.x-G.x,e.y-G.y);return max*Math.max(.12,1-d/760)}
function zGroan(e,big){
  const pan=panFor(e),v=volFor(e,big?.55:.42),sz=big?.72:(.88+Math.random()*.3),r=Math.random();
  if(r<.4)fvoice({f0:118*sz,f1:84*sz,dur:1+Math.random()*.5,vol:v,v:'uh',v2:'o',vib:4.6+Math.random()*1.6,vibD:5,breath:.16,rough:r<.2?24:0,lp:2300,att:.15,pan});            // long moan  "uuhh-ooo"
  else if(r<.7)fvoice({f0:100*sz,f1:70*sz,dur:.8+Math.random()*.4,vol:v,v:'a',v2:'u',rough:30,breath:.3,lp:2000,att:.08,pan});                                                // rattly   "aaah-uu"
  else{fvoice({f0:130*sz,f1:95*sz,dur:.45,vol:v,v:'e',v2:'uh',breath:.22,att:.05,pan});fvoice({f0:105*sz,f1:75*sz,dur:.7,vol:v*.9,v:'o',v2:'u',breath:.22,att:.06,pan,delay:.4})}     // "eh-uhh... ooouh"
}
function zGrowl(e){fvoice({f0:92,f1:68,dur:.42,vol:volFor(e,.55),v:'a',v2:'o',rough:34,breath:.35,lp:1700,att:.03,pan:panFor(e)})}
function enemyHitSnd(e){
  noiseHit(.09,Math.min(.6,volFor(e,.7)),900,'lowpass',{pan:panFor(e),decay:2.5});voice(180,70,.09,volFor(e,.35),'sine',{pan:panFor(e)});
  if(G.zombies.includes(e)&&can('zpain',160)&&Math.random()<.45)fvoice({f0:175,f1:112,dur:.22,vol:volFor(e,.4),v:'ae',v2:'uh',breath:.18,att:.015,pan:panFor(e)});
}
function enemyDeathSnd(e){const pan=panFor(e),v=volFor(e,.6);
  if(e===G.boss){fvoice({f0:84,f1:34,dur:1.5,vol:.42,v:'a',v2:'o',rough:20,breath:.4,lp:1700,att:.05});noiseHit(.7,.5,200,'lowpass');return}
  if(e===G.ufo){sndUfoDeathHum();return}
  if(G.cows.includes(e)){fvoice({f0:176,f1:112,dur:.95,vol:v,v:'o',v2:'u',vib:4,vibD:4,breath:.1,att:.1,pan});return}                                                                 // dying moo
  if(G.clowns.includes(e)){for(let i=0;i<4;i++)fvoice({f0:390+(i%2)*60,f1:300,dur:.11,vol:v*.8,v:'a',v2:'e',breath:.3,att:.01,delay:i*.14,pan});return}                                // giggle that fades
  fvoice({f0:150,f1:52,dur:.95,vol:v,v:'a',v2:'o',rough:18,breath:.4,lp:1800,att:.04,pan});noiseHit(.22,v*.8,250,'lowpass',{pan,delay:.4})                                          // death rattle
}
function sndUfoBoom(){noiseHit(.9,.85,900,'lowpass',{decay:1.4});noiseHit(.35,.7,3000,'highpass');voice(160,30,.7,.9,'sine',{lp:400});voice(520,70,.5,.35,'sawtooth',{lp:1500,delay:.03})}
function sndBossRoar(){fvoice({f0:78,f1:48,dur:1.3,vol:.42,v:'a',v2:'o',rough:26,breath:.4,lp:1800,att:.1});fvoice({f0:156,f1:96,dur:1.1,vol:.16,v:'o',v2:'a',breath:.25,att:.12,delay:.05});noiseHit(.9,.3,300,'lowpass',{decay:1.2})}
function sndUfoDeathHum(){noiseHit(.8,.7,1200,'bandpass',{q:1.5});voice(900,60,.8,.5,'sawtooth',{lp:2000})}
function sndBoomSmall(){noiseHit(.5,.7,700,'lowpass',{decay:1.6});voice(150,35,.4,.6,'sine',{lp:400})}
function eventSnd2(t){
  if(t==='ASTEROID'){voice(900,110,1.0,.35,'sawtooth',{lp:1800,att:.25});return true}
  if(t==='PIZZA'){[523,659,784,1047].forEach((f,i)=>voice(f,f,.2,.25,'triangle',{delay:i*.12,lp:3000}));return true}
  if(t==='BLACKOUT'){voice(600,40,1.3,.5,'sawtooth',{lp:900,att:.05});noiseHit(.5,.4,200,'lowpass');return true}
  if(t==='BOOM'){sndBoomSmall();voice(300,80,.4,.3,'square',{lp:900,delay:.15});return true}
  if(t==='DRUNK'){voice(320,180,1.2,.35,'sine',{vib:6,vibD:70,att:.1});voice(480,260,1.1,.2,'triangle',{vib:5,vibD:60,delay:.1});return true}
  if(t==='FRENZY'){voice(200,1000,.7,.4,'sawtooth',{lp:2600,att:.1});return true}
  if(t==='NIGHTMARE'){for(let i=0;i<8;i++)voice(520+(i%2)*170,260,.15,.3,'square',{delay:i*.15,lp:1800});voice(70,55,1.7,.45,'sawtooth',{lp:320});return true}
  if(t==='HORDE'||t==='TITAN'||t==='SPLIT'){voice(140,120,.8,.5,'sawtooth',{lp:700});voice(210,175,.8,.3,'square',{lp:600,delay:.05});return true}
  return false}
function eventSnd(t){if(eventSnd2(t))return;
  if(t==='COW'){for(let i=0;i<3;i++)voice(210+i*30,140+i*20,.8,.4,'sawtooth',{lp:700,vib:5,vibD:12,att:.1,delay:i*.35,pan:(i-1)*.5})}
  else if(t==='CLOWN'){for(let i=0;i<4;i++)voice(620+(i%2)*120,300,.16,.3,'square',{lp:1800,delay:i*.17})}
  else if(t==='UFO'){voice(180,420,1.2,.4,'sine',{vib:9,vibD:60,att:.2});voice(360,840,1.1,.18,'triangle',{vib:9,vibD:90,att:.2})}
}
// ambient zombie audio: positional groans from the nearest zombie, growl when one is on you, corpse aging
function inBlood(){return G.decals.some(d=>d.t>1.2&&Math.pow((G.x-d.x)/28,2)+Math.pow((G.y+12-d.y)/17,2)<1)}   // feet are a little below the centre
function playerStepTick(dt,len){
  G.footT-=dt*(len>.7?1.25:1);if(G.footT>0)return;G.footT=.27;G.footL=!G.footL;
  if(inBlood())G.feetBlood=1;                                   // step in a puddle -> feet are red and wet
  if((G.feetBlood||0)>.04){
    const k=G.feetBlood,pa=G.moveAng+Math.PI/2,side=G.footL?-1:1;
    (G.prints||(G.prints=[])).push({x:G.x+Math.cos(pa)*5*side,y:G.y+12+Math.sin(pa)*5*side,ang:G.moveAng,al:Math.min(.85,k*.9),t:7,max:7});
    if(G.prints.length>90)G.prints.shift();
    sndSqueak(k,G.footL);G.feetBlood=Math.max(0,k-.085);       // prints & squeaks fade over ~12 steps
  }else sndStep();
}
function tickExtras(dt){for(const p of (G.prints||[]))p.t-=dt;if(G.prints)G.prints=G.prints.filter(p=>p.t>0);tickTalk(dt);tickEvents(dt);
  for(const c of (G.corpses||[])){c.t+=dt;if(c.vx||c.vy){c.x=Math.max(10,Math.min(W-10,c.x+c.vx*dt));c.y=Math.max(10,Math.min(H-10,c.y+c.vy*dt));const f=Math.pow(.02,dt);c.vx*=f;c.vy*=f}
    if(c.type==='ufo'){if(c.t<.9&&Math.random()<dt*30)G.particles.push({x:c.x+(Math.random()-.5)*50,y:c.y+(Math.random()-.5)*20,vx:(Math.random()-.5)*90,vy:-30-Math.random()*70,t:.5,life:.5,c:Math.random()<.5?'#ffe27a':'#7cf7ff',r:1.5+Math.random()*2.5});if(c.t>=.9&&!c.boom)ufoBoom(c)}}
  if(G.boomFlash>0)G.boomFlash=Math.max(0,G.boomFlash-dt); if(G.corpses)G.corpses=G.corpses.filter(c=>c.t<(c.type==='ufo'?8:10));
  G.groanT=(G.groanT===undefined?2:G.groanT)-dt;
  if(G.groanT<=0){G.groanT=1.1+Math.random()*2.2;let b=null,bd=700;for(const z of G.zombies){const d=Math.hypot(z.x-G.x,z.y-G.y);if(d<bd){bd=d;b=z}}if(b)zGroan(b,false)}
  for(const z of G.zombies)if(Math.hypot(z.x-G.x,z.y-G.y)<z.r+34){if(can('zgrowl',900))zGrowl(z);break}
}
function tone(freq,dur,type='sine',vol=.045){
  try{startAudio();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur)}catch(e){}
}
function phoneRing(){tone(880,.10,'square',.05);setTimeout(()=>tone(660,.10,'square',.05),130);setTimeout(()=>tone(880,.10,'square',.05),260)}
function shoeSqueak(){tone(420,.055,'triangle',.055);setTimeout(()=>tone(280,.07,'triangle',.035),45);vibrate(8)}
function triggerPhoneCall(){
  if(!G.running)return;
  phoneRing();
  const q=ZOMBIE_QUOTES[Math.floor(Math.random()*ZOMBIE_QUOTES.length)];
  const ev=document.getElementById('event');
  if(ev){ev.textContent='📞 ZOMBIE CALL: '+q;ev.className='event-call';setTimeout(()=>{if(G.running&&ev.className==='event-call')ev.textContent=G.event?(EVENT_LABELS[G.event]||''):''},4200)}
}
function spawnPizzaBoy(){
  const side=Math.floor(Math.random()*4),pad=70;
  let x=side<2?(side===0?-pad:W+pad):Math.random()*W;
  let y=side>=2?(side===2?-pad:H+pad):Math.random()*H;
  G.pizzaBoy={x,y,tx:G.x,ty:G.y,life:8,drop:false,frame:0};
  phoneRing();
}
function updatePizzaBoy(dt){
  const b=G.pizzaBoy; b.frame+=dt*10;
  const dx=G.x-b.x,dy=G.y-b.y,d=Math.hypot(dx,dy)||1;
  if(d>90){b.x+=dx/d*150*dt;b.y+=dy/d*150*dt}
  else if(!b.drop){b.drop=true;G.hp=Math.min(100,G.hp+30);G.score+=250;burst(b.x,b.y,'#ffd34e',22);tone(740,.15,'sine',.06);const ev=document.getElementById('event');if(ev)ev.textContent='🍕 PIZZA DELIVERY! +30 HP';}
  else {b.life-=dt;b.x+=(b.x<W/2?-1:1)*70*dt}
  if(b.life<=0)G.pizzaBoy=null;
}

function update(dt){if(!G.running||G.over)return;G.shake=Math.max(0,G.shake-dt*20);G.flashT=Math.max(0,(G.flashT||0)-dt);G.attackT=Math.max(0,G.attackT-dt);G.hurtT=Math.max(0,(G.hurtT||0)-dt);for(const e of allEnemies())if(e.hitT>0)e.hitT=Math.max(0,e.hitT-dt);if(G.shootCd>0)G.shootCd-=dt*1000;if(G.reload>0){G.reload-=dt*1000;if(G.reload<=0){G.reload=0;G.ammo=WEAPONS[G.weapon].ammo;sndReloadDone();document.getElementById('reload').style.display='none'}}if(G.comboT>0){G.comboT-=dt;if(G.comboT<=0)G.combo=0}G.phoneT-=dt;if(mouseHeld&&!('ontouchstart' in window))fire();tickExtras(dt);
if(G.phoneT<=0){ triggerPhoneCall(); G.phoneT=10+Math.random()*18; }
G.pizzaT-=dt;
if(G.pizzaT<=0 && !G.pizzaBoy){ spawnPizzaBoy(); G.pizzaT=55+Math.random()*35; }
if(G.pizzaBoy){ updatePizzaBoy(dt); }
G.eventCooldown-=dt;if(G.eventCooldown<=0&&!G.event){pickEvent()}
let mx=0,my=0;if(keys.w)my--;if(keys.s)my++;if(keys.a)mx--;if(keys.d)mx++;if(joy.x||joy.y){mx=joy.x;my=joy.y}if(G.fx&&G.fx.drunk){mx=-mx;my=-my}const len=Math.hypot(mx,my);if(len>0){mx/=Math.max(1,len);my/=Math.max(1,len);const sp=260*(len>.7?1.2:1);G.x+=mx*sp*dt;G.y+=my*sp*dt}G.x=Math.max(25,Math.min(W-25,G.x));G.y=Math.max(25,Math.min(H-25,G.y));if(len>0){G.moveAng=Math.atan2(my,mx);playerStepTick(dt,len)}if(G.autoAim){let b=null,bd=Infinity;for(const e of allEnemies()){if(e.hp<=0)continue;const d=Math.hypot(e.x-G.x,e.y-G.y);if(d<bd){bd=d;b=e}}if(b&&bd<500){const target=Math.atan2(b.y-G.y,b.x-G.x);G.angle=lerpAngle(G.angle,target,.08)}}
for(const z of G.zombies)moveEnemy(z,dt,z.spd||45);for(const c of G.cows)moveEnemy(c,dt,c.speed);for(const c of G.clowns)moveEnemy(c,dt,c.speed);if(G.boss)moveEnemy(G.boss,dt,G.boss.speed);if(G.ufo){G.ufo.t+=dt;G.ufo.x=G.x+Math.cos(G.ufo.t*.7)*260;G.ufo.y=G.y-220+Math.sin(G.ufo.t)*80;if(Math.sin(G.ufo.t*2)>.96)hurt(8*dt)}
G.zombies=G.zombies.filter(e=>e.hp>0);G.cows=G.cows.filter(e=>e.hp>0);G.clowns=G.clowns.filter(e=>e.hp>0);for(const b of G.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;for(const e of allEnemies()){if(e.hp>0&&Math.hypot(e.x-b.x,e.y-b.y)<e.r){damage(e,b.dmg);if(b.explosive){for(const q of allEnemies())if(Math.hypot(q.x-b.x,q.y-b.y)<110)damage(q,b.dmg*.7);burst(b.x,b.y,'#ff9b00',30)}if(!b.shock){b.life=0;break}}}}G.bullets=G.bullets.filter(b=>b.life>0);for(const p of G.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;p.t-=dt}G.particles=G.particles.filter(p=>p.t>0);
for(const e of allEnemies()){if(e.hp>0&&Math.hypot(e.x-G.x,e.y-G.y)<e.r+18)hurt((e && G.cows.includes(e)?8:18)*dt)}
G.spawnT-=dt;if(G.spawnT<=0){G.spawnT=Math.max(.18,1.2-G.wave*.012);for(let i=0;i<1+Math.floor(G.wave/12);i++)spawnZombie()}const waveGoal=12+Math.min(120,Math.floor(G.wave*3.5));if(G.waveKills>=waveGoal&&G.zombies.length+G.cows.length+G.clowns.length<6+Math.min(60,Math.floor(G.wave*.5))){startWave(G.wave+1)}if(G.eventT>0){G.eventT-=dt;if(G.eventT<=0)endEvent()}updateHUD()}
function moveEnemy(e,dt,sp){const a=Math.atan2(G.y-e.y,G.x-e.x);e.x+=Math.cos(a)*sp*dt;e.y+=Math.sin(a)*sp*dt;e.t+=dt}
function lerpAngle(a,b,t){let d=Math.atan2(Math.sin(b-a),Math.cos(b-a));return a+d*t}const IS_TOUCH=('ontouchstart' in window)||navigator.maxTouchPoints>0;
function vibrate(ms){if(!IS_TOUCH)return;try{navigator.vibrate&&navigator.vibrate(ms)}catch(e){}}   // haptics: touch devices only
function updateHUD(){document.getElementById('score').textContent='SCORE '+G.score.toLocaleString();document.getElementById('wave').textContent='WAVE '+G.wave;document.getElementById('hp').textContent='♥ '+Math.max(0,Math.ceil(G.hp));const w=WEAPONS[G.weapon];document.getElementById('ammo').textContent='🔫 '+w.name.toUpperCase()+'  '+((G.fx&&G.fx.frenzy)?'∞':G.ammo)+' / '+w.ammo;const ev=document.getElementById('event');ev.textContent=G.event?(EVENT_LABELS[G.event]||''):'';ev.className=G.event==='DISCO'?'event-disco':'event-'+(G.event||'').toLowerCase();if(G.reload>0)document.getElementById('reloadFill').style.width=(100-G.reload/WEAPONS[G.weapon].reload*100)+'%'}
function drawSheet(im,col,row,cols,rows,x,y,w,h,flip=false){if(!im)return;const sw=im.width/cols,sh=im.height/rows;if(flip){ctx.save();ctx.translate(x+w,y);ctx.scale(-1,1);ctx.drawImage(im,col*sw,row*sh,sw,sh,0,0,w,h);ctx.restore()}else ctx.drawImage(im,col*sw,row*sh,sw,sh,x,y,w,h)}
// ── ANIMATION (clean atlases built from the raw sheets: assets/atlas/*.png + atlas.json) ──
function drawAnim(key,name,fi,x,y,h,flip,alpha){
  const a=ATLAS[key],im=img[key]; if(!a||!im)return false; const an=a.anims[name]; if(!an)return false;
  const f=Math.min(an[1]-1,Math.max(0,fi|0)), w=h*a.cw/a.ch;
  ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);if(alpha!==undefined&&alpha<1)ctx.globalAlpha=alpha;
  ctx.drawImage(im,f*a.cw,an[0]*a.ch,a.cw,a.ch,-w/2,-h/2,w,h);ctx.restore();return true;
}
function nFrames(key,name){const a=ATLAS[key];return a&&a.anims[name]?a.anims[name][1]:1}
function loopFrame(e,key,name,fps){return Math.floor((e.t||0)*(fps||10))%nFrames(key,name)}
function hurtFrame(e,key,name){const n=nFrames(key,name);return Math.floor((1-e.hitT/.16)*n)}
// clown_tp columns are directions (UP, UP-RIGHT, RIGHT, DOWN-RIGHT, DOWN), not animation frames
function dirCol(ang){let flip=false,c=Math.cos(ang),sn=Math.sin(ang);if(c<0){flip=true;c=-c}const v=Math.atan2(sn,c);return{col:Math.round((v+Math.PI/2)/(Math.PI/4)),flip}}
function drawActor(e,type,size){
  const view=G.view;let key=type+'_'+view;const dist0=Math.hypot(G.x-e.x,G.y-e.y);if(type==='clown')key='clown_fp';const dist=dist0,hit=e.hitT>0;let name,fr,flip=false,h=size;
  if(type==='zombie'){name=hit?'hurt':dist<55?'attack':dist<170?'run':'walk';h=size+8}
  else if(type==='cow'){name=view==='tp'?(hit?'hit':dist<220?'run':'walk'):(hit?'hurt':dist<90?'attack':dist<220?'run':'walk');h=size+(view==='fp'?6:2)}
  else if(type==='clown'){name=hit?'hurt':dist<62?'lunge':dist<118?'attack':dist>430?'laugh':'walk';h=size+14}
  else if(type==='boss'){name=hit?'hurt':dist<130?'attack':'walk';h=size*1.05}
  else if(type==='ufo'){name=view==='tp'?(hit?'hurt':dist<220?'run':'idle'):(hit?'hurt':'walk')}
  if(hit&&!(ATLAS[key]&&ATLAS[key].anims[name]))name=null;
  if(!name||!(ATLAS[key]&&ATLAS[key].anims[name])){name=ATLAS[key]&&ATLAS[key].anims.walk?'walk':Object.keys((ATLAS[key]||{anims:{}}).anims)[0]}
  if(hit&&(name==='hurt'||name==='hit'))fr=hurtFrame(e,key,name);
  else{const spd=type==='zombie'?(e.spd||45):(e.speed||45);fr=loopFrame(e,key,name,type==='ufo'?8:Math.max(6,Math.min(15,5+spd*.12)))}   // legs keep pace with how fast it really moves
  const vs=e.vs||(e.vs=.93+Math.random()*.14);h*=vs;                                    // each enemy a touch bigger / smaller
  if(type==='zombie'||type==='clown'){const dx=e.x-(e._lx===undefined?e.x:e._lx);if(Math.abs(dx)>.12)e.face=dx<0?-1:1;e._lx=e.x;flip=e.face===-1}   // face the way it is walking
  const air=type==='ufo';ctx.save();ctx.globalAlpha=air?.2:.34;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(e.x,e.y+h*(air?.62:.4),h*(air?.26:.3),h*(air?.07:.1),0,0,7);ctx.fill();ctx.restore();   // ground shadow
  drawAnim(key,name,fr,e.x,e.y,h,flip,1);
  if(hit){ctx.save();ctx.globalCompositeOperation='lighter';drawAnim(key,name,fr,e.x,e.y,h,flip,Math.min(.6,e.hitT/.16*.7));ctx.restore()}   // white-hot flash when hit
}
function addCorpse(e){
  let type=G.zombies.includes(e)?'zombie':G.cows.includes(e)?'cow':G.clowns.includes(e)?'clown':e===G.boss?'boss':e===G.ufo?'ufo':null;if(!type)return;
  corpseSpawn(e,type);
}
function corpseSpawn(e,type){
  const away=Math.atan2(e.y-G.y,e.x-G.x),c={type,x:e.x,y:e.y,scale:e.scale||1,t:0,view:type==='clown'?'fp':G.view,dir:away,flip:e.x>G.x,boom:false,seed:Math.random()*9};
  if(type==='ufo')c.view=G.view;
  const kb=type==='boss'?0:type==='ufo'?0:150;c.vx=Math.cos(away)*kb;c.vy=Math.sin(away)*kb;      // knocked away from the player
  (G.corpses||(G.corpses=[])).push(c);
  if(type!=='ufo'&&type!=='boss')for(let i=0;i<12;i++){const a=away+(Math.random()-.5)*1.5,sp=60+Math.random()*190;G.particles.push({x:e.x,y:e.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,t:.8,life:.8,c:Math.random()<.3?'#5a0a14':'#a3142a',r:1.6+Math.random()*3.2})}
}
function ufoBoom(c){
  c.boom=true;G.shake=Math.max(G.shake,IS_TOUCH?18:12);G.boomFlash=.28;vibrate([90,40,160]);sndUfoBoom();
  for(let i=0;i<46;i++){const a=Math.random()*Math.PI*2,sp=60+Math.random()*340;G.particles.push({x:c.x,y:c.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,t:.9,life:.9,c:['#ffd24a','#ff8a1e','#ff4a1e','#ffffff','#b47cff'][i%5],r:2+Math.random()*5})}
  for(let i=0;i<10;i++){const a=Math.random()*Math.PI*2,sp=40+Math.random()*120;G.particles.push({x:c.x,y:c.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,t:1.6,life:1.6,c:'#2a2630',r:6+Math.random()*9})}
}
function drawCorpses(){
  for(const c of (G.corpses||[])){
    const key=c.type+'_'+c.view,a=ATLAS[key]; if(!a||!a.anims.death)continue; const n=a.anims.death[1],t=c.t,life=c.type==='ufo'?8:10;
    const fade=Math.max(0,Math.min(1,(life-t)/2));
    if(c.type==='ufo'){
      const h=c.view==='tp'?92:96,haveHurt=a.anims.hurt;
      if(t<.9){                                           // stage 1: sparking, wobbling, sinking
        const j=(1-t/.9)*4+1.5,ox=Math.sin(t*61+c.seed)*j,oy=Math.cos(t*47)*j+t*22;
        drawAnim(key,haveHurt?'hurt':'death',Math.floor(t*14)%(haveHurt?a.anims.hurt[1]:1),c.x+ox,c.y+oy,h*(1-t*.08),false,1);
        if(Math.floor(t*14)%2===0){ctx.save();ctx.globalCompositeOperation='lighter';const gg=ctx.createRadialGradient(c.x+ox,c.y+oy,0,c.x+ox,c.y+oy,h*.55);gg.addColorStop(0,'rgba(255,255,255,'+(.55*(t/.9))+')');gg.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gg;ctx.beginPath();ctx.arc(c.x+ox,c.y+oy,h*.55,0,7);ctx.fill();ctx.restore()}
      }else{                                              // stage 2: explosion fireballs, then the wreck settles
        const u=t-.9;
        drawAnim(key,'death',Math.min(n-1,Math.floor(u*7)),c.x,c.y+20,h*1.05,false,fade);
        if(u<.7){ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0;i<4;i++){const k=Math.min(1,u/.55),ang=i*1.7+c.seed,rr=(26+i*14)*(.4+k*1.6),px=c.x+Math.cos(ang)*rr*.55,py=c.y+20+Math.sin(ang)*rr*.4;
          const g=ctx.createRadialGradient(px,py,0,px,py,rr);g.addColorStop(0,'rgba(255,245,200,'+(.95*(1-k))+')');g.addColorStop(.4,'rgba(255,140,30,'+(.7*(1-k))+')');g.addColorStop(1,'rgba(200,40,10,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py,rr,0,7);ctx.fill()}ctx.restore()}
      }
      continue}
    // zombies / cows / clowns / boss: fall fast, settle slow (ease-out), blood pool spreads under the body
    const k=Math.min(1,t/(c.type==='boss'?1.4:.95)),ease=1-Math.pow(1-k,2.2),fi=Math.min(n-1,Math.floor(ease*n));
    const pool=Math.min(1,t/2.2),size=({zombie:66,cow:68,clown:80,boss:150}[c.type]||70)*(c.scale||1);
    if(t>.25&&c.type!=='boss'){ctx.save();ctx.globalAlpha=.55*fade*pool;ctx.fillStyle='#4d0710';ctx.beginPath();ctx.ellipse(c.x,c.y+size*.16,8+pool*size*.3,4+pool*size*.13,0,0,7);ctx.fill();ctx.restore()}
    drawAnim(key,'death',fi,c.x,c.y,size,c.flip&&c.type!=='clown',fade);
  }
}
function drawFloor(){const s=48;ctx.fillStyle='#171927';ctx.fillRect(0,0,W,H);for(let x=0;x<W;x+=s)for(let y=0;y<H;y+=s){ctx.strokeStyle='#25293b';ctx.strokeRect(x,y,s,s)}for(let i=0;i<10;i++){ctx.fillStyle='rgba(0,180,255,.06)';ctx.fillRect((i*137+G.wave*5)%W,0,3,H)}}
function drawDisco(){ctx.save();const pulse=(Math.sin(performance.now()/90)+1)/2;for(let x=0;x<W;x+=48)for(let y=0;y<H;y+=48){const hue=(x/48+y/48+performance.now()/120)%3;ctx.fillStyle=hue<1?'rgba(0,180,255,'+(0.12+pulse*.22)+')':hue<2?'rgba(40,255,90,'+(0.12+pulse*.22)+')':'rgba(255,40,70,'+(0.12+pulse*.22)+')';ctx.fillRect(x,y,46,46)}ctx.translate(W/2,70);ctx.rotate(performance.now()/1800);ctx.fillStyle='#ddd';ctx.beginPath();ctx.arc(0,0,35,0,7);ctx.fill();for(let i=0;i<18;i++){ctx.fillStyle=i%3===0?'#2cf':i%3===1?'#3f5':'#f44';ctx.fillRect(Math.cos(i)*32,Math.sin(i)*32,5,5)}ctx.restore();for(let i=0;i<22;i++){const a=performance.now()/500+i*0.93;const sx=W/2+Math.cos(a*1.7+i)*W*.48,sy=80+Math.abs(Math.sin(a+i))*H*.72;ctx.fillStyle=['#19f','#3f5','#f44'][i%3];ctx.globalAlpha=.35+.35*Math.sin(performance.now()/100+i);ctx.fillRect(sx,sy,3,3);}ctx.globalAlpha=1;for(let i=0;i<5;i++){const a=performance.now()/700+i*1.25;const x=W/2+Math.cos(a)*W*.65;ctx.fillStyle=i%3===0?'rgba(0,170,255,.09)':i%3===1?'rgba(50,255,100,.09)':'rgba(255,40,50,.09)';ctx.beginPath();ctx.moveTo(W/2,80);ctx.lineTo(x,H);ctx.lineTo(x+100,H);ctx.closePath();ctx.fill()}}
function drawUFO(){const u=G.ufo;drawActor(u,'ufo',G.view==='tp'?92:96);ctx.fillStyle='rgba(90,255,220,.18)';ctx.beginPath();ctx.moveTo(u.x-38,u.y+20);ctx.lineTo(u.x+38,u.y+20);ctx.lineTo(u.x+80,G.y);ctx.lineTo(u.x-80,G.y);ctx.closePath();ctx.fill()}
// dark-grey gun: gunmetal body, lighter top edge so it still reads against the dark floor
function drawGun(){
  const mg=G.weapon===4,len=mg?50:38,w=mg?9:7,kick=Math.max(0,(G.flashT||0)/(G.flashMax||.07))*(mg?2:3.5);
  ctx.save();ctx.translate(G.x-Math.cos(G.angle)*kick,G.y-Math.sin(G.angle)*kick);ctx.rotate(G.angle);ctx.lineCap='butt';
  ctx.strokeStyle='#14161a';ctx.lineWidth=w+3;ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(len+1,0);ctx.stroke();      // outline
  ctx.strokeStyle='#32363c';ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(len,0);ctx.stroke();          // gunmetal body
  ctx.strokeStyle='#4a5058';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(12,-w/2+1.6);ctx.lineTo(len-1,-w/2+1.6);ctx.stroke();   // top highlight
  ctx.fillStyle='#202327';ctx.fillRect(len-5,-w/2-1,5,w+2);                                                           // muzzle block
  if(mg){ctx.fillStyle='#24272c';ctx.fillRect(18,w/2,14,9);ctx.fillStyle='#3a3f46';ctx.fillRect(19,w/2+1,12,2)}         // magazine
  else{ctx.fillStyle='#24272c';ctx.fillRect(11,w/2-1,8,6)}                                                              // grip
  ctx.restore()}
function drawPlayer(){
  const now=performance.now(),moving=keys.w||keys.a||keys.s||keys.d||joy.x||joy.y,key='player_'+G.view;let name,fr,flip=false,h=G.view==='fp'?104:84;
  if(G.view==='tp'){
    const sn=Math.sin(G.angle),cs=Math.cos(G.angle);let d=Math.abs(sn)<.45?'s':sn<0?'u':'d';flip=d==='s'&&cs>0;   // side-row sprites face left
    if(G.over){name='death';fr=Math.min(6,Math.floor((now-(G.overAt||now))/130))}
    else if(G.hurtT>0){name='hurt';fr=Math.floor((1-G.hurtT/.25)*7)}
    else if(G.attackT>0&&G.attackType==='melee'){name='attack';fr=Math.floor((1-G.attackT/.3)*7)}
    else{name=(moving?'walk_':'idle_')+d;fr=Math.floor(now/(moving?95:150))%7}
  }else{
    if(G.reload>0){name='reload';fr=Math.floor((1-G.reload/WEAPONS[G.weapon].reload)*7)}
    else if(G.attackT>0&&G.attackType==='melee'){name='melee';fr=Math.floor((1-G.attackT/.3)*6)}
    else if(G.attackT>0){name='shoot';fr=Math.floor((1-G.attackT/(G.attackDur||.28))*5)}
    else{name='idle';fr=Math.floor(now/160)%6}
  }
  ctx.save();ctx.globalAlpha=.34;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(G.x,G.y+h*.4,h*.28,h*.09,0,0,7);ctx.fill();ctx.restore();
  drawAnim(key,name,fr,G.x,G.y,h,flip,1);
  if(G.over)return;
  drawGun();drawFlash();
}
function render(){ctx.imageSmoothingEnabled=false;ctx.save();let sx=(Math.random()-.5)*G.shake,sy=(Math.random()-.5)*G.shake;ctx.translate(sx,sy);ctx.fillStyle='#111321';ctx.fillRect(-sx,-sy,W,H);drawFloor();for(const d of G.decals){ctx.globalAlpha=Math.max(0,d.t/8);ctx.fillStyle='#67152a';ctx.beginPath();ctx.ellipse(d.x,d.y,25,14,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}
for(const p of (G.prints||[])){ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,p.t/p.max))*p.al;ctx.translate(p.x,p.y);ctx.rotate(p.ang+Math.PI/2);ctx.fillStyle='#8a1530';ctx.beginPath();ctx.ellipse(0,-5,4.6,8.6,0,0,7);ctx.ellipse(0,7.5,3.5,4,0,0,7);ctx.fill();ctx.restore()}if(G.disco)drawDisco();drawCorpses();drawEventLayer();for(const e of G.zombies)drawActor(e,'zombie',58*(e.scale||1));for(const e of G.cows)drawActor(e,'cow',68);for(const e of G.clowns)drawActor(e,'clown',64);if(G.pizzaBoy){const pb=img.pizza_boy_tp;if(pb){const f=Math.floor(G.pizzaBoy.frame)%4;drawSheet(pb,f,0,4,1,G.pizzaBoy.x-48,G.pizzaBoy.y-48,96,96,G.pizzaBoy.x<G.x)}}if(G.boss){ctx.shadowBlur=30;ctx.shadowColor='#ff204f';drawActor(G.boss,'boss',140);ctx.shadowBlur=0}if(G.ufo)drawUFO();for(const b of G.bullets){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(b.x,b.y,4,0,7);ctx.fill()}for(const p of G.particles){ctx.globalAlpha=Math.max(0,Math.min(1,p.t/(p.life||.4)));ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill();ctx.globalAlpha=1}drawPlayer();drawDark();drawNightmare();drawBubbles();ctx.restore();if(G.boomFlash>0){ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle='rgba(255,230,180,'+(G.boomFlash/.28*.45)+')';ctx.fillRect(0,0,W,H);ctx.restore()}}
function gameOver(){if('speechSynthesis' in window)speechSynthesis.cancel();G.over=true;G.overAt=performance.now();sndPlayerDeath();G.running=false;musicKey('normal');document.getElementById('finalStats').textContent='Score '+G.score.toLocaleString()+' · Wave '+G.wave+' · Kills '+G.kills;document.getElementById('gameover').classList.remove('hidden');hud.style.display='none'}
const keys={};addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(!G.running||G.over)return;if(e.key===' '||e.key.toLowerCase()==='f'){e.preventDefault();melee()}if(e.key.toLowerCase()==='q'){G.autoAim=!G.autoAim;const ab=document.getElementById('aim');if(ab)ab.classList.toggle('pressed',G.autoAim)}if(e.key.toLowerCase()==='r')startReload();if(/^\d$/.test(e.key)&&+e.key>=1&&+e.key<=WEAPONS.length)switchWeapon(+e.key-1);if(e.key.toLowerCase()==='v')G.view=G.view==='tp'?'fp':'tp'});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);addEventListener('mousemove',e=>{if(G.running&&!('ontouchstart' in window)){G.angle=Math.atan2(e.clientY-G.y,e.clientX-G.x)}});let mouseHeld=false;addEventListener('mousedown',e=>{if(e.button===0&&!('ontouchstart' in window)){mouseHeld=true;startAudio();fire()}else if(e.button===2&&G.running&&!G.over)melee()});addEventListener('contextmenu',e=>{if(G.running)e.preventDefault()});addEventListener('mouseup',e=>{if(e.button===0)mouseHeld=false});addEventListener('blur',()=>{mouseHeld=false});addEventListener('wheel',e=>{if(G.running)switchWeapon(G.weapon+(e.deltaY>0?1:-1))},{passive:true});
let joy={x:0,y:0,id:null,ox:0,oy:0};const joyEl=document.getElementById('joy'),knob=document.getElementById('joyKnob');function joyStart(e){joy.id=e.pointerId;joy.ox=e.clientX;joy.oy=e.clientY;joyEl.style.display='block';joyEl.style.left=(joy.ox-75)+'px';joyEl.style.top=(joy.oy-75)+'px';joyMove(e)}
function joyMove(e){if(e.pointerId!==joy.id)return;let dx=e.clientX-joy.ox,dy=e.clientY-joy.oy,d=Math.hypot(dx,dy),m=58;if(d>m){dx=dx/d*m;dy=dy/d*m}joy.x=dx/m;joy.y=dy/m;knob.style.transform=`translate(${dx}px,${dy}px)`}
function joyEnd(e){if(e.pointerId!==joy.id)return;joy.id=null;joy.x=joy.y=0;knob.style.transform='';joyEl.style.display='none'}
let fireId=null,fireTimer=null;
function releaseFire(){if(fireTimer){clearInterval(fireTimer);fireTimer=null}fireId=null;document.getElementById('fire').classList.remove('pressed')}
document.addEventListener('pointerdown',e=>{
  if(!e.isPrimary&&e.pointerType==='mouse')return;
  unlockAudioFromGesture();
  const el=e.target&&e.target.closest?e.target.closest('#combat button'):null;
  if(el){
    e.preventDefault();try{el.setPointerCapture&&el.setPointerCapture(e.pointerId)}catch(_){}el.classList.add('pressed');
    if(el.id==='fire'){fireId=e.pointerId;fire();if(!fireTimer)fireTimer=setInterval(()=>{if(fireId!==null)fire()},50)}
    else if(el.id==='melee')melee();
    else if(el.id==='reloadBtn')startReload();
    else if(el.id==='weaponBtn')switchWeapon(G.weapon+1);
    else if(el.id==='aim'){G.autoAim=!G.autoAim;el.classList.toggle('pressed',G.autoAim)}
    return}
  if(G.running&&e.pointerType!=='mouse'&&e.clientX<W*.55&&joy.id===null){e.preventDefault();joyStart(e)}
},{passive:false});
document.addEventListener('pointermove',e=>{if(joy.id===e.pointerId){e.preventDefault();joyMove(e)}},{passive:false});
document.addEventListener('pointerup',e=>{if(e.pointerId===fireId)releaseFire();if(e.pointerId===joy.id)joyEnd(e);const el=e.target&&e.target.closest?e.target.closest('#combat button'):null;if(el&&el.id!=='aim')el.classList.remove('pressed')},{passive:false});
document.addEventListener('pointercancel',e=>{if(e.pointerId===fireId)releaseFire();if(e.pointerId===joy.id)joyEnd(e)},{passive:true});
const voiceBtn=document.getElementById('voiceBtn');voiceBtn.textContent=voiceOn?'🗣 VOICES ON':'🗣 VOICES OFF';voiceBtn.classList.toggle('off',!voiceOn);voiceBtn.onclick=()=>{voiceOn=!voiceOn;if(!voiceOn&&'speechSynthesis' in window)speechSynthesis.cancel();voiceBtn.textContent=voiceOn?'🗣 VOICES ON':'🗣 VOICES OFF';voiceBtn.classList.toggle('off',!voiceOn)};const musicBtn=document.getElementById('musicBtn');let musicOn=true;musicBtn.onclick=()=>{musicOn=!musicOn;if(musicOn){startAudio();musicKey(G.running?'normal':'title');musicBtn.textContent='♫ MUSIC ON';musicBtn.classList.remove('off')}else{if(music.el)music.el.pause();musicBtn.textContent='♫ MUSIC OFF';musicBtn.classList.add('off')}};document.addEventListener('pointerdown',()=>{unlockAudioFromGesture();if(musicOn)musicKey(wantMusic())},{passive:true});
document.getElementById('startBtn').onclick=()=>{unlockAudioFromGesture();reset()};document.getElementById('howBtn').onclick=()=>document.getElementById('how').classList.remove('hidden');document.getElementById('backBtn').onclick=()=>document.getElementById('how').classList.add('hidden');document.getElementById('againBtn').onclick=()=>{document.getElementById('gameover').classList.add('hidden');unlockAudioFromGesture();reset()};document.getElementById('menuBtn').onclick=()=>{document.getElementById('gameover').classList.add('hidden');title.classList.remove('hidden');musicKey('title')};
setInterval(()=>{if(!musicOn||document.hidden||!audioUnlocked)return;const k=wantMusic();if(!music.el||music.key!==k)musicKey(k);else if(music.el.paused)music.el.play().catch(()=>{})},1200);
function loop(t){requestAnimationFrame(loop);const now=t||performance.now();loop.last??=now;const dt=Math.min(.033,(now-loop.last)/1000);loop.last=now;update(dt);render()}musicKey('title');preload().then(()=>{title.classList.remove('hidden');loop()});
