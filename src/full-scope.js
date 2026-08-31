import * as pc from 'playcanvas';

// STREET HUSTLE — FULL SCOPE LIFE SIMULATION
// Long-game layer covering career routes, family/social life, aging, legal
// history, property, vehicles, cast progression, story chapters and endings.
// It observes the existing alpha/advanced saves rather than replacing them.

const world = window.StreetHustleWorld;
const app = world?.app;
const player = world?.player;

if (!app || !player) {
  console.error('Street Hustle full-scope layer could not start: world core missing.');
} else {
  const SCOPE_SAVE='streetHustle.scope.v1';
  const MAIN_SAVE='streetHustle.alpha.v3';
  const ADV_SAVE='streetHustle.advanced.v1';
  const $=(id)=>document.getElementById(id);
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

  const defaultScope=()=>({
    version:1,
    firstSeenDay:1,
    lastDay:1,
    age:19,
    primaryPath:'none',
    pathXp:{electrical:0,technology:0,business:0,sport:0,media:0,community:0,streetwise:0},
    trainingToday:{},
    qualifications:[],
    careerTitle:'Unemployed / Casual Hustler',
    employmentTier:0,
    relationshipLife:{stage:'Single',familyBond:50,socialCircle:0,partnerTrust:0,children:0},
    legal:{record:false,custodyDays:0,releaseCount:0,lastArrests:0},
    property:{residence:'Family Home',portfolio:0,homeLevel:0},
    fleet:{hatchback:false,bakkie:false,sedan:false,taxi:false},
    castUnlocked:['sbu'],
    chapters:[],
    endingsUnlocked:[],
    rivalPressure:0,
    districtVisits:[],
    choices:{legit:0,risky:0,community:0,family:0},
    milestones:[],
    legacyScore:0
  });

  function readJson(key,fallback={}) {
    try { const raw=localStorage.getItem(key); return raw?JSON.parse(raw):fallback; }
    catch { return fallback; }
  }

  function loadScope(){
    const base=defaultScope();
    const saved=readJson(SCOPE_SAVE,null);
    if(!saved)return base;
    return {
      ...base,...saved,
      pathXp:{...base.pathXp,...(saved.pathXp||{})},
      trainingToday:{...(saved.trainingToday||{})},
      relationshipLife:{...base.relationshipLife,...(saved.relationshipLife||{})},
      legal:{...base.legal,...(saved.legal||{})},
      property:{...base.property,...(saved.property||{})},
      fleet:{...base.fleet,...(saved.fleet||{})},
      choices:{...base.choices,...(saved.choices||{})},
      qualifications:Array.isArray(saved.qualifications)?saved.qualifications:[],
      castUnlocked:Array.isArray(saved.castUnlocked)?saved.castUnlocked:['sbu'],
      chapters:Array.isArray(saved.chapters)?saved.chapters:[],
      endingsUnlocked:Array.isArray(saved.endingsUnlocked)?saved.endingsUnlocked:[],
      districtVisits:Array.isArray(saved.districtVisits)?saved.districtVisits:[],
      milestones:Array.isArray(saved.milestones)?saved.milestones:[]
    };
  }

  const state=loadScope();
  let panelOpen=false;
  let tab='overview';
  let activeTraining=null;
  let syncAccumulator=0;

  function save(){try{localStorage.setItem(SCOPE_SAVE,JSON.stringify(state));}catch{}}
  function mainState(){return readJson(MAIN_SAVE,{});}
  function advState(){return readJson(ADV_SAVE,{});}
  function day(){
    const text=$('day')?.textContent||'DAY 1';
    const m=text.match(/\d+/); return m?Number(m[0]):1;
  }
  function hudNum(id){
    const text=$(id)?.textContent||'0'; const m=text.match(/-?\d[\d,]*/);
    return m?Number(m[0].replace(/,/g,''))||0:0;
  }
  function stats(){
    const main=mainState(),adv=advState();
    const cash=hudNum('cash'),bank=hudNum('bank');
    return {day:day(),cash,bank,wealth:cash+bank,rep:hudNum('rep'),heat:hudNum('heat'),main,adv};
  }
  const pathLevel=(id)=>1+Math.floor((state.pathXp[id]||0)/100);
  function milestone(id,text){
    if(state.milestones.includes(id))return;
    state.milestones.push(id);
    const toast=$('toast'); if(toast){toast.textContent=text;toast.classList.add('visible');setTimeout(()=>toast.classList.remove('visible'),2500);}
  }

  // -------------------------------------------------------------------
  // Full cast planned for Street Hustle.
  // -------------------------------------------------------------------
  const cast={
    sbu:{name:'Sbu',age:19,role:'The original zero-to-hero route',status:'Playable'},
    zinhle:{name:'Zinhle',age:20,role:'Business, independence and leadership route',status:'Story unlock'},
    kabelo:{name:'Kabelo',age:22,role:'Sport, work and responsibility route',status:'Story unlock'},
    thando:{name:'Thando',age:24,role:'Trade, construction and skilled-work route',status:'Future playable'},
    lerato:{name:'Lerato',age:21,role:'Media, relationships and community route',status:'Future playable'},
    mandla:{name:'Mandla',age:27,role:'High-risk rise, loss and second-chance route',status:'Future playable'}
  };

  // -------------------------------------------------------------------
  // UI shell
  // -------------------------------------------------------------------
  const button=document.createElement('button');
  button.id='life-button';button.type='button';button.textContent='LIFE';document.body.appendChild(button);

  const panel=document.createElement('section');
  panel.id='life-panel';
  panel.innerHTML=`
    <div class="life-head"><div><strong>STREET HUSTLE LIFE</strong><small>Full life-simulation scope</small></div><button id="life-close">×</button></div>
    <nav id="life-tabs">
      <button data-life-tab="overview">Life</button><button data-life-tab="career">Career</button><button data-life-tab="family">Family</button>
      <button data-life-tab="assets">Assets</button><button data-life-tab="story">Story</button><button data-life-tab="cast">Cast</button><button data-life-tab="legacy">Legacy</button>
    </nav><div id="life-content"></div>`;
  document.body.appendChild(panel);

  function setBlocking(){
    window.StreetHustleScopeBlocking=panelOpen;
    document.body.classList.toggle('life-modal-open',panelOpen);
  }
  function openPanel(nextTab=tab){tab=nextTab;panelOpen=true;panel.classList.add('visible');render();setBlocking();}
  function closePanel(){panelOpen=false;panel.classList.remove('visible');setBlocking();}
  button.addEventListener('click',()=>panelOpen?closePanel():openPanel());
  $('life-close')?.addEventListener('click',closePanel);
  window.addEventListener('keydown',(e)=>{if(e.key.toLowerCase()==='l'&&!e.repeat){e.preventDefault();panelOpen?closePanel():openPanel();}});
  $('life-tabs')?.addEventListener('click',(e)=>{const b=e.target.closest('[data-life-tab]');if(!b)return;tab=b.dataset.lifeTab;render();});

  function bar(value,max=100){const pct=clamp(value/max*100,0,100);return `<div class="life-meter"><span style="width:${pct}%"></span></div>`;}
  function card(title,body,cls=''){return `<article class="life-card ${cls}"><h3>${title}</h3>${body}</article>`;}
  function badge(text,cls=''){return `<span class="life-badge ${cls}">${text}</span>`;}

  function pathName(id){return ({electrical:'Electrical & Energy',technology:'Technology',business:'Entrepreneurship',sport:'Sport',media:'Media & Music',community:'Community Leadership',streetwise:'Street Survival'})[id]||id;}

  function renderOverview(s){
    const advanced=s.adv||{};
    return card('Current life',`<p><strong>Age:</strong> ${state.age}</p><p><strong>Career:</strong> ${state.careerTitle}</p><p><strong>Primary path:</strong> ${state.primaryPath==='none'?'Not chosen':pathName(state.primaryPath)}</p><p><strong>Residence:</strong> ${state.property.residence}</p><p><strong>Relationship:</strong> ${state.relationshipLife.stage}</p><p><strong>Legal record:</strong> ${state.legal.record?'Yes':'Clear'}</p>`) +
      card('Life balance',`<p>Family bond ${state.relationshipLife.familyBond}/100</p>${bar(state.relationshipLife.familyBond)}<p>Social circle ${state.relationshipLife.socialCircle}/100</p>${bar(state.relationshipLife.socialCircle)}<p>Legacy score ${state.legacyScore}</p>`) +
      card('World progress',`<p>Day ${s.day} · REP ${s.rep} · HEAT ${s.heat}</p><p>Health ${advanced.health??100} · Street Level ${1+Math.floor((advanced.streetXp||0)/250)}</p><p>Districts discovered: ${state.districtVisits.length}</p><p>Qualifications: ${state.qualifications.length}</p>`);
  }

  function renderCareer(s){
    const paths=['electrical','technology','business','sport','media','community','streetwise'];
    return card('Choose your main direction',`<p>You are never locked to one route. Your primary path changes story emphasis and future endings.</p><div class="life-actions">${paths.map(id=>`<button data-scope-action="primary" data-id="${id}" class="${state.primaryPath===id?'active':''}">${pathName(id)}</button>`).join('')}</div>`) +
      paths.map(id=>card(pathName(id),`<p>Level ${pathLevel(id)} · ${state.pathXp[id]} XP</p>${bar((state.pathXp[id]||0)%100,100)}<p>${careerDescription(id)}</p>${careerRequirements(id,s)}`)).join('') +
      card('Qualifications',state.qualifications.length?state.qualifications.map(q=>`<p>${badge('✓','good')} ${q}</p>`):'<p>No formal route qualifications yet. Visit training locations in the world.</p>');
  }

  function careerDescription(id){
    return {
      electrical:'From helper work to qualified electrical/solar projects and an energy business.',
      technology:'Device repair, coding/digital work, systems support and eventually a tech company.',
      business:'Street stall → car wash → delivery/logistics → larger contracts and employees.',
      sport:'Local football → organised competition → academy/club opportunities and sports business.',
      media:'Local content/events → studio work → creator/producer route and media business.',
      community:'Helping neighbours → trusted organiser → community projects and leadership.',
      streetwise:'A fictional high-risk route where shortcuts increase Heat, legal pressure and downfall risk.'
    }[id];
  }

  function careerRequirements(id,s){
    const level=pathLevel(id);
    const next=level<3?`Next level in ${100-(state.pathXp[id]%100)} XP`:'Advanced route active';
    return `<small>${next}. Main REP ${s.rep}; Heat ${s.heat}.</small>`;
  }

  function renderFamily(s){
    const r=state.relationshipLife;
    return card('Family',`<p>Your choices affect more than money. Supporting home raises long-term family stability.</p><p>Family bond: ${r.familyBond}/100</p>${bar(r.familyBond)}<p>Children: ${r.children}</p><div class="life-actions"><button data-scope-action="family-time">Spend time with family</button><button data-scope-action="community-help">Help the community</button></div>`) +
      card('Relationships',`<p>Status: <strong>${r.stage}</strong></p><p>Partner trust: ${r.partnerTrust}/100</p>${bar(r.partnerTrust)}<p>Social circle: ${r.socialCircle}/100</p>${bar(r.socialCircle)}<p>Future versions will connect this to named original characters, dating, marriage, children and household decisions.</p>`) +
      card('Long-term family route',`<p>${state.age<23?'Family expansion becomes a later-life option as the character ages.':'Adult family decisions are now eligible in this life stage.'}</p>`);
  }

  function renderAssets(s){
    const adv=s.adv||{},main=s.main||{};
    const businesses=Object.entries(main.businesses||{}).filter(([,b])=>b?.owned);
    return card('Home & property',`<p>Residence: <strong>${state.property.residence}</strong></p><p>Home upgrade level: ${state.property.homeLevel}</p><p>Property portfolio: ${state.property.portfolio}</p><p>Wealth observed: R${s.wealth.toLocaleString('en-ZA')}</p>`) +
      card('Vehicles',`<p>Used hatchback: ${main.assets?.vehicleOwned||state.fleet.hatchback?'Owned':'Not owned'}</p><p>Bakkie: ${state.fleet.bakkie?'Owned':'Locked'}</p><p>Sedan: ${state.fleet.sedan?'Owned':'Locked'}</p><p>Taxi/minibus business vehicle: ${state.fleet.taxi?'Owned':'Locked'}</p><p>Vehicle condition: ${adv.vehicleHealth??100}%</p>`) +
      card('Businesses',businesses.length?businesses.map(([id,b])=>`<p>${badge(b.active?'ACTIVE':'PAUSED',b.active?'good':'')} ${id}</p>`).join(''):'<p>No businesses owned yet.</p>');
  }

  const chapterCatalog=[
    ['home-pressure','Chapter 1 — Home Pressure','Start from R0 and respond to the first family need.'],
    ['survival','Chapter 2 — Survival','Learn that work, reputation and risky shortcuts all have consequences.'],
    ['foundation','Chapter 3 — Foundation','Create reliable income and relationships.'],
    ['entrepreneur','Chapter 4 — Build Something','Start a business and move beyond day-to-day survival.'],
    ['expansion','Chapter 5 — Bigger City','Expand into skills, assets, networks and multiple districts.'],
    ['hero','Chapter 6 — Hero','Reach meaningful wealth and status.'],
    ['pressure','Chapter 7 — Pressure','Success creates new risks, attention, obligations and rivals.'],
    ['fall','Chapter 8 — Zero Again','Lose progress through bad choices, legal pressure or a life shock.'],
    ['rebuild','Chapter 9 — Rebuild','Return through work, skill, relationships and smarter decisions.'],
    ['legacy','Chapter 10 — Legacy','Decide what kind of life your character ultimately built.']
  ];

  function renderStory(){
    return chapterCatalog.map(([id,title,desc])=>card(title,`<p>${desc}</p>${state.chapters.includes(id)?badge('UNLOCKED','good'):badge('LOCKED')}`)).join('') +
      card('Legal / second-chance arc',`<p>Record: ${state.legal.record?'Criminal record exists':'Clear'}</p><p>Custody/prison days tracked: ${state.legal.custodyDays}</p><p>Release / second chances: ${state.legal.releaseCount}</p><p>The risky route is fictional and consequence-focused; it is not a real-world crime tutorial.</p>`);
  }

  function renderCast(){
    return Object.entries(cast).map(([id,ch])=>card(ch.name,`<p>Age ${ch.age}</p><p>${ch.role}</p><p>${state.castUnlocked.includes(id)?badge('UNLOCKED','good'):badge(ch.status)}</p>`)).join('');
  }

  function endingScores(s){
    const main=s.main||{},adv=s.adv||{};
    const businessOwned=Object.values(main.businesses||{}).filter(b=>b?.owned).length;
    return [
      ['balanced','Community Builder',s.rep*8+state.relationshipLife.familyBond+(state.pathXp.community||0)-s.heat*12],
      ['entrepreneur','Entrepreneur',s.wealth/10+businessOwned*120+(state.pathXp.business||0)],
      ['professional','Skilled Professional',(state.pathXp.electrical||0)+(state.pathXp.technology||0)+state.qualifications.length*100],
      ['sport','Sports Route',(state.pathXp.sport||0)+(adv.skills?.fitness||0)],
      ['media','Media Creator',(state.pathXp.media||0)+state.relationshipLife.socialCircle],
      ['survivor','Second Chance Survivor',(adv.arrests||0)*45+(state.legal.releaseCount||0)*80+(main.story?.rebuilt?250:0)]
    ].sort((a,b)=>b[2]-a[2]);
  }

  function renderLegacy(s){
    const endings=endingScores(s);
    return card('Legacy score',`<p class="legacy-number">${state.legacyScore}</p><p>Legacy is calculated from wealth, reputation, family, skills, businesses, legal consequences, community choices and whether you rebuilt after failure.</p>`) +
      card('Current likely ending',`<h2>${endings[0][1]}</h2><p>Score ${Math.round(endings[0][2])}</p><p>This is not permanent. Your later choices can change it.</p>`) +
      card('Possible endings',endings.map(([id,name,score])=>`<p><strong>${name}</strong> · ${Math.round(score)} ${state.endingsUnlocked.includes(id)?badge('DISCOVERED','good'):''}</p>`).join(''));
  }

  function render(){
    const c=$('life-content');if(!c)return;
    for(const b of $('life-tabs')?.querySelectorAll('[data-life-tab]')||[])b.classList.toggle('active',b.dataset.lifeTab===tab);
    const s=stats();
    c.innerHTML=tab==='overview'?renderOverview(s):tab==='career'?renderCareer(s):tab==='family'?renderFamily(s):tab==='assets'?renderAssets(s):tab==='story'?renderStory(s):tab==='cast'?renderCast(s):renderLegacy(s);
  }

  panel.addEventListener('click',(e)=>{
    const b=e.target.closest('[data-scope-action]');if(!b)return;
    const action=b.dataset.scopeAction,id=b.dataset.id;
    if(action==='primary'){state.primaryPath=id;milestone(`primary-${id}`,`${pathName(id)} selected as primary path`);}
    if(action==='family-time'){state.relationshipLife.familyBond=clamp(state.relationshipLife.familyBond+4,0,100);state.choices.family++;milestone('family-time','Family bond improved');}
    if(action==='community-help'){state.relationshipLife.socialCircle=clamp(state.relationshipLife.socialCircle+3,0,100);state.relationshipLife.familyBond=clamp(state.relationshipLife.familyBond+1,0,100);state.pathXp.community+=15;state.choices.community++;}
    recalc();save();render();
  });

  // -------------------------------------------------------------------
  // Physical career/training locations.
  // -------------------------------------------------------------------
  const trainingLocations=[
    {id:'electrical',name:'Electrical & Solar Workshop',x:30,z:16,path:'electrical',xp:22,qualification:'Electrical Helper Certificate'},
    {id:'technology',name:'Tech Repair Hub',x:-30,z:16,path:'technology',xp:22,qualification:'Digital Support Certificate'},
    {id:'media',name:'Media Studio',x:-30,z:5,path:'media',xp:20,qualification:'Media Production Foundation'},
    {id:'sport',name:'Community Sports Ground',x:-27,z:-30,path:'sport',xp:20,qualification:'Community Sport Development Badge'},
    {id:'business',name:'Street Market',x:24,z:-33,path:'business',xp:18,qualification:'Microbusiness Foundation'},
    {id:'community',name:'Community Hall',x:-30,z:-15,path:'community',xp:18,qualification:'Community Leadership Foundation'}
  ];

  function distance(x,z){const p=player.getPosition();return Math.hypot(p.x-x,p.z-z);}
  function nearbyTraining(){
    if(world.driving||window.StreetHustleUIBlocking||window.StreetHustleAdvancedBlocking||panelOpen)return null;
    return trainingLocations.find(loc=>distance(loc.x,loc.z)<3.1)||null;
  }

  function train(loc){
    const d=day();
    if(state.trainingToday[loc.id]===d){milestone(`already-${loc.id}-${d}`,`${loc.name}: training already completed today`);return;}
    state.trainingToday[loc.id]=d;
    state.pathXp[loc.path]+=loc.xp;
    state.relationshipLife.socialCircle=clamp(state.relationshipLife.socialCircle+1,0,100);
    if(state.pathXp[loc.path]>=100&&!state.qualifications.includes(loc.qualification)){
      state.qualifications.push(loc.qualification);milestone(`qual-${loc.id}`,`${loc.qualification} earned`);
    } else milestone(`train-${loc.id}-${d}`,`${loc.name}: +${loc.xp} ${pathName(loc.path)} XP`);
    recalc();save();
  }

  window.addEventListener('street-hustle-interact',(event)=>{
    const loc=nearbyTraining();if(!loc)return;
    event.stopImmediatePropagation();train(loc);
  },true);

  // -------------------------------------------------------------------
  // Synchronise long-game state with actual game progress.
  // -------------------------------------------------------------------
  function unlockChapter(id){if(!state.chapters.includes(id))state.chapters.push(id);}
  function recalc(){
    const s=stats(),main=s.main||{},adv=s.adv||{};
    state.age=19+Math.floor(Math.max(0,s.day-1)/60);
    if(state.firstSeenDay===1&&s.day>1)state.firstSeenDay=s.day;

    if(s.day!==state.lastDay){
      state.trainingToday={};
      state.lastDay=s.day;
      state.relationshipLife.familyBond=clamp(state.relationshipLife.familyBond-0.2,0,100);
    }

    // Read real gameplay choices from the main save.
    state.choices.legit=Math.max(state.choices.legit,Number(main.legitimateJobs)||0);
    state.choices.risky=Math.max(state.choices.risky,Number(main.riskChoices)||0);

    // Career titles are intentionally broad so several routes can coexist.
    const best=Object.entries(state.pathXp).sort((a,b)=>b[1]-a[1])[0];
    const bestPath=best?.[0]||'business',bestLevel=pathLevel(bestPath);
    if(s.rep>=8&&bestLevel>=4)state.careerTitle=`Established ${pathName(bestPath)} Professional`;
    else if(bestLevel>=3)state.careerTitle=`Developing ${pathName(bestPath)} Specialist`;
    else if(bestLevel>=2)state.careerTitle=`Junior ${pathName(bestPath)} Worker`;
    else if(main.story?.stableWork)state.careerTitle='Reliable Worker / Hustler';
    else state.careerTitle='Casual Hustler';

    // Family/social system reflects the original main relationships.
    const rel=main.relationships||{};
    const average=Object.values(rel).length?Object.values(rel).reduce((a,b)=>a+(Number(b)||0),0)/Object.values(rel).length:20;
    state.relationshipLife.socialCircle=clamp(Math.max(state.relationshipLife.socialCircle,Math.round(average)),0,100);
    state.relationshipLife.familyBond=clamp(Math.max(state.relationshipLife.familyBond,Number(rel.Ma)||0),0,100);
    if(state.age>=21&&state.relationshipLife.socialCircle>=55&&state.relationshipLife.stage==='Single')state.relationshipLife.stage='Open to a serious relationship';
    if(state.age>=23&&state.relationshipLife.partnerTrust>=70&&state.relationshipLife.stage==='Partnered'&&state.relationshipLife.children===0)state.relationshipLife.children=1;

    // Legal / prison / release narrative progression.
    const arrests=Number(adv.arrests)||0;
    if(arrests>state.legal.lastArrests){
      const diff=arrests-state.legal.lastArrests;
      state.legal.record=true;
      state.legal.custodyDays+=diff*(s.heat>=7?3:1);
      state.legal.releaseCount+=diff;
      state.pathXp.streetwise+=diff*30;
      state.rivalPressure=clamp(state.rivalPressure+diff*8,0,100);
      state.legal.lastArrests=arrests;
    }

    // Assets / housing / fleet.
    state.property.homeLevel=Math.max(state.property.homeLevel,Number(adv.propertyLevel)||0);
    if(state.property.homeLevel>=1)state.property.residence='Improved Family Home';
    if(state.property.homeLevel>=3&&s.wealth>=5000)state.property.residence='Upgraded Family Property';
    if(s.wealth>=12000)state.property.portfolio=Math.max(state.property.portfolio,1);
    if(main.assets?.vehicleOwned)state.fleet.hatchback=true;
    if(s.wealth>=5000&&pathLevel('business')>=3)state.fleet.bakkie=true;
    if(s.wealth>=10000&&s.rep>=8)state.fleet.sedan=true;
    if(s.wealth>=15000&&pathLevel('business')>=4)state.fleet.taxi=true;

    // Cast follows the actual main story unlocks and broader long-game route.
    for(const id of main.unlockedCharacters||[])if(!state.castUnlocked.includes(id))state.castUnlocked.push(id);
    if(pathLevel('electrical')>=3&&!state.castUnlocked.includes('thando'))state.castUnlocked.push('thando');
    if(pathLevel('media')>=3&&!state.castUnlocked.includes('lerato'))state.castUnlocked.push('lerato');
    if(state.legal.releaseCount>=2&&!state.castUnlocked.includes('mandla'))state.castUnlocked.push('mandla');

    // Story chapters.
    unlockChapter('home-pressure');
    if(main.story?.introTalked)unlockChapter('survival');
    if(main.story?.stableWork||state.choices.legit>=3)unlockChapter('foundation');
    if(main.story?.businessStarted)unlockChapter('entrepreneur');
    if(state.districtVisits.length>=3||state.qualifications.length>=2)unlockChapter('expansion');
    if(main.story?.heroReached)unlockChapter('hero');
    if((s.heat>=4||state.rivalPressure>=25)&&main.story?.heroReached)unlockChapter('pressure');
    if(main.story?.downfall)unlockChapter('fall');
    if(main.story?.rebuilt)unlockChapter('rebuild');
    if(main.story?.rebuilt&&s.rep>=10&&state.relationshipLife.familyBond>=65)unlockChapter('legacy');

    // Legacy and ending discovery.
    const ownedBusinesses=Object.values(main.businesses||{}).filter(b=>b?.owned).length;
    state.legacyScore=Math.max(0,Math.round(s.wealth/20+s.rep*20+state.relationshipLife.familyBond*2+state.qualifications.length*50+ownedBusinesses*80+state.choices.community*15-state.choices.risky*10-(s.heat*12)));
    const endings=endingScores(s);
    if(main.story?.rebuilt||s.day>=15){
      const id=endings[0][0];if(!state.endingsUnlocked.includes(id))state.endingsUnlocked.push(id);
    }
  }

  window.addEventListener('street-hustle-district',(e)=>{
    const id=e.detail?.id;if(!id)return;
    if(!state.districtVisits.includes(id)){state.districtVisits.push(id);state.pathXp.community+=8;milestone(`district-${id}`,`${e.detail?.label||id} discovered`);save();}
  });

  app.on('update',(dt)=>{
    syncAccumulator+=dt;
    const loc=nearbyTraining();
    const interaction=$('interaction');
    if(loc&&interaction&&!window.StreetHustleAdvancedBlocking){
      interaction.textContent=`${loc.name.toUpperCase()} · E Train / build ${pathName(loc.path)} skill`;
      interaction.classList.add('visible');
    }
    if(syncAccumulator>=3){syncAccumulator=0;recalc();save();if(panelOpen)render();}
  });

  recalc();save();
  window.StreetHustleFullScope={state,open:openPanel,recalculate:recalc,cast,trainingLocations};
}
