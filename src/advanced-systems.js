import * as pc from 'playcanvas';

// STREET HUSTLE — ADVANCED SYSTEMS PACK
// Large near-complete-alpha layer: health, wanted/police, hospital, dangerous
// traffic, weather, XP/skills, missions, achievements, taxi travel, extra world
// locations, property progression, random neighbourhood events and world polish.
// It intentionally stores its own extension save so the existing economy/story
// save remains safe and backwards-compatible.

const world = window.StreetHustleWorld;
const app = world?.app;
const player = world?.player;

if (!world || !app || !player) {
  console.error('Street Hustle advanced systems could not start: world core missing.');
} else {
  const SAVE_KEY = 'streetHustle.advanced.v1';
  const $ = (id) => document.getElementById(id);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function hudNumber(id) {
    const text = $(id)?.textContent || '0';
    const match = text.match(/-?\d[\d,]*/);
    return match ? Number(match[0].replace(/,/g, '')) || 0 : 0;
  }

  function clockHour() {
    const text = $('clock')?.textContent || '09:00';
    const match = text.match(/(\d{1,2}):(\d{2})/);
    return match ? (Number(match[1]) + Number(match[2]) / 60) : 9;
  }

  function mainStats() {
    return {
      day: hudNumber('day'),
      cash: hudNumber('cash'),
      bank: hudNumber('bank'),
      rep: hudNumber('rep'),
      heat: hudNumber('heat'),
      energy: hudNumber('energy'),
      hour: clockHour()
    };
  }

  const defaultState = () => ({
    version: 1,
    health: 100,
    maxHealth: 100,
    vehicleHealth: 100,
    wanted: 0,
    lastHeat: 0,
    escapeProgress: 0,
    arrestProgress: 0,
    hospitalVisits: 0,
    arrests: 0,
    policeEscapes: 0,
    respawns: 0,
    distanceWalked: 0,
    distanceDriven: 0,
    fastTravels: 0,
    interactions: 0,
    gymSessions: 0,
    mechanicVisits: 0,
    clinicVisits: 0,
    streetXp: 0,
    skills: {
      fitness: 0,
      driving: 0,
      social: 0,
      streetwise: 0,
      business: 0
    },
    visited: [],
    achievements: [],
    missions: {},
    propertyLevel: 0,
    currentWeather: 'clear',
    weatherBucket: -1,
    lastEventBucket: -1,
    eventHistory: [],
    dailyMarker: 0,
    daily: { walk: 0, visits: 0, taxi: 0 },
    soundHintsShown: false
  });

  function loadState() {
    const base = defaultState();
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return base;
      const saved = JSON.parse(raw);
      return {
        ...base,
        ...saved,
        skills: { ...base.skills, ...(saved.skills || {}) },
        missions: { ...base.missions, ...(saved.missions || {}) },
        daily: { ...base.daily, ...(saved.daily || {}) },
        visited: Array.isArray(saved.visited) ? saved.visited : [],
        achievements: Array.isArray(saved.achievements) ? saved.achievements : [],
        eventHistory: Array.isArray(saved.eventHistory) ? saved.eventHistory : []
      };
    } catch (error) {
      console.warn('Street Hustle advanced save could not be read.', error);
      return base;
    }
  }

  const state = loadState();
  let saveAccumulator = 0;
  let collisionCooldown = 0;
  let randomEventCooldown = 15;
  let insideBuilding = false;
  let tasksOpen = false;
  let taxiOpen = false;
  let currentEvent = null;
  let lastControlledPosition = world.getControlledPosition().clone();
  let lastFootPosition = player.getPosition().clone();
  let lastVehiclePosition = world.vehicle.getPosition().clone();
  let policeDamageCooldown = 0;
  let weatherApplied = '';
  let locationPrompt = null;
  let propertyToastLevel = state.propertyLevel;

  // ---------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------
  const advancedHud = document.createElement('div');
  advancedHud.id = 'advanced-hud';
  advancedHud.innerHTML = `
    <div class="adv-chip health"><span>HEALTH</span><strong id="adv-health">100</strong></div>
    <div class="adv-chip"><span>LEVEL</span><strong id="adv-level">1</strong></div>
    <div class="adv-chip"><span>XP</span><strong id="adv-xp">0</strong></div>
    <div class="adv-chip weather"><span id="adv-weather">CLEAR</span></div>
    <div id="wanted-stars" aria-label="Wanted level"></div>`;
  document.body.appendChild(advancedHud);

  const advancedPrompt = document.createElement('div');
  advancedPrompt.id = 'advanced-interaction';
  document.body.appendChild(advancedPrompt);

  const extraButtons = document.createElement('div');
  extraButtons.id = 'advanced-buttons';
  extraButtons.innerHTML = `
    <button id="tasks-button" type="button">TASKS</button>
    <button id="taxi-button" type="button">TAXI</button>`;
  document.body.appendChild(extraButtons);

  const tasksPanel = document.createElement('section');
  tasksPanel.id = 'tasks-panel';
  tasksPanel.innerHTML = `<div class="adv-panel-head"><div><strong>STREET PROGRESS</strong><small>Near-complete alpha systems</small></div><button id="tasks-close" type="button">×</button></div><div id="tasks-content"></div>`;
  document.body.appendChild(tasksPanel);

  const taxiPanel = document.createElement('section');
  taxiPanel.id = 'taxi-panel';
  taxiPanel.innerHTML = `<div class="adv-panel-head"><div><strong>LOCAL TAXI</strong><small>Choose a destination</small></div><button id="taxi-close" type="button">×</button></div><div id="taxi-content"></div>`;
  document.body.appendChild(taxiPanel);

  const eventPanel = document.createElement('section');
  eventPanel.id = 'world-event-panel';
  eventPanel.innerHTML = `<div class="event-tag">NEIGHBOURHOOD EVENT</div><h3 id="event-title"></h3><p id="event-text"></p><div id="event-actions"></div>`;
  document.body.appendChild(eventPanel);

  const weatherOverlay = document.createElement('div');
  weatherOverlay.id = 'weather-overlay';
  document.body.appendChild(weatherOverlay);

  const fade = document.createElement('div');
  fade.id = 'game-fade';
  document.body.appendChild(fade);

  const healthEl = $('adv-health');
  const levelEl = $('adv-level');
  const xpEl = $('adv-xp');
  const weatherEl = $('adv-weather');
  const wantedEl = $('wanted-stars');
  const tasksContent = $('tasks-content');
  const taxiContent = $('taxi-content');
  const tasksButton = $('tasks-button');
  const taxiButton = $('taxi-button');

  function toast(text, duration = 1900) {
    const el = $('toast');
    if (!el) return;
    el.textContent = text;
    el.classList.add('visible');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => el.classList.remove('visible'), duration);
  }

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
    catch (error) { console.warn('Street Hustle advanced save failed.', error); }
  }

  function setBlocking() {
    window.StreetHustleAdvancedBlocking = tasksOpen || taxiOpen || Boolean(currentEvent);
    if (window.StreetHustleAdvancedBlocking) document.body.classList.add('advanced-modal-open');
    else document.body.classList.remove('advanced-modal-open');
  }

  function addXp(amount, skill = null, multiplier = 1) {
    const value = Math.max(0, Math.round(amount * multiplier));
    if (!value) return;
    state.streetXp += value;
    if (skill && state.skills[skill] !== undefined) state.skills[skill] += value;
    checkAchievements();
  }

  const overallLevel = () => 1 + Math.floor(state.streetXp / 250);
  const skillLevel = (id) => 1 + Math.floor((state.skills[id] || 0) / 120);

  function updateAdvancedHud() {
    healthEl.textContent = Math.round(state.health);
    healthEl.parentElement?.classList.toggle('danger', state.health <= 30);
    levelEl.textContent = overallLevel();
    xpEl.textContent = state.streetXp;
    weatherEl.textContent = state.currentWeather.toUpperCase();
    wantedEl.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const star = document.createElement('span');
      star.textContent = '★';
      star.className = i < state.wanted ? 'active' : '';
      wantedEl.appendChild(star);
    }
  }

  // ---------------------------------------------------------------------
  // Materials / primitive helpers
  // ---------------------------------------------------------------------
  function material(r, g, b, metalness = 0, gloss = .2) {
    const m = new pc.StandardMaterial();
    m.diffuse = new pc.Color(r, g, b); m.metalness = metalness; m.gloss = gloss; m.update();
    return m;
  }

  const mat = {
    clinic: material(.88,.88,.84),
    clinicAccent: material(.10,.58,.35),
    police: material(.12,.24,.52,.08,.38),
    policeWhite: material(.86,.88,.90),
    policeRed: material(.88,.06,.05,0,.55),
    policeBlue: material(.05,.24,.90,0,.55),
    gym: material(.56,.13,.13),
    mechanic: material(.30,.31,.33,.15,.28),
    park: material(.16,.42,.18),
    wood: material(.34,.17,.07),
    concrete: material(.53,.52,.48),
    glass: material(.10,.25,.31,.03,.62),
    roadCar: material(.58,.18,.08,.08,.40),
    roadCar2: material(.15,.20,.28,.10,.42),
    tyre: material(.025,.025,.025),
    solar: material(.05,.14,.23,.18,.58),
    tank: material(.15,.25,.30,.10,.25),
    security: material(.08,.09,.10,.25,.30),
    marker: material(.08,.68,.32,0,.32),
    gold: material(.92,.64,.08,0,.35)
  };

  function part(parent, name, type, x, y, z, sx, sy, sz, m, rx = 0, ry = 0, rz = 0) {
    const e = new pc.Entity(name);
    e.addComponent('model', { type });
    parent.addChild(e);
    e.setLocalPosition(x, y, z);
    e.setLocalScale(sx, sy, sz);
    e.setLocalEulerAngles(rx, ry, rz);
    e.model.material = m;
    return e;
  }

  function makeBuilding(name, x, z, w, d, h, bodyMat, accentMat) {
    const root = new pc.Entity(`Advanced_${name}`);
    app.root.addChild(root); root.setPosition(x, 0, z);
    part(root, `${name}_Body`, 'box', 0, h/2, 0, w, h, d, bodyMat);
    part(root, `${name}_Roof`, 'box', 0, h+.14, 0, w+.3, .28, d+.3, mat.security);
    part(root, `${name}_Door`, 'box', 0, 1.15, d/2+.03, 1.25, 2.25, .10, accentMat);
    part(root, `${name}_WindowL`, 'box', -w*.27, 1.8, d/2+.04, 1.1, 1.0, .10, mat.glass);
    part(root, `${name}_WindowR`, 'box', w*.27, 1.8, d/2+.04, 1.1, 1.0, .10, mat.glass);
    return root;
  }

  const clinicBuilding = makeBuilding('Clinic', -31, 30, 8, 6, 4.4, mat.clinic, mat.clinicAccent);
  const policeBuilding = makeBuilding('PoliceStation', -31, -30, 8, 6, 4.4, mat.policeWhite, mat.police);
  const gymBuilding = makeBuilding('Gym', 31, 30, 8, 6, 4.4, mat.gym, mat.gold);
  const mechanicBuilding = makeBuilding('Mechanic', 31, -30, 8, 6, 4.4, mat.mechanic, mat.roadCar);

  // Park furniture.
  const parkRoot = new pc.Entity('Advanced_CommunityPark'); app.root.addChild(parkRoot); parkRoot.setPosition(-27, 0, 0);
  part(parkRoot, 'ParkPad', 'box', 0, .03, 0, 9, .06, 9, mat.park);
  for (const z of [-2.5, 2.5]) {
    part(parkRoot, `BenchSeat_${z}`, 'box', 0, .55, z, 3.0, .18, .65, mat.wood);
    part(parkRoot, `BenchLegL_${z}`, 'box', -1, .27, z, .13, .55, .13, mat.security);
    part(parkRoot, `BenchLegR_${z}`, 'box', 1, .27, z, .13, .55, .13, mat.security);
  }

  const locations = [
    { id:'clinic', name:'Community Clinic', x:-26.6, z:30, action:'Heal to full health', type:'clinic' },
    { id:'police', name:'Police Station', x:-26.6, z:-30, action:'Community desk', type:'police' },
    { id:'gym', name:'Local Gym', x:26.6, z:30, action:'Train fitness', type:'gym' },
    { id:'mechanic', name:'Mechanic', x:26.6, z:-30, action:'Repair vehicle', type:'mechanic' },
    { id:'park', name:'Community Park', x:-23.5, z:0, action:'Relax / socialise', type:'park' },
    { id:'taxi', name:'Taxi Rank', x:7.0, z:-29, action:'Travel', type:'taxi' },
    { id:'home', name:'Home', x:-8.5, z:15, action:'Home', type:'landmark' },
    { id:'shop', name:'Corner Shop', x:9, z:-19, action:'Shop', type:'landmark' },
    { id:'carwash', name:'Car Wash', x:-16, z:-25, action:'Work', type:'landmark' },
    { id:'construction', name:'Construction Site', x:24, z:6, action:'Work', type:'landmark' }
  ];

  for (const loc of locations.slice(0, 5)) {
    const markerRoot = new pc.Entity(`AdvancedMarker_${loc.id}`); app.root.addChild(markerRoot); markerRoot.setPosition(loc.x, 0, loc.z);
    part(markerRoot, `${loc.id}_Marker`, 'cylinder', 0, .13, 0, 1.05, .20, 1.05, loc.type === 'police' ? mat.police : mat.marker);
  }

  // ---------------------------------------------------------------------
  // Property/lifestyle progression — persistent highest level
  // ---------------------------------------------------------------------
  const propertyRoots = [];

  const p1 = new pc.Entity('PropertyUpgrade_Level1'); app.root.addChild(p1);
  // Solar panel and second water tank.
  part(p1,'SolarPanelA','box',-13,4.55,18,2.6,.10,2.0,mat.solar,12,0,0);
  part(p1,'WaterTankUpgrade','cylinder',-20,1.2,22,1.25,2.4,1.25,mat.tank);
  propertyRoots.push(p1);

  const p2 = new pc.Entity('PropertyUpgrade_Level2'); app.root.addChild(p2);
  // Carport.
  part(p2,'CarportRoof','box',-19,2.8,15,6.0,.16,5.0,mat.security);
  for (const [x,z] of [[-21.6,12.8],[-16.4,12.8],[-21.6,17.2],[-16.4,17.2]]) part(p2,`CarportPost_${x}_${z}`,'box',x,1.4,z,.14,2.8,.14,mat.security);
  propertyRoots.push(p2);

  const p3 = new pc.Entity('PropertyUpgrade_Level3'); app.root.addChild(p3);
  // Security lights + extension block.
  part(p3,'HomeExtension','box',-18.2,1.6,19.8,3.3,3.2,4.0,mat.clinic);
  part(p3,'SecurityLightA','sphere',-8.9,4.1,15.0,.28,.28,.28,mat.gold);
  part(p3,'SecurityLightB','sphere',-8.9,4.1,21.0,.28,.28,.28,mat.gold);
  part(p3,'SolarPanelB','box',-15.6,4.6,18,2.6,.10,2.0,mat.solar,12,0,0);
  propertyRoots.push(p3);

  function updateProperty() {
    const s = mainStats();
    const wealth = s.cash + s.bank;
    let target = state.propertyLevel;
    if (wealth >= 500 && s.rep >= 3) target = Math.max(target, 1);
    if (wealth >= 1500 && s.rep >= 5) target = Math.max(target, 2);
    if (wealth >= 3000 && s.rep >= 7) target = Math.max(target, 3);
    if (target > state.propertyLevel) {
      state.propertyLevel = target;
      if (target > propertyToastLevel) {
        toast(`HOME UPGRADE LEVEL ${target} unlocked`, 2600);
        propertyToastLevel = target;
        addXp(100 * target, 'business');
      }
    }
    propertyRoots.forEach((r, i) => r.enabled = state.propertyLevel >= i + 1);
  }

  // ---------------------------------------------------------------------
  // Dangerous traffic / collision consequences
  // ---------------------------------------------------------------------
  function createHazardCar(name, bodyMat, x, z, direction, speed) {
    const root = new pc.Entity(`HazardTraffic_${name}`); app.root.addChild(root); root.setPosition(x, 0, z);
    part(root,`${name}_Body`,'box',0,.62,0,1.85,.70,3.7,bodyMat);
    part(root,`${name}_Cabin`,'box',0,1.16,-.1,1.55,.60,1.8,mat.glass);
    for (const [wx,wz] of [[-.9,-1.2],[.9,-1.2],[-.9,1.2],[.9,1.2]]) part(root,`${name}_Wheel_${wx}_${wz}`,'cylinder',wx,.38,wz,.42,.22,.42,mat.tyre,0,0,90);
    root.setEulerAngles(0, direction > 0 ? 180 : 0, 0);
    return { root, x, direction, speed };
  }

  const hazardCars = [
    createHazardCar('Bakkie', mat.roadCar, -2.75, 10, 1, 7.5),
    createHazardCar('Sedan', mat.roadCar2, 2.75, -18, -1, 8.2)
  ];

  function damage(amount, reason = 'Impact') {
    if (collisionCooldown > 0) return;
    collisionCooldown = 1.8;
    state.health = clamp(state.health - amount, 0, state.maxHealth);
    toast(`${reason}: -${Math.round(amount)} health`);
    if (state.health <= 0) hospitalRespawn(reason);
  }

  function updateHazardCars(dt) {
    if (insideBuilding) {
      hazardCars.forEach(c => c.root.enabled = false);
      return;
    }
    const hour = clockHour();
    for (const car of hazardCars) {
      car.root.enabled = hour >= 5 && hour < 23;
      if (!car.root.enabled) continue;
      const pos = car.root.getPosition();
      let z = pos.z + car.direction * car.speed * dt;
      if (z > 38) z = -38;
      if (z < -38) z = 38;
      car.root.setPosition(car.x, 0, z);
      const controlled = world.getControlledPosition();
      const d = Math.hypot(controlled.x - car.x, controlled.z - z);
      if (d < (world.driving ? 2.0 : 1.25) && collisionCooldown <= 0) {
        if (world.driving) {
          state.vehicleHealth = clamp(state.vehicleHealth - 18, 0, 100);
          state.wanted = Math.max(state.wanted, 1);
          damage(8, 'Vehicle collision');
          if (state.vehicleHealth <= 0) {
            world.exitVehicle();
            state.vehicleHealth = 25;
            toast('Your car is badly damaged — visit the mechanic', 2600);
          }
        } else {
          damage(24, 'Traffic collision');
          const side = controlled.x >= 0 ? 6.7 : -6.7;
          player.setPosition(side, 0, clamp(controlled.z + (car.direction * 2), -36, 36));
        }
      }
    }
  }

  // ---------------------------------------------------------------------
  // Police / wanted system
  // ---------------------------------------------------------------------
  function createPoliceUnit(index) {
    const root = new pc.Entity(`PoliceUnit_${index}`); app.root.addChild(root);
    part(root,'PoliceBody','box',0,.63,0,1.9,.72,4.0,mat.policeWhite);
    part(root,'PoliceBand','box',0,.72,-.02,1.94,.26,3.2,mat.police);
    part(root,'PoliceCabin','box',0,1.18,-.1,1.55,.58,1.8,mat.glass);
    part(root,'LightRed','box',-.32,1.58,-.05,.28,.14,.38,mat.policeRed);
    part(root,'LightBlue','box',.32,1.58,-.05,.28,.14,.38,mat.policeBlue);
    root.enabled = false;
    return { root, speed: 5.6 + index * .65, phase: index * 2.4 };
  }

  const policeUnits = [createPoliceUnit(0), createPoliceUnit(1), createPoliceUnit(2)];

  function spawnPolice(unit, index) {
    const p = world.getControlledPosition();
    const signs = [[-1,-1],[1,1],[-1,1]][index] || [1,-1];
    unit.root.setPosition(clamp(p.x + signs[0] * (18 + index * 4), -36, 36), 0, clamp(p.z + signs[1] * (18 + index * 3), -36, 36));
    unit.root.enabled = true;
  }

  function arrest() {
    state.arrests += 1;
    state.wanted = 0;
    state.escapeProgress = 0;
    state.arrestProgress = 0;
    state.health = Math.max(70, state.health);
    fade.classList.add('visible');
    setTimeout(() => {
      if (world.driving) world.exitVehicle();
      world.teleport(-26, -28);
      policeUnits.forEach(u => u.root.enabled = false);
      fade.classList.remove('visible');
      toast('ARRESTED — released at the station', 2800);
      addXp(20, 'streetwise');
      unlockAchievement('first-arrest', 'Reality Check', 'You experienced an arrest consequence.');
      save();
    }, 650);
  }

  function hospitalRespawn(reason = 'Injury') {
    state.respawns += 1;
    state.hospitalVisits += 1;
    state.health = 65;
    state.wanted = 0;
    fade.classList.add('visible');
    setTimeout(() => {
      if (world.driving) world.exitVehicle();
      world.teleport(-26, 30);
      policeUnits.forEach(u => u.root.enabled = false);
      fade.classList.remove('visible');
      toast(`HOSPITAL: recovered after ${reason}`, 2800);
      unlockAchievement('hospital', 'Still Standing', 'You recovered after being knocked out.');
      visitLocation('clinic');
      save();
    }, 700);
  }

  function updateWantedFromHeat() {
    const heat = mainStats().heat;
    if (heat > state.lastHeat) {
      state.wanted = Math.max(state.wanted, clamp(Math.ceil(heat / 2), 1, 5));
      toast(`WANTED LEVEL ${state.wanted}`, 2200);
    }
    state.lastHeat = heat;
  }

  function updatePolice(dt) {
    if (insideBuilding || state.wanted <= 0) {
      policeUnits.forEach(u => u.root.enabled = false);
      state.arrestProgress = 0;
      return;
    }

    const target = world.getControlledPosition();
    let closest = Infinity;
    for (let i = 0; i < policeUnits.length; i++) {
      const unit = policeUnits[i];
      const shouldActive = i < Math.ceil(state.wanted / 2);
      if (!shouldActive) { unit.root.enabled = false; continue; }
      if (!unit.root.enabled) spawnPolice(unit, i);
      const pos = unit.root.getPosition();
      const dx = target.x - pos.x;
      const dz = target.z - pos.z;
      const d = Math.max(.001, Math.hypot(dx, dz));
      closest = Math.min(closest, d);
      const speed = unit.speed + state.wanted * .42;
      const nx = clamp(pos.x + dx / d * speed * dt, -37, 37);
      const nz = clamp(pos.z + dz / d * speed * dt, -37, 37);
      unit.root.setPosition(nx, 0, nz);
      unit.root.setEulerAngles(0, Math.atan2(dx, -dz) * 180 / Math.PI, 0);
    }

    if (closest < (world.driving ? 3.4 : 2.3)) {
      state.arrestProgress += dt;
      state.escapeProgress = 0;
      if (world.driving && policeDamageCooldown <= 0) {
        policeDamageCooldown = 1.2;
        state.vehicleHealth = clamp(state.vehicleHealth - 8, 0, 100);
        state.health = clamp(state.health - 3, 0, state.maxHealth);
      }
      if (state.arrestProgress > (world.driving ? 5.5 : 3.0)) arrest();
    } else {
      state.arrestProgress = Math.max(0, state.arrestProgress - dt * 1.5);
      if (closest > 17) state.escapeProgress += dt;
      else state.escapeProgress = Math.max(0, state.escapeProgress - dt * .6);

      if (state.escapeProgress >= 12) {
        state.escapeProgress = 0;
        state.wanted = Math.max(0, state.wanted - 1);
        if (state.wanted === 0) {
          state.policeEscapes += 1;
          toast('ESCAPED POLICE — wanted cleared', 2600);
          addXp(140, 'streetwise');
          unlockAchievement('escape', 'Clean Getaway', 'You escaped a police search.');
        } else toast(`Wanted reduced to ${state.wanted}`);
      }
    }
  }

  // ---------------------------------------------------------------------
  // Weather
  // ---------------------------------------------------------------------
  const weatherCycle = ['clear','clear','cloudy','rain','clear','fog','cloudy','clear','rain','clear'];

  function applyWeather(name) {
    if (weatherApplied === name) return;
    weatherApplied = name;
    state.currentWeather = name;
    weatherOverlay.className = `weather-${name}`;
    weatherOverlay.innerHTML = name === 'rain' ? '<div class="rain-layer"></div>' : '';
    if (name === 'rain') toast('Weather changed: rain');
    if (name === 'fog') toast('Weather changed: morning fog');
  }

  function updateWeather() {
    const s = mainStats();
    const bucket = Math.floor((s.day * 24 + s.hour) / 3.5);
    if (bucket !== state.weatherBucket) {
      state.weatherBucket = bucket;
      const index = Math.abs((bucket * 7 + s.day * 3)) % weatherCycle.length;
      applyWeather(weatherCycle[index]);
    } else applyWeather(state.currentWeather || 'clear');

    const base = world.sun?.light?.intensity || 1;
    if (state.currentWeather === 'cloudy') world.sun.light.intensity = Math.min(base, .72);
    if (state.currentWeather === 'rain') world.sun.light.intensity = Math.min(base, .55);
    if (state.currentWeather === 'fog') world.sun.light.intensity = Math.min(base, .46);
  }

  // ---------------------------------------------------------------------
  // Skills, exploration, missions and achievements
  // ---------------------------------------------------------------------
  const missionDefs = [
    { id:'tour', title:'Know Your Block', description:'Visit 6 important neighbourhood locations.', progress:()=>Math.min(6,state.visited.length), goal:6, reward:180, skill:'streetwise' },
    { id:'walker', title:'On Your Feet', description:'Walk or run 500 metres.', progress:()=>Math.floor(state.distanceWalked), goal:500, reward:140, skill:'fitness' },
    { id:'driver', title:'Road Experience', description:'Drive 750 metres.', progress:()=>Math.floor(state.distanceDriven), goal:750, reward:180, skill:'driving' },
    { id:'social', title:'Known Around Here', description:'Complete 12 social interactions.', progress:()=>state.interactions, goal:12, reward:130, skill:'social' },
    { id:'health', title:'Look After Yourself', description:'Visit the clinic and train at the gym.', progress:()=>Math.min(2,(state.clinicVisits>0?1:0)+(state.gymSessions>0?1:0)), goal:2, reward:120, skill:'fitness' },
    { id:'taxi', title:'Move Around', description:'Use local taxi travel 3 times.', progress:()=>state.fastTravels, goal:3, reward:100, skill:'streetwise' },
    { id:'survive', title:'Consequences', description:'Escape a wanted search or recover after an arrest.', progress:()=>Math.min(1,state.policeEscapes+state.arrests), goal:1, reward:200, skill:'streetwise' },
    { id:'property', title:'Build Home', description:'Reach Home Upgrade Level 2.', progress:()=>state.propertyLevel, goal:2, reward:220, skill:'business' }
  ];

  function checkMissions() {
    for (const mission of missionDefs) {
      if (state.missions[mission.id]) continue;
      if (mission.progress() >= mission.goal) {
        state.missions[mission.id] = true;
        addXp(mission.reward, mission.skill);
        toast(`MISSION COMPLETE: ${mission.title} +${mission.reward} XP`, 3000);
        unlockAchievement(`mission-${mission.id}`, mission.title, mission.description);
      }
    }
  }

  function unlockAchievement(id, title, description) {
    if (state.achievements.some(a => a.id === id)) return;
    state.achievements.push({ id, title, description, day: mainStats().day });
    toast(`ACHIEVEMENT: ${title}`, 2500);
    save();
  }

  function checkAchievements() {
    if (state.distanceWalked >= 100) unlockAchievement('first-100m','First Steps','Walked 100 metres around the neighbourhood.');
    if (state.distanceDriven >= 250) unlockAchievement('first-drive','Road Ready','Drove 250 metres.');
    if (state.visited.length >= 5) unlockAchievement('explorer','Local Explorer','Visited five neighbourhood locations.');
    if (state.skills.fitness >= 240) unlockAchievement('fitness-3','Getting Fit','Reached Fitness level 3.');
    if (Object.values(state.skills).every(v => v >= 120)) unlockAchievement('all-rounder','All-Rounder','Reached level 2 in every street skill.');
    if (overallLevel() >= 5) unlockAchievement('level-5','Rising Local','Reached Street Level 5.');
  }

  function visitLocation(id) {
    if (!state.visited.includes(id)) {
      state.visited.push(id);
      state.daily.visits += 1;
      addXp(18, 'streetwise');
      const loc = locations.find(l => l.id === id);
      if (loc) toast(`DISCOVERED: ${loc.name}`);
    }
  }

  function updateMovementProgress() {
    const currentFoot = player.getPosition();
    const footDelta = Math.hypot(currentFoot.x-lastFootPosition.x,currentFoot.z-lastFootPosition.z);
    if (!world.driving && footDelta < 3) {
      state.distanceWalked += footDelta;
      state.daily.walk += footDelta;
      if (footDelta > .01) addXp(footDelta * .045, 'fitness');
    }
    lastFootPosition = currentFoot.clone();

    const currentVehicle = world.vehicle.getPosition();
    const vehicleDelta = Math.hypot(currentVehicle.x-lastVehiclePosition.x,currentVehicle.z-lastVehiclePosition.z);
    if (world.driving && vehicleDelta < 8) {
      state.distanceDriven += vehicleDelta;
      if (vehicleDelta > .01) addXp(vehicleDelta * .06, 'driving');
    }
    lastVehiclePosition = currentVehicle.clone();
  }

  // ---------------------------------------------------------------------
  // Extra location interactions
  // ---------------------------------------------------------------------
  function distanceTo(x,z) {
    const p = player.getPosition();
    return Math.hypot(p.x-x,p.z-z);
  }

  function useLocation(loc) {
    visitLocation(loc.id);
    state.interactions += 1;
    addXp(8, 'social');
    if (loc.type === 'clinic') {
      state.clinicVisits += 1;
      state.health = state.maxHealth;
      toast('Clinic: health restored to 100');
      addXp(30, 'fitness');
    } else if (loc.type === 'gym') {
      const day = mainStats().day;
      const key = `gym-${day}`;
      if (state.missions[key]) return toast('You already trained today');
      state.missions[key] = true;
      state.gymSessions += 1;
      state.health = clamp(state.health + 10,0,state.maxHealth);
      addXp(75,'fitness');
      toast('Gym session complete: +Fitness XP');
    } else if (loc.type === 'mechanic') {
      if (!world.vehicleOwned) return toast('You do not own a vehicle yet');
      state.mechanicVisits += 1;
      state.vehicleHealth = 100;
      addXp(25,'driving');
      toast('Mechanic: vehicle restored to 100%');
    } else if (loc.type === 'police') {
      if (state.wanted > 0) return toast('You cannot casually visit while wanted');
      addXp(15,'streetwise');
      toast('Community desk: stay safe and keep HEAT low');
    } else if (loc.type === 'park') {
      const day = mainStats().day;
      const key = `park-${day}`;
      if (!state.missions[key]) {
        state.missions[key] = true;
        state.health = clamp(state.health + 6,0,state.maxHealth);
        addXp(35,'social');
        toast('You spent time in the community park');
      } else toast('A quiet place to reset');
    } else if (loc.type === 'taxi') {
      openTaxi();
    }
    checkMissions(); save();
  }

  function nearestAdvancedLocation() {
    if (world.driving || insideBuilding || window.StreetHustleUIBlocking || window.StreetHustleAdvancedBlocking) return null;
    let best = null, bestD = Infinity;
    for (const loc of locations.slice(0, 6)) {
      const d = distanceTo(loc.x,loc.z);
      if (d < 2.3 && d < bestD) { best = loc; bestD = d; }
    }
    return best;
  }

  function handleAdvancedInteract(event) {
    const loc = nearestAdvancedLocation();
    if (!loc) {
      // Count social interactions near ambient pedestrians.
      for (const name of ['Lebo','Musa','Nandi','Bongani','Amahle','Sizwe']) {
        const npc = app.root.findByName(`AmbientNPC_${name}`);
        if (npc?.enabled) {
          const p = npc.getPosition();
          if (distanceTo(p.x,p.z) < 2.1) {
            event.stopImmediatePropagation();
            state.interactions += 1;
            addXp(18,'social');
            toast(`${name}: “Sharp, how are you?”`);
            checkMissions(); save(); return;
          }
        }
      }
      return;
    }
    event.stopImmediatePropagation();
    useLocation(loc);
  }

  window.addEventListener('street-hustle-interact', handleAdvancedInteract, true);

  // ---------------------------------------------------------------------
  // Taxi travel
  // ---------------------------------------------------------------------
  const taxiDestinations = [
    ['Home',-8.5,14.5],
    ['Corner Shop',8.5,-18.0],
    ['Clinic',-26.0,29.0],
    ['Gym',26.0,29.0],
    ['Car Wash',-12.0,-25.0],
    ['Construction',21.5,5.0],
    ['Community Park',-22.0,0.0]
  ];

  function renderTaxi() {
    taxiContent.innerHTML = taxiDestinations.map(([name,x,z]) => `<button class="taxi-destination" data-x="${x}" data-z="${z}" data-name="${name}">${name}<small>Local route</small></button>`).join('');
  }

  function openTaxi() {
    if (distanceTo(7,-29) > 3.5 && !taxiOpen) return toast('Go to the taxi rank to travel');
    tasksOpen = false; tasksPanel.classList.remove('visible');
    taxiOpen = true; taxiPanel.classList.add('visible'); renderTaxi(); setBlocking();
  }

  function closeTaxi() { taxiOpen = false; taxiPanel.classList.remove('visible'); setBlocking(); }

  taxiContent.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-x]'); if (!btn) return;
    closeTaxi();
    fade.classList.add('visible');
    setTimeout(() => {
      if (world.driving) world.exitVehicle();
      world.teleport(Number(btn.dataset.x),Number(btn.dataset.z));
      state.fastTravels += 1; state.daily.taxi += 1; addXp(25,'streetwise');
      fade.classList.remove('visible'); toast(`Taxi: arrived at ${btn.dataset.name}`); checkMissions(); save();
    },500);
  });

  $('taxi-close')?.addEventListener('click', closeTaxi);
  taxiButton?.addEventListener('click', openTaxi);

  // ---------------------------------------------------------------------
  // Mission / achievement panel
  // ---------------------------------------------------------------------
  function gameStatus() {
    const s = mainStats();
    const wealth = s.cash+s.bank;
    if (state.wanted >= 3) return 'Under Pressure';
    if (wealth >= 3000 && s.rep >= 7) return 'Established';
    if (wealth >= 1000 && s.rep >= 5) return 'Rising Hero';
    if (wealth >= 250) return 'Local Hustler';
    return 'Starting Out';
  }

  function renderTasks() {
    const skillRows = Object.keys(state.skills).map(id => `<div class="skill-row"><span>${id.toUpperCase()}</span><strong>LV ${skillLevel(id)}</strong><div><i style="width:${((state.skills[id]%120)/120)*100}%"></i></div></div>`).join('');
    const missionRows = missionDefs.map(m => {
      const done = Boolean(state.missions[m.id]);
      const progress = Math.min(m.goal,m.progress());
      return `<div class="mission-card ${done?'done':''}"><div><strong>${done?'✓ ':''}${m.title}</strong><small>${m.description}</small></div><span>${progress}/${m.goal}</span></div>`;
    }).join('');
    const achRows = state.achievements.length ? state.achievements.slice().reverse().map(a=>`<div class="achievement-row"><span>🏆</span><div><strong>${a.title}</strong><small>${a.description}</small></div></div>`).join('') : '<p class="adv-empty">No achievements yet.</p>';
    tasksContent.innerHTML = `
      <div class="progress-summary"><div><small>STATUS</small><strong>${gameStatus()}</strong></div><div><small>LEVEL</small><strong>${overallLevel()}</strong></div><div><small>HOME</small><strong>LV ${state.propertyLevel}</strong></div><div><small>CAR</small><strong>${state.vehicleHealth}%</strong></div></div>
      <h3>Street Skills</h3>${skillRows}
      <h3>Missions</h3>${missionRows}
      <h3>Achievements</h3>${achRows}`;
  }

  function openTasks() { taxiOpen=false; taxiPanel.classList.remove('visible'); tasksOpen=true; tasksPanel.classList.add('visible'); renderTasks(); setBlocking(); }
  function closeTasks() { tasksOpen=false; tasksPanel.classList.remove('visible'); setBlocking(); }
  tasksButton?.addEventListener('click',()=>tasksOpen?closeTasks():openTasks());
  $('tasks-close')?.addEventListener('click',closeTasks);

  window.addEventListener('keydown',(event)=>{
    const key=event.key.toLowerCase();
    if (key==='j'&&!event.repeat) tasksOpen?closeTasks():openTasks();
    if (key==='t'&&!event.repeat) openTaxi();
  });

  // ---------------------------------------------------------------------
  // Random neighbourhood events
  // ---------------------------------------------------------------------
  const eventDefs = [
    {
      title:'Neighbour Needs a Hand',
      text:'A neighbour is moving a table and asks for help.',
      actions:[
        ['Help for a few minutes',()=>{addXp(45,'social');addXp(20,'fitness');toast('Community trust grows');}],
        ['Keep moving',()=>{addXp(8,'streetwise');}]
      ]
    },
    {
      title:'Community Football',
      text:'A quick five-a-side game is starting in the open space.',
      actions:[
        ['Join the game',()=>{addXp(60,'fitness');state.health=clamp(state.health+5,0,state.maxHealth);}],
        ['Watch for a while',()=>{addXp(20,'social');}]
      ]
    },
    {
      title:'Power Outage',
      text:'The block suddenly goes dark for a while. People gather outside and share information.',
      actions:[
        ['Help check on neighbours',()=>{addXp(55,'social');addXp(20,'streetwise');}],
        ['Wait it out',()=>{addXp(10,'streetwise');}]
      ]
    },
    {
      title:'Lost Wallet',
      text:'You notice a wallet near the pavement with an ID card inside.',
      actions:[
        ['Return it to the owner',()=>{addXp(70,'social');unlockAchievement('wallet-return','Good Name','Returned a lost wallet to its owner.');}],
        ['Leave it where it is',()=>{addXp(12,'streetwise');}]
      ]
    },
    {
      title:'Taxi Rank Confusion',
      text:'A visitor asks which local taxi route gets them closest to the clinic.',
      actions:[
        ['Give directions',()=>{addXp(35,'social');addXp(25,'streetwise');}],
        ['Say you are not sure',()=>{addXp(5,'social');}]
      ]
    },
    {
      title:'Rain Starts Suddenly',
      text:'Heavy rain catches people walking home. A few neighbours shelter under a shop awning.',
      actions:[
        ['Wait and chat',()=>{addXp(35,'social');}],
        ['Run home',()=>{addXp(30,'fitness');}]
      ]
    }
  ];

  function showWorldEvent(def) {
    if (currentEvent || tasksOpen || taxiOpen || window.StreetHustleUIBlocking) return;
    currentEvent=def;
    $('event-title').textContent=def.title;
    $('event-text').textContent=def.text;
    const actions=$('event-actions'); actions.innerHTML='';
    for (const [label,fn] of def.actions) {
      const b=document.createElement('button'); b.textContent=label;
      b.addEventListener('click',()=>{fn();state.eventHistory.push({title:def.title,day:mainStats().day});state.eventHistory=state.eventHistory.slice(-20);closeWorldEvent();checkMissions();save();});
      actions.appendChild(b);
    }
    eventPanel.classList.add('visible'); setBlocking();
  }

  function closeWorldEvent() { currentEvent=null; eventPanel.classList.remove('visible'); setBlocking(); }

  function maybeWorldEvent(dt) {
    randomEventCooldown -= dt;
    if (randomEventCooldown>0||insideBuilding||state.wanted>0||window.StreetHustleUIBlocking||window.StreetHustleAdvancedBlocking) return;
    randomEventCooldown=90+Math.random()*80;
    const s=mainStats();
    const bucket=s.day*10+Math.floor(s.hour/2);
    if (bucket===state.lastEventBucket) return;
    state.lastEventBucket=bucket;
    const def=eventDefs[Math.abs(bucket*7+s.day*3)%eventDefs.length];
    showWorldEvent(def);
  }

  // ---------------------------------------------------------------------
  // Daily reset / location discovery
  // ---------------------------------------------------------------------
  function updateDaily() {
    const day=mainStats().day;
    if (state.dailyMarker===day) return;
    state.dailyMarker=day;
    state.daily={walk:0,visits:0,taxi:0};
    toast(`DAY ${day}: new daily exploration progress`);
  }

  function discoverNearby() {
    if (insideBuilding) return;
    for (const loc of locations) if (distanceTo(loc.x,loc.z)<3.5) visitLocation(loc.id);
  }

  window.addEventListener('street-hustle-location',(event)=>{
    insideBuilding=Boolean(event.detail?.inside);
  });

  // ---------------------------------------------------------------------
  // Main update
  // ---------------------------------------------------------------------
  app.on('update',(dt)=>{
    if (collisionCooldown>0) collisionCooldown-=dt;
    if (policeDamageCooldown>0) policeDamageCooldown-=dt;
    saveAccumulator+=dt;

    updateDaily();
    updateWantedFromHeat();
    updateWeather();
    updateHazardCars(dt);
    updatePolice(dt);
    updateMovementProgress();
    updateProperty();
    discoverNearby();
    maybeWorldEvent(dt);
    checkMissions();
    checkAchievements();

    // Slow passive recovery when safe.
    if (state.wanted===0&&state.health<state.maxHealth&&!insideBuilding) state.health=clamp(state.health+dt*.08,0,state.maxHealth);

    locationPrompt=nearestAdvancedLocation();
    if (locationPrompt) {
      advancedPrompt.textContent=`${locationPrompt.name.toUpperCase()} · E ${locationPrompt.action}`;
      advancedPrompt.classList.add('visible');
    } else advancedPrompt.classList.remove('visible');

    taxiButton.classList.toggle('available',distanceTo(7,-29)<4&&!world.driving&&!insideBuilding);
    updateAdvancedHud();
    if (tasksOpen) renderTasks();
    if (saveAccumulator>5) {saveAccumulator=0;save();}
  });

  window.addEventListener('beforeunload',save);
  updateProperty();
  applyWeather(state.currentWeather||'clear');
  updateAdvancedHud();
  checkMissions();
  checkAchievements();
  save();
  setTimeout(()=>toast('BIG SYSTEMS PACK ACTIVE · J Tasks · T Taxi',2800),1100);
}
