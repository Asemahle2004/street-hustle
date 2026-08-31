// STREET HUSTLE — AMBIENT SOCIAL NPC SYSTEM
// Makes the moving pedestrians interactable with contextual conversations.

const world=window.StreetHustleWorld;
const living=window.StreetHustleLivingWorld;
const app=world?.app;
const player=world?.player;

if(!app||!player||!living){
  console.error('Street Hustle social NPC layer could not start.');
}else{
  const SAVE_KEY='streetHustle.social.v1';
  const defaultState=()=>({met:[],conversations:0,network:0,workTips:0,neighbourhoodTalks:0});
  function load(){try{return {...defaultState(),...JSON.parse(localStorage.getItem(SAVE_KEY)||'{}')};}catch{return defaultState();}}
  const state=load();
  const save=()=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch{}};
  const $=(id)=>document.getElementById(id);
  let active=null;

  const important=[[-8.3,18],[-11.5,-25],[6.6,-29],[27,26.5],[8.6,-23],[24,3.5]];
  function nearImportant(){const p=player.getPosition();return important.some(([x,z])=>Math.hypot(p.x-x,p.z-z)<3.1);}
  function currentHour(){const m=($('clock')?.textContent||'09:00').match(/(\d+):(\d+)/);return m?Number(m[1])+Number(m[2])/60:9;}
  function greeting(name){const h=currentHour();const tod=h<12?'Morning':h<18?'Afternoon':'Evening';const lines=[`${tod}. How are you holding up?`,`${tod}. I have seen you moving around here lately.`,`Sharp. This neighbourhood always has something happening.`,`Hey. You looking for work or just passing through?`];return `${name}: ${lines[Math.floor(Math.random()*lines.length)]}`;}
  function workTip(name){
    const tips=[
      'The car wash is small money, but people notice consistency.',
      'Construction pays better once people trust your name.',
      'The market is where you learn what people actually buy.',
      'If you build a real skill, you stop depending on one-day jobs.',
      'The tech repair place has training if you want a different route.',
      'Football opens doors too, but talent without discipline does not last.'
    ];
    return `${name}: ${tips[Math.floor(Math.random()*tips.length)]}`;
  }
  function neighbourhoodLine(name){
    const lines=[
      'Power, transport, jobs and safety are what everyone talks about here.',
      'People remember who helps when things are difficult.',
      'The centre is growing, but not everyone benefits at the same speed.',
      'You can make money fast and still lose your whole life. Balance matters.',
      'There are opportunities everywhere, but relationships can matter as much as cash.',
      'This place changes depending on who you become.'
    ];
    return `${name}: ${lines[Math.floor(Math.random()*lines.length)]}`;
  }

  function dialogue(name,text){
    const box=$('dialogue'),speaker=$('dialogue-speaker'),body=$('dialogue-text'),actions=$('dialogue-actions'),close=$('dialogue-close');
    if(!box||!speaker||!body||!actions)return;
    speaker.textContent=name;body.textContent=text;actions.innerHTML='';
    const defs=[
      ['Greet',()=>{state.network=Math.min(100,state.network+2);state.conversations++;if(!state.met.includes(name))state.met.push(name);save();body.textContent=greeting(name);}],
      ['Ask about work',()=>{state.workTips++;state.network=Math.min(100,state.network+1);state.conversations++;save();body.textContent=workTip(name);}],
      ['Talk about the neighbourhood',()=>{state.neighbourhoodTalks++;state.network=Math.min(100,state.network+2);state.conversations++;save();body.textContent=neighbourhoodLine(name);}]
    ];
    for(const [label,fn] of defs){const b=document.createElement('button');b.textContent=label;b.addEventListener('click',fn);actions.appendChild(b);}
    close.textContent='Leave';box.classList.add('visible');window.StreetHustleUIBlocking=true;
  }

  function nearest(){
    if(world.driving||living.currentInterior||nearImportant()||window.StreetHustleUIBlocking)return null;
    const p=player.getPosition();let best=null,bestD=Infinity;
    for(const ped of living.pedestrians){if(!ped.root.enabled)continue;const q=ped.root.getPosition();const d=Math.hypot(p.x-q.x,p.z-q.z);if(d<2.15&&d<bestD){best=ped;bestD=d;}}
    return best;
  }

  window.addEventListener('street-hustle-interact',(event)=>{
    const ped=nearest();if(!ped)return;event.stopImmediatePropagation();dialogue(ped.name,`You stop to speak with ${ped.name}.`);
  },true);

  let sample=0;
  app.on('update',(dt)=>{
    sample+=dt;if(sample<.15)return;sample=0;active=nearest();
    if(active){const el=$('interaction');if(el){el.textContent=`${active.name.toUpperCase()} · E Talk`;el.classList.add('visible');}}
  });

  window.StreetHustleSocial={state};
}
