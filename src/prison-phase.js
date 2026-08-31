import * as pc from 'playcanvas';

// STREET HUSTLE — PLAYABLE PRISON / RELEASE PHASE
// Repeated or high-Heat arrests can trigger a short playable custody sequence.
// The risky route remains fictional and consequence-focused; no real-world
// criminal instructions are represented here.

const world=window.StreetHustleWorld;
const app=world?.app;
const player=world?.player;
const living=window.StreetHustleLivingWorld;

if(!app||!player){
  console.error('Street Hustle prison phase could not start.');
}else{
  const SAVE='streetHustle.prison.v1';
  const ADV='streetHustle.advanced.v1';
  const SCOPE='streetHustle.scope.v1';
  const $=(id)=>document.getElementById(id);
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const base=()=>({lastArrests:0,active:false,sentenceDays:0,servedDays:0,tasks:{exercise:false,workshop:false,reflection:false},releases:0,previous:{x:0,z:20}});
  function read(key,fallback={}){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}catch{return fallback;}}
  function load(){const s=read(SAVE,null);return s?{...base(),...s,tasks:{...base().tasks,...(s.tasks||{})},previous:{...base().previous,...(s.previous||{})}}:base();}
  const state=load();
  const save=()=>{try{localStorage.setItem(SAVE,JSON.stringify(state));}catch{}};

  function material(r,g,b,metal=0,gloss=.2){const m=new pc.StandardMaterial();m.diffuse=new pc.Color(r,g,b);m.metalness=metal;m.gloss=gloss;m.update();return m;}
  const mat={floor:material(.34,.34,.32),wall:material(.48,.49,.47),bars:material(.12,.13,.14,.6,.38),bed:material(.20,.30,.42),marker:material(.88,.62,.08),yard:material(.24,.37,.24),wood:material(.35,.19,.09)};
  const root=new pc.Entity('PrisonPhase');app.root.addChild(root);root.enabled=false;
  function part(name,type,x,y,z,sx,sy,sz,m,parent=root){const e=new pc.Entity(name);e.addComponent('model',{type});parent.addChild(e);e.setLocalPosition(x,y,z);e.setLocalScale(sx,sy,sz);e.model.material=m;return e;}

  part('PrisonFloor','box',0,.05,0,24,.10,24,mat.floor);
  part('PrisonWallN','box',0,3,-12,24,6,.35,mat.wall);
  part('PrisonWallS','box',0,3,12,24,6,.35,mat.wall);
  part('PrisonWallE','box',12,3,0,.35,6,24,mat.wall);
  part('PrisonWallW','box',-12,3,0,.35,6,24,mat.wall);
  part('CellBlock','box',-6,2.2,-5,9,4.4,8,mat.wall);
  for(const x of [-9,-7.5,-6,-4.5,-3])part(`CellBar_${x}`,'box',x,2.1,-.8,.10,4.2,.10,mat.bars);
  part('CellBed','box',-7.4,.55,-6.8,3.0,.55,1.4,mat.bed);
  part('YardPad','box',5,.08,3,10,.12,12,mat.yard);
  part('ExerciseMarker','cylinder',6,.13,6,1.0,.18,1.0,mat.marker);
  part('WorkshopMarker','cylinder',4,.13,-2,1.0,.18,1.0,mat.marker);
  part('ReflectionMarker','cylinder',-7,.13,-7,1.0,.18,1.0,mat.marker);
  part('CellRestMarker','cylinder',-7,.13,-4.5,1.0,.18,1.0,mat.marker);

  const hud=document.createElement('div');hud.id='prison-hud';document.body.appendChild(hud);
  const banner=document.createElement('div');banner.id='prison-banner';banner.innerHTML='<strong>CUSTODY</strong><span>Consequences follow choices.</span>';document.body.appendChild(banner);

  function heat(){const t=$('heat')?.textContent||'0';const m=t.match(/\d+/);return m?Number(m[0]):0;}
  function advanced(){return read(ADV,{});}
  function distance(x,z){const p=player.getPosition();return Math.hypot(p.x-x,p.z-z);}
  function notify(text){const t=$('toast');if(t){t.textContent=text;t.classList.add('visible');clearTimeout(notify._t);notify._t=setTimeout(()=>t.classList.remove('visible'),2400);}}
  function disableCity(disabled){
    if(window.StreetHustleCityExpansion?.root)window.StreetHustleCityExpansion.root.enabled=!disabled;
    for(const p of living?.pedestrians||[])p.root.enabled=!disabled;
    for(const c of living?.traffic||[])c.root.enabled=!disabled;
  }
  function updateHud(){
    hud.textContent=state.active?`CUSTODY DAY ${Math.min(state.servedDays+1,state.sentenceDays)} / ${state.sentenceDays} · Tasks ${Object.values(state.tasks).filter(Boolean).length}/3`:'';
    hud.classList.toggle('visible',state.active);banner.classList.toggle('visible',state.active);
  }
  function setPrisonClass(){document.body.classList.toggle('in-prison',state.active);}

  function startPrison(arrests){
    if(state.active)return;
    const p=player.getPosition();state.previous={x:p.x,z:p.z};state.active=true;state.sentenceDays=clamp(2+Math.floor(arrests/2)+(heat()>=8?2:0),2,7);state.servedDays=0;state.tasks={exercise:false,workshop:false,reflection:false};
    root.enabled=true;disableCity(true);if(world.driving)world.exitVehicle();player.setPosition(0,0,4);setPrisonClass();updateHud();save();notify(`PRISON SENTENCE · ${state.sentenceDays} compressed days`);
  }
  function release(){
    state.active=false;state.releases++;root.enabled=false;disableCity(false);player.setPosition(-24.5,0,-28);setPrisonClass();updateHud();
    const scope=read(SCOPE,null);if(scope){scope.legal=scope.legal||{};scope.legal.releaseCount=Math.max(Number(scope.legal.releaseCount)||0,state.releases);try{localStorage.setItem(SCOPE,JSON.stringify(scope));}catch{}}
    save();notify('RELEASED · rebuild your life outside');
  }
  function completeTask(id,label){if(state.tasks[id])return notify(`${label} already completed today`);state.tasks[id]=true;notify(`${label} complete`);updateHud();save();}
  function restDay(){
    if(Object.values(state.tasks).filter(Boolean).length<2)return notify('Complete at least 2 prison activities before ending the day');
    state.servedDays++;state.tasks={exercise:false,workshop:false,reflection:false};
    if(state.servedDays>=state.sentenceDays){release();return;}player.setPosition(-7,0,-4.5);notify(`Custody day ${state.servedDays+1} begins`);updateHud();save();
  }

  function prompt(){
    if(!state.active)return null;
    if(distance(6,6)<2.0)return['exercise','YARD EXERCISE · E Train'];
    if(distance(4,-2)<2.0)return['workshop','PRISON WORKSHOP · E Work'];
    if(distance(-7,-7)<2.0)return['reflection','CELL · E Reflect'];
    if(distance(-7,-4.5)<2.0)return['rest','CELL · E End custody day'];
    return null;
  }
  window.addEventListener('street-hustle-interact',(event)=>{
    if(!state.active)return;const p=prompt();if(!p)return;event.stopImmediatePropagation();
    if(p[0]==='exercise')completeTask('exercise','Exercise');
    if(p[0]==='workshop')completeTask('workshop','Workshop shift');
    if(p[0]==='reflection')completeTask('reflection','Reflection');
    if(p[0]==='rest')restDay();
  },true);

  window.addEventListener('keydown',(event)=>{
    if(!state.active)return;const key=event.key.toLowerCase();if(['p','l','j','t'].includes(key)){event.preventDefault();event.stopImmediatePropagation();}
  },true);

  let scan=0;
  app.on('update',(dt)=>{
    scan+=dt;
    if(state.active){
      const p=player.getPosition();const x=clamp(p.x,-10.8,10.8),z=clamp(p.z,-10.8,10.8);if(x!==p.x||z!==p.z)player.setPosition(x,0,z);
      const pr=prompt();const el=$('interaction');if(pr&&el){el.textContent=pr[1];el.classList.add('visible');}
    }
    if(scan<1.5)return;scan=0;
    const adv=advanced();const arrests=Number(adv.arrests)||0;
    if(arrests>state.lastArrests){const diff=arrests-state.lastArrests;state.lastArrests=arrests;save();if(arrests>=2||heat()>=7)startPrison(arrests);}
  });

  if(state.active){root.enabled=true;disableCity(true);setPrisonClass();updateHud();player.setPosition(0,0,4);}else{root.enabled=false;updateHud();}
  window.StreetHustlePrison={state,startPrison,release};
}
