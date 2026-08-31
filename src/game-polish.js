// STREET HUSTLE — GAME SHELL / POLISH LAYER
// Tutorial, pause menu, settings, objective waypoint, zone banners, manual save
// slots, lifetime statistics and an alpha completion summary.

const world = window.StreetHustleWorld;
if (!world) {
  console.error('Street Hustle game shell could not start: world core missing.');
} else {
  const $ = (id) => document.getElementById(id);
  const POLISH_KEY = 'streetHustle.polish.v1';
  const ALPHA_KEY = 'streetHustle.alpha.v3';
  const ADV_KEY = 'streetHustle.advanced.v1';

  const defaultSettings = {
    tutorialSeen: false,
    minimap: true,
    weatherFx: true,
    waypoint: true,
    zoneBanners: true,
    completionShown: false,
    playSeconds: 0,
    sessions: 0
  };

  function loadSettings() {
    try { return { ...defaultSettings, ...JSON.parse(localStorage.getItem(POLISH_KEY) || '{}') }; }
    catch { return { ...defaultSettings }; }
  }
  const settings = loadSettings();
  settings.sessions += 1;
  let pauseOpen = false;
  let statsOpen = false;
  let currentZone = '';
  let lastObjective = '';
  let saveAccumulator = 0;

  function saveSettings() {
    try { localStorage.setItem(POLISH_KEY, JSON.stringify(settings)); } catch {}
  }

  function toast(text) {
    const el = $('toast'); if (!el) return;
    el.textContent = text; el.classList.add('visible'); clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('visible'), 1900);
  }

  // -------------------------------------------------------------------
  // First-run tutorial
  // -------------------------------------------------------------------
  const tutorial = document.createElement('section');
  tutorial.id = 'tutorial-screen';
  tutorial.innerHTML = `
    <div class="tutorial-card">
      <div class="tutorial-kicker">STREET HUSTLE</div>
      <h1>ZERO → HERO → ZERO → HERO</h1>
      <p>You start with almost nothing. Work, build relationships, grow businesses, own assets and live with the consequences of your choices.</p>
      <div class="tutorial-grid">
        <div><strong>MOVE</strong><span>WASD / arrows</span></div>
        <div><strong>RUN</strong><span>Hold Shift</span></div>
        <div><strong>INTERACT</strong><span>E</span></div>
        <div><strong>PHONE</strong><span>P</span></div>
        <div><strong>TASKS</strong><span>J</span></div>
        <div><strong>TAXI</strong><span>T at taxi rank</span></div>
        <div><strong>CAMERA</strong><span>Drag + wheel</span></div>
        <div><strong>PAUSE</strong><span>Esc</span></div>
      </div>
      <p class="tutorial-note">Your money/story save and the new world-systems save are automatic. You can also create manual save slots from Pause.</p>
      <button id="tutorial-start" type="button">START STREET HUSTLE</button>
    </div>`;
  document.body.appendChild(tutorial);
  if (!settings.tutorialSeen) tutorial.classList.add('visible');

  $('tutorial-start')?.addEventListener('click', () => {
    settings.tutorialSeen = true; saveSettings(); tutorial.classList.remove('visible');
  });

  // -------------------------------------------------------------------
  // Pause/settings menu
  // -------------------------------------------------------------------
  const pause = document.createElement('section');
  pause.id = 'pause-menu';
  pause.innerHTML = `
    <div class="pause-card">
      <div class="pause-title"><div><small>STREET HUSTLE</small><h2>PAUSED</h2></div><button id="pause-resume" type="button">RESUME</button></div>
      <div class="pause-tabs">
        <button data-pause-tab="main" class="active">Game</button>
        <button data-pause-tab="settings">Settings</button>
        <button data-pause-tab="saves">Save Slots</button>
        <button data-pause-tab="stats">Stats</button>
      </div>
      <div id="pause-content"></div>
    </div>`;
  document.body.appendChild(pause);
  let pauseTab = 'main';

  function manualSnapshot(slot) {
    const snapshot = {
      createdAt: new Date().toISOString(),
      alpha: localStorage.getItem(ALPHA_KEY),
      advanced: localStorage.getItem(ADV_KEY),
      polish: JSON.stringify(settings)
    };
    localStorage.setItem(`streetHustle.slot.${slot}`, JSON.stringify(snapshot));
    toast(`Saved to Slot ${slot}`);
    renderPause();
  }

  function loadSnapshot(slot) {
    try {
      const snapshot = JSON.parse(localStorage.getItem(`streetHustle.slot.${slot}`) || 'null');
      if (!snapshot) return toast(`Slot ${slot} is empty`);
      if (snapshot.alpha) localStorage.setItem(ALPHA_KEY, snapshot.alpha);
      if (snapshot.advanced) localStorage.setItem(ADV_KEY, snapshot.advanced);
      if (snapshot.polish) localStorage.setItem(POLISH_KEY, snapshot.polish);
      location.reload();
    } catch { toast('Save slot could not be loaded'); }
  }

  function slotInfo(slot) {
    try {
      const s = JSON.parse(localStorage.getItem(`streetHustle.slot.${slot}`) || 'null');
      if (!s) return 'Empty';
      return new Date(s.createdAt).toLocaleString('en-ZA');
    } catch { return 'Unreadable'; }
  }

  function parseAdv() {
    try { return JSON.parse(localStorage.getItem(ADV_KEY) || '{}'); } catch { return {}; }
  }

  function parseAlpha() {
    try { return JSON.parse(localStorage.getItem(ALPHA_KEY) || '{}'); } catch { return {}; }
  }

  function renderPause() {
    const content = $('pause-content'); if (!content) return;
    for (const b of pause.querySelectorAll('[data-pause-tab]')) b.classList.toggle('active', b.dataset.pauseTab === pauseTab);
    const alpha = parseAlpha(); const adv = parseAdv();
    if (pauseTab === 'main') {
      content.innerHTML = `
        <div class="pause-grid">
          <button data-pause-action="resume"><strong>Resume</strong><span>Return to the neighbourhood</span></button>
          <button data-pause-action="tasks"><strong>Tasks</strong><span>Open missions and skills</span></button>
          <button data-pause-action="phone"><strong>Phone</strong><span>Jobs, money, business and people</span></button>
          <button data-pause-action="home"><strong>Return Home</strong><span>Teleport to the starting home</span></button>
        </div>`;
    } else if (pauseTab === 'settings') {
      content.innerHTML = `
        <label class="setting-row"><span><strong>Minimap</strong><small>Show the live neighbourhood map</small></span><input type="checkbox" data-setting="minimap" ${settings.minimap?'checked':''}></label>
        <label class="setting-row"><span><strong>Weather effects</strong><small>Rain and fog screen effects</small></span><input type="checkbox" data-setting="weatherFx" ${settings.weatherFx?'checked':''}></label>
        <label class="setting-row"><span><strong>Objective waypoint</strong><small>Direction and distance to story objective</small></span><input type="checkbox" data-setting="waypoint" ${settings.waypoint?'checked':''}></label>
        <label class="setting-row"><span><strong>Area banners</strong><small>Show area name when you enter a new part of the neighbourhood</small></span><input type="checkbox" data-setting="zoneBanners" ${settings.zoneBanners?'checked':''}></label>
        <button class="pause-wide danger" data-pause-action="reset-tutorial">Show tutorial again</button>`;
    } else if (pauseTab === 'saves') {
      content.innerHTML = [1,2,3].map(slot=>`<div class="save-slot"><div><strong>SLOT ${slot}</strong><small>${slotInfo(slot)}</small></div><div><button data-save-slot="${slot}">SAVE</button><button class="secondary" data-load-slot="${slot}">LOAD</button></div></div>`).join('');
    } else if (pauseTab === 'stats') {
      const achievements = adv.achievements?.length || 0;
      const missions = Object.entries(adv.missions || {}).filter(([k,v])=>v && !k.startsWith('gym-') && !k.startsWith('park-')).length;
      content.innerHTML = `
        <div class="stats-grid">
          <div><small>DAY</small><strong>${alpha.day || 1}</strong></div>
          <div><small>CASH</small><strong>R${alpha.cash || 0}</strong></div>
          <div><small>BANK</small><strong>R${alpha.bank || 0}</strong></div>
          <div><small>REP</small><strong>${alpha.reputation || 0}</strong></div>
          <div><small>STREET XP</small><strong>${adv.streetXp || 0}</strong></div>
          <div><small>HEALTH</small><strong>${Math.round(adv.health || 100)}</strong></div>
          <div><small>WALKED</small><strong>${Math.round(adv.distanceWalked || 0)}m</strong></div>
          <div><small>DRIVEN</small><strong>${Math.round(adv.distanceDriven || 0)}m</strong></div>
          <div><small>LOCATIONS</small><strong>${adv.visited?.length || 0}</strong></div>
          <div><small>MISSIONS</small><strong>${missions}</strong></div>
          <div><small>ACHIEVEMENTS</small><strong>${achievements}</strong></div>
          <div><small>ARRESTS</small><strong>${adv.arrests || 0}</strong></div>
          <div><small>HOSPITAL</small><strong>${adv.hospitalVisits || 0}</strong></div>
          <div><small>TAXI TRIPS</small><strong>${adv.fastTravels || 0}</strong></div>
          <div><small>HOME LEVEL</small><strong>${adv.propertyLevel || 0}</strong></div>
          <div><small>SESSIONS</small><strong>${settings.sessions}</strong></div>
        </div>`;
    }
  }

  function openPause(tab='main') {
    if (world.driving) return;
    pauseTab = tab; pauseOpen = true; pause.classList.add('visible'); renderPause();
    window.StreetHustleUIBlocking = true;
  }
  function closePause() {
    pauseOpen=false; pause.classList.remove('visible');
    const phoneOpen = $('phone')?.classList.contains('visible');
    const dialogueOpen = $('dialogue')?.classList.contains('visible');
    window.StreetHustleUIBlocking = Boolean(phoneOpen || dialogueOpen);
  }

  $('pause-resume')?.addEventListener('click',closePause);
  pause.querySelector('.pause-tabs')?.addEventListener('click',e=>{const b=e.target.closest('[data-pause-tab]');if(!b)return;pauseTab=b.dataset.pauseTab;renderPause();});
  $('pause-content')?.addEventListener('click',e=>{
    const action=e.target.closest('[data-pause-action]')?.dataset.pauseAction;
    const saveSlot=e.target.closest('[data-save-slot]')?.dataset.saveSlot;
    const loadSlot=e.target.closest('[data-load-slot]')?.dataset.loadSlot;
    if(saveSlot)return manualSnapshot(saveSlot);
    if(loadSlot)return loadSnapshot(loadSlot);
    if(action==='resume')closePause();
    if(action==='tasks'){closePause();$('tasks-button')?.click();}
    if(action==='phone'){closePause();$('phone-button')?.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));}
    if(action==='home'){closePause();world.teleport(-8.5,14.5);toast('Returned home');}
    if(action==='reset-tutorial'){settings.tutorialSeen=false;saveSettings();closePause();tutorial.classList.add('visible');}
  });
  $('pause-content')?.addEventListener('change',e=>{
    const input=e.target.closest('[data-setting]');if(!input)return;
    settings[input.dataset.setting]=input.checked;saveSettings();applySettings();
  });

  window.addEventListener('keydown',e=>{
    if(e.key!=='Escape'||e.repeat)return;
    // Capture handler: if driving, allow the base game to use Esc for exit car.
    if(world.driving)return;
    e.stopImmediatePropagation();
    if(pauseOpen)closePause();else openPause();
  },true);

  // -------------------------------------------------------------------
  // Objective waypoint and compass
  // -------------------------------------------------------------------
  const waypoint=document.createElement('div');waypoint.id='objective-waypoint';waypoint.innerHTML='<span id="waypoint-arrow">▲</span><div><strong id="waypoint-label"></strong><small id="waypoint-distance"></small></div>';document.body.appendChild(waypoint);

  const targets={
    ma:{label:'Ma / Home',x:-8.3,z:18},
    shop:{label:'Corner Shop',x:8.6,z:-23},
    carwash:{label:'Car Wash',x:-16,z:-25},
    sipho:{label:'Sipho',x:-11.5,z:-25},
    home:{label:'Home',x:-8.2,z:18},
    construction:{label:'Work',x:24,z:6.5}
  };

  function targetForObjective(text){
    const t=text.toLowerCase();
    if(t.includes('talk to ma'))return targets.ma;
    if(t.includes('buy bread')||t.includes('corner shop'))return targets.shop;
    if(t.includes('take the bread')||t.includes('sleep'))return targets.home;
    if(t.includes('earn r25')||t.includes('legitimate jobs'))return targets.carwash;
    if(t.includes('sipho'))return targets.sipho;
    return null;
  }

  function updateWaypoint(){
    if(!settings.waypoint){waypoint.classList.remove('visible');return;}
    const objective=$('objective')?.textContent||'';
    const target=targetForObjective(objective);
    if(!target||window.StreetHustleUIBlocking){waypoint.classList.remove('visible');return;}
    const p=world.getControlledPosition();const dx=target.x-p.x,dz=target.z-p.z;const dist=Math.hypot(dx,dz);
    $('waypoint-label').textContent=target.label;$('waypoint-distance').textContent=`${Math.round(dist)} m`;
    const yaw=(world.driving?world.vehicle.getEulerAngles().y:world.player.getEulerAngles().y)*Math.PI/180;
    const targetAngle=Math.atan2(dx,-dz);const relative=(targetAngle-yaw)*180/Math.PI;
    $('waypoint-arrow').style.transform=`rotate(${relative}deg)`;waypoint.classList.add('visible');
    if(objective!==lastObjective){lastObjective=objective;waypoint.classList.add('pulse');setTimeout(()=>waypoint.classList.remove('pulse'),900);}
  }

  // -------------------------------------------------------------------
  // Zone banners
  // -------------------------------------------------------------------
  const zoneBanner=document.createElement('div');zoneBanner.id='zone-banner';document.body.appendChild(zoneBanner);
  function zoneFor(x,z){
    if(z<-20)return 'SOUTH WORK & TAXI ZONE';
    if(z>20)return 'NORTH RESIDENTIAL';
    if(x<-20)return 'WEST COMMUNITY SIDE';
    if(x>20)return 'EAST SERVICES SIDE';
    if(Math.abs(x)<7)return 'MAIN ROAD';
    return 'NEIGHBOURHOOD';
  }
  function updateZone(){
    const p=world.getControlledPosition();const zone=zoneFor(p.x,p.z);
    if(zone===currentZone)return;currentZone=zone;
    if(!settings.zoneBanners)return;
    zoneBanner.textContent=zone;zoneBanner.classList.add('visible');clearTimeout(updateZone._t);updateZone._t=setTimeout(()=>zoneBanner.classList.remove('visible'),1700);
  }

  // -------------------------------------------------------------------
  // Alpha completion summary
  // -------------------------------------------------------------------
  const completion=document.createElement('section');completion.id='completion-screen';completion.innerHTML='<div class="completion-card"><div class="completion-kicker">FIRST LIFE ARC COMPLETE</div><h2>ZERO → HERO → ZERO → HERO</h2><p>You completed the current Street Hustle alpha arc. The world remains open so you can continue building wealth, skills, missions, property and relationships.</p><div id="completion-stats"></div><button id="completion-continue">CONTINUE PLAYING</button></div>';document.body.appendChild(completion);
  $('completion-continue')?.addEventListener('click',()=>{completion.classList.remove('visible');settings.completionShown=true;saveSettings();});
  function checkCompletion(){
    if(settings.completionShown)return;
    const text=$('objective')?.textContent||'';
    if(!text.includes('ALPHA ARC COMPLETE'))return;
    const a=parseAlpha(),v=parseAdv();
    $('completion-stats').innerHTML=`<span>DAY ${a.day||1}</span><span>R${(a.cash||0)+(a.bank||0)} LIQUID</span><span>${a.reputation||0} REP</span><span>${v.streetXp||0} STREET XP</span><span>${v.achievements?.length||0} ACHIEVEMENTS</span>`;
    completion.classList.add('visible');window.StreetHustleUIBlocking=true;
  }

  function applySettings(){
    const minimap=$('minimap');if(minimap)minimap.style.display=settings.minimap?'block':'none';
    const overlay=$('weather-overlay');if(overlay)overlay.style.display=settings.weatherFx?'block':'none';
  }

  appLoop();
  function appLoop(){
    const app=world.app;
    app.on('update',dt=>{
      settings.playSeconds+=dt;saveAccumulator+=dt;
      updateWaypoint();updateZone();checkCompletion();
      if(saveAccumulator>10){saveAccumulator=0;saveSettings();}
    });
    applySettings();saveSettings();
  }
}
