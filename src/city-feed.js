// STREET HUSTLE — CITY FEED
// Fictional in-game social/news feed driven by the player's current game state.

const world=window.StreetHustleWorld;
if(world?.app){
  const $=(id)=>document.getElementById(id);
  const read=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'{}');}catch{return{};}};
  let open=false,lastSignature='';
  const button=document.createElement('button');button.id='feed-button';button.type='button';button.textContent='FEED';document.body.appendChild(button);
  const panel=document.createElement('section');panel.id='city-feed';panel.innerHTML='<div class="feed-head"><div><strong>STREET FEED</strong><small>Fictional local posts & notices</small></div><button id="feed-close">×</button></div><div id="feed-list"></div>';document.body.appendChild(panel);

  function num(id){const m=($(id)?.textContent||'0').match(/-?\d[\d,]*/);return m?Number(m[0].replace(/,/g,''))||0:0;}
  function clock(){return $('clock')?.textContent||'09:00';}
  function day(){return num('day')||1;}
  function post(author,text,tag='LOCAL'){return `<article class="feed-post"><div><strong>${author}</strong><span>${tag}</span></div><p>${text}</p><small>Day ${day()} · ${clock()}</small></article>`;}
  function build(){
    const main=read('streetHustle.alpha.v3'),adv=read('streetHustle.advanced.v1'),scope=read('streetHustle.scope.v1'),social=read('streetHustle.social.v1');
    const rep=num('rep'),heat=num('heat'),cash=num('cash'),weather=adv.currentWeather||'clear';
    const posts=[];
    posts.push(post('Neighbourhood Notice',weather==='rain'?'Rain is slowing traffic. Taxi queues may take longer today.':weather==='fog'?'Visibility is poor this morning. Drivers are being told to slow down.':'Normal movement around the neighbourhood today.','NOTICE'));
    if(!main.story?.introTalked)posts.push(post('Community Chat','People are talking about casual work at the car wash, shop and construction site.','WORK'));
    if(main.story?.stableWork)posts.push(post('Sipho','Consistency matters. Reliable shifts are going to people who actually show up.','WORK'));
    if(Object.values(main.businesses||{}).some(b=>b?.owned))posts.push(post('Local Business Watch','A new small operator is starting to build a name around here. Customers are watching service and reputation.','BUSINESS'));
    if(rep>=5)posts.push(post('Street Talk',`Sbu's name is getting around. Reputation is sitting around ${rep}. People notice both good work and bad choices.`,'SOCIAL'));
    if(heat>=3)posts.push(post('Street Alert',`There is extra police attention in the area. Current Heat is ${heat}. Keep your head down or deal with the consequences.`,'ALERT'));
    if((adv.arrests||0)>0)posts.push(post('Community Desk','A recent arrest has people talking. Reputation can recover, but records and relationships do not disappear overnight.','LEGAL'));
    if((scope.pathXp?.sport||0)>=40)posts.push(post('Community Sports','The local football ground has been busy. Scouts and organisers notice players who keep showing up.','SPORT'));
    if((scope.pathXp?.technology||0)>=40)posts.push(post('Tech Strip','Repair and digital-support work is picking up. Skill is starting to matter more than quick cash.','TECH'));
    if((scope.pathXp?.electrical||0)>=40)posts.push(post('Workshop Board','Solar and electrical helper work is opening up for people with training and a reliable name.','ENERGY'));
    if((scope.pathXp?.media||0)>=40)posts.push(post('Local Media','Small creators are using the studio strip for events, content and community stories.','MEDIA'));
    if((social.network||0)>=20)posts.push(post('Street Network',`You have met ${social.met?.length||0} local people. Your network score is ${social.network}. Connections are starting to create options.`,'NETWORK'));
    if(cash>=1000)posts.push(post('Money Talk','People are starting to notice that you are no longer at R0. The question now is whether you can keep what you built.','MONEY'));
    posts.push(post('Taxi Rank','Local taxis continue running between the residential area, shops, work sites and community facilities.','TRANSPORT'));
    posts.push(post('Community Voice','Money is only one score. Family, health, reputation, skill and what happens after a setback all shape the ending.','LIFE'));
    $('feed-list').innerHTML=posts.join('');
  }
  function setBlocking(){window.StreetHustleFeedBlocking=open;document.body.classList.toggle('feed-modal-open',open);}
  function openFeed(){open=true;panel.classList.add('visible');build();setBlocking();}
  function closeFeed(){open=false;panel.classList.remove('visible');setBlocking();}
  button.addEventListener('click',()=>open?closeFeed():openFeed());$('feed-close')?.addEventListener('click',closeFeed);
  window.addEventListener('keydown',(e)=>{if(e.key.toLowerCase()==='n'&&!e.repeat){e.preventDefault();open?closeFeed():openFeed();}});
  world.app.on('update',()=>{if(!open)return;const sig=`${day()}-${clock()}-${num('rep')}-${num('heat')}`;if(sig!==lastSignature){lastSignature=sig;build();}});
  window.StreetHustleFeed={open:openFeed,close:closeFeed};
}
