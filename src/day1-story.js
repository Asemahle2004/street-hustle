import * as pc from 'playcanvas';

// STREET HUSTLE — PLAYABLE ALPHA
// This is the full prototype life-simulation layer. The city content is still
// small, but the major game systems are wired so they can be expanded without
// rewriting the project: story, jobs, shops, relationships, heat, businesses,
// banking, vehicles, day/night, autosave, character framework, and the first
// Zero -> Hero -> Zero -> Hero arc.

const world = window.StreetHustleWorld;
const app = world?.app;
const player = world?.player;

if (!world || !app || !player) {
  console.error('Street Hustle alpha could not start: world core is missing.');
} else {
  const $ = (id) => document.getElementById(id);
  const ui = {
    character: $('character-name'), day: $('day'), clock: $('clock'), cash: $('cash'), bank: $('bank'),
    rep: $('rep'), heat: $('heat'), energy: $('energy'), objective: $('objective'), interaction: $('interaction'),
    save: $('save-status'), toast: $('toast'), dialogue: $('dialogue'), speaker: $('dialogue-speaker'),
    dialogueText: $('dialogue-text'), dialogueActions: $('dialogue-actions'), dialogueClose: $('dialogue-close'),
    phone: $('phone'), phoneTime: $('phone-time'), phoneTabs: $('phone-tabs'), phoneContent: $('phone-content'),
    phoneClose: $('phone-close'), phoneButton: $('phone-button')
  };

  const SAVE_KEY = 'streetHustle.alpha.v3';
  const OLD_SAVE_KEY = 'streetHustle.day1.v1';
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const money = (n) => `R${Math.max(0, Math.floor(Number(n) || 0)).toLocaleString('en-ZA')}`;

  const characters = {
    sbu: { name: 'Sbu', age: 19, description: 'Starting from R0 and trying to support home.' },
    zinhle: { name: 'Zinhle', age: 20, description: 'Ambitious, practical and business-minded.' },
    kabelo: { name: 'Kabelo', age: 22, description: 'A hustler balancing work, sport and responsibility.' }
  };

  const businessCatalog = {
    streetStall: { name: 'Street Stall', cost: 250, rep: 2, daily: 60, description: 'Small local trading business.' },
    carWashShare: { name: 'Car Wash Share', cost: 700, rep: 4, daily: 150, description: 'Buy into Sipho’s growing car-wash operation.' },
    deliveryBusiness: { name: 'Delivery Hustle', cost: 1200, rep: 6, daily: 280, description: 'Run local parcel deliveries and pay helpers.' }
  };

  const shopCatalog = {
    bread: { name: 'Bread', cost: 25 }, meal: { name: 'Meal', cost: 30 }, water: { name: 'Water', cost: 12 },
    airtime: { name: 'Airtime', cost: 20 }, outfit: { name: 'Basic Outfit', cost: 150 }
  };

  function defaultState() {
    return {
      version: 3,
      currentCharacter: 'sbu', unlockedCharacters: ['sbu'],
      day: 1, minutes: 540,
      cash: 0, bank: 0, reputation: 0, heat: 0, energy: 100, wellbeing: 78, family: 50,
      inventory: { bread: 0, meal: 0, water: 0, airtime: 0, outfit: 0, parcel: 0 },
      relationships: { Ma: 55, Sipho: 20, Ayanda: 20, Shopkeeper: 15, Vusi: 5, Thando: 10 },
      jobsToday: {}, totalJobs: {}, legitimateJobs: 0, riskChoices: 0,
      businesses: {
        streetStall: { owned: false, active: false },
        carWashShare: { owned: false, active: false },
        deliveryBusiness: { owned: false, active: false }
      },
      assets: { vehicleOwned: false },
      story: {
        introTalked: false, breadBought: false, breadReturned: false, day1Complete: false,
        stableWork: false, businessStarted: false, heroReached: false, downfall: false, rebuilt: false,
        deliveryAccepted: false, policeToday: false
      },
      messages: [
        { from: 'System', text: 'Welcome to Street Hustle. Your choices affect money, reputation, heat, family and your future.' }
      ],
      playerPosition: { x: 0, z: 25 },
      vehiclePosition: { x: 18, z: -12 }
    };
  }

  function deepMerge(base, saved) {
    if (!saved || typeof saved !== 'object') return base;
    const out = { ...base, ...saved };
    for (const key of ['inventory', 'relationships', 'jobsToday', 'totalJobs', 'businesses', 'assets', 'story', 'playerPosition', 'vehiclePosition']) {
      if (base[key] && typeof base[key] === 'object') {
        out[key] = { ...base[key], ...(saved[key] || {}) };
        if (key === 'businesses') {
          for (const id of Object.keys(base.businesses)) out.businesses[id] = { ...base.businesses[id], ...(saved.businesses?.[id] || {}) };
        }
      }
    }
    return out;
  }

  function migrateOldSave(base) {
    try {
      const raw = localStorage.getItem(OLD_SAVE_KEY);
      if (!raw) return base;
      const old = JSON.parse(raw);
      base.cash = Number(old.cash) || 0;
      base.reputation = Number(old.reputation) || 0;
      base.heat = Number(old.heat) || 0;
      base.story.introTalked = Boolean(old.introTalked);
      base.story.breadBought = Boolean(old.breadBought);
      base.story.breadReturned = Boolean(old.breadReturned);
      base.story.day1Complete = Boolean(old.day1Complete);
      base.inventory.bread = old.inventory?.bread ? 1 : 0;
      base.inventory.parcel = old.inventory?.parcel ? 1 : 0;
      base.story.deliveryAccepted = Boolean(old.deliveryAccepted);
      base.playerPosition = { x: Number(old.playerPosition?.x) || 0, z: Number(old.playerPosition?.z) || 25 };
      if (old.jobs) {
        for (const [id, done] of Object.entries(old.jobs)) if (done) base.totalJobs[id] = 1;
      }
      return base;
    } catch { return base; }
  }

  function loadState() {
    const base = defaultState();
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return deepMerge(base, JSON.parse(raw));
    } catch (error) { console.warn('Street Hustle save read failed.', error); }
    return migrateOldSave(base);
  }

  const state = loadState();
  let activeInteractable = null;
  let dialogueOpen = false;
  let phoneOpen = false;
  let activePhoneTab = 'home';
  let autosaveAccumulator = 0;
  let clockAccumulator = 0;
  let toastTimer = null;
  let saveTimer = null;

  player.setPosition(Number(state.playerPosition.x) || 0, 0, Number(state.playerPosition.z) || 25);
  world.vehicle.setPosition(Number(state.vehiclePosition.x) || 18, 0, Number(state.vehiclePosition.z) || -12);
  world.setVehicleAvailable(Boolean(state.assets.vehicleOwned));

  // --- Visual helpers ------------------------------------------------------
  const makeMaterial = (r, g, b, gloss = 0.18) => {
    const m = new pc.StandardMaterial(); m.diffuse = new pc.Color(r, g, b); m.gloss = gloss; m.update(); return m;
  };
  const mat = {
    skinA: makeMaterial(.34,.19,.12), skinB: makeMaterial(.24,.12,.07), trousers: makeMaterial(.08,.09,.11),
    ma: makeMaterial(.50,.12,.32), sipho: makeMaterial(.08,.32,.62), ayanda: makeMaterial(.72,.42,.08),
    vusi: makeMaterial(.18,.18,.19), shop: makeMaterial(.10,.46,.23), thando: makeMaterial(.50,.20,.08),
    good: makeMaterial(.10,.66,.26,.35), risk: makeMaterial(.76,.07,.05,.35), blue: makeMaterial(.12,.40,.82,.35),
    gold: makeMaterial(.94,.62,.06,.35), parcel: makeMaterial(.45,.27,.09)
  };
  function primitive(name, type, x, y, z, sx, sy, sz, material, parent = app.root) {
    const e = new pc.Entity(name); e.addComponent('model', { type }); e.setPosition(x,y,z); e.setLocalScale(sx,sy,sz); e.model.material = material; parent.addChild(e); return e;
  }
  function createNpc(name, x, z, shirt, skin = mat.skinA) {
    const root = new pc.Entity(`NPC_${name}`); root.setPosition(x,0,z); app.root.addChild(root);
    primitive(`${name}_Body`,'box',0,1.5,0,.82,1.5,.48,shirt,root);
    primitive(`${name}_Head`,'sphere',0,2.55,0,.66,.66,.66,skin,root);
    primitive(`${name}_LegL`,'box',-.22,.47,0,.26,.94,.29,mat.trousers,root);
    primitive(`${name}_LegR`,'box',.22,.47,0,.26,.94,.29,mat.trousers,root);
    return root;
  }
  createNpc('Ma', -8.3, 18, mat.ma, mat.skinB);
  createNpc('Sipho', -11.5, -25, mat.sipho);
  createNpc('Ayanda', 6.6, -29, mat.ayanda, mat.skinB);
  createNpc('Vusi', 27, 26.5, mat.vusi);
  createNpc('Shopkeeper', 8.6, -23, mat.shop);
  createNpc('Thando', 24, 3.5, mat.thando, mat.skinB);
  primitive('CratesJobMarker','cylinder',8.3,.17,-19,1.0,.22,1.0,mat.good);
  primitive('DeliveryMarker','cylinder',-8.2,.17,4,1.0,.22,1.0,mat.blue);
  primitive('ConstructionMarker','cylinder',24,.17,6.5,1.0,.22,1.0,mat.gold);
  primitive('RiskMarker','cylinder',27,.17,23.8,1.0,.22,1.0,mat.risk);
  const parcelVisual = primitive('ParcelVisual','box',.55,1.45,.25,.38,.38,.38,mat.parcel,player);

  // --- Core state helpers --------------------------------------------------
  function formatClock() {
    const mins = Math.floor(state.minutes) % 1440;
    const h = Math.floor(mins / 60); const m = mins % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }
  function hour() { return (state.minutes % 1440) / 60; }
  function netWorth() {
    let value = state.cash + state.bank + (state.assets.vehicleOwned ? 650 : 0);
    for (const [id, b] of Object.entries(state.businesses)) if (b.owned) value += Math.round(businessCatalog[id].cost * .75);
    return value;
  }
  function addMessage(from, text) {
    state.messages.unshift({ from, text }); state.messages = state.messages.slice(0, 12);
  }
  function relationship(name, delta) { state.relationships[name] = clamp((state.relationships[name] || 0) + delta, 0, 100); }
  function itemCount() { return Object.values(state.inventory).reduce((a,b) => a + (Number(b) || 0), 0); }
  function addItem(id, count = 1) { state.inventory[id] = Math.max(0, (state.inventory[id] || 0) + count); }
  function addJobCount(id) { state.totalJobs[id] = (state.totalJobs[id] || 0) + 1; }
  function legitimateJobsToday() {
    return ['carWash','stableShift','crates','delivery','construction','football'].filter((id) => state.jobsToday[id]).length;
  }
  function reward(amount, rep = 0, heat = 0) {
    state.cash += amount; state.reputation = Math.max(-10, state.reputation + rep); state.heat = clamp(state.heat + heat, 0, 10);
  }
  function spend(amount) {
    if (state.cash < amount) return false; state.cash -= amount; return true;
  }
  function advanceTime(minutes, energyCost = 0) {
    state.minutes += minutes; state.energy = clamp(state.energy - energyCost, 0, 100);
    while (state.minutes >= 1440) { state.minutes -= 1440; startNewDay(false); }
  }

  function flashSave() {
    ui.save?.classList.add('visible'); clearTimeout(saveTimer); saveTimer = setTimeout(() => ui.save?.classList.remove('visible'), 850);
  }
  function toast(text) {
    if (!ui.toast) return; ui.toast.textContent = text; ui.toast.classList.add('visible'); clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui.toast.classList.remove('visible'), 1800);
  }
  function saveState(show = true) {
    try {
      const p = player.getPosition(); const v = world.vehicle.getPosition();
      state.playerPosition = { x: p.x, z: p.z }; state.vehiclePosition = { x: v.x, z: v.z };
      localStorage.setItem(SAVE_KEY, JSON.stringify(state)); if (show) flashSave();
    } catch (error) { console.warn('Street Hustle autosave failed.', error); }
  }

  // --- Story progression --------------------------------------------------
  function currentObjective() {
    if (!state.story.introTalked) return 'OBJECTIVE: Talk to Ma at home';
    if (!state.story.breadReturned) {
      if (!state.story.breadBought) return state.cash < 25 ? 'OBJECTIVE: Earn R25 for bread' : 'OBJECTIVE: Buy bread at the Corner Shop';
      return 'OBJECTIVE: Take the bread home to Ma';
    }
    if (state.day === 1) return 'OBJECTIVE: Go home and sleep when you are ready for Day 2';
    if (state.day === 2 && !state.story.stableWork) return `OBJECTIVE: Complete 2 legitimate jobs (${legitimateJobsToday()}/2), then talk to Sipho`;
    if (state.day === 2) return 'OBJECTIVE: Stable work unlocked. Sleep to continue';
    if (state.day >= 3 && !state.story.businessStarted) return 'OBJECTIVE: Build R250 + REP 2 and start a Street Stall in Phone > Business';
    if (state.story.downfall && !state.story.rebuilt) return `REBUILD: Net worth ${money(netWorth())}/R600 and keep HEAT at 2 or lower`;
    if (!state.story.heroReached) return `OBJECTIVE: Grow net worth to R1,000 (${money(netWorth())})`;
    if (state.story.heroReached && !state.story.downfall) return 'OBJECTIVE: Protect what you built. Heat and risky choices can destroy progress.';
    if (state.story.rebuilt) return 'ALPHA ARC COMPLETE: You rose, fell and rebuilt. Keep expanding your life.';
    return 'Explore Street Hustle';
  }

  function checkMilestones() {
    if (!state.story.heroReached && netWorth() >= 1000 && state.reputation >= 5) {
      state.story.heroReached = true; state.reputation += 3; state.unlockedCharacters = [...new Set([...state.unlockedCharacters,'zinhle'])];
      addMessage('Street Hustle', 'HERO milestone reached. Zinhle is now available in Profile. Protect what you built.');
      toast('HERO MILESTONE — Net worth R1,000');
    }
    if (state.story.downfall && !state.story.rebuilt && netWorth() >= 600 && state.heat <= 2 && (state.story.stableWork || Object.values(state.businesses).some((b) => b.active))) {
      state.story.rebuilt = true; state.reputation += 5; state.unlockedCharacters = [...new Set([...state.unlockedCharacters,'kabelo'])];
      addMessage('Street Hustle', 'You rebuilt after losing progress. Kabelo is now unlocked.');
      toast('REBUILT — ZERO TO HERO AGAIN');
    }
  }

  function businessIncome() {
    let gross = 0;
    for (const [id,b] of Object.entries(state.businesses)) if (b.owned && b.active) gross += businessCatalog[id].daily;
    if (!gross) return 0;
    const expenses = Math.round(gross * .18); const profit = gross - expenses; state.bank += profit;
    addMessage('Business', `Daily businesses: ${money(gross)} income - ${money(expenses)} expenses = ${money(profit)} to bank.`);
    return profit;
  }

  function policeConsequence() {
    if (state.heat < 5) return null;
    const loss = Math.min(state.cash, state.heat >= 8 ? 180 : 80);
    state.cash -= loss; state.heat = Math.max(0, state.heat - 2); state.reputation -= 1; state.wellbeing = clamp(state.wellbeing - 7,0,100);
    state.story.policeToday = true;
    addMessage('Consequence', `High HEAT cost you time and ${money(loss)}. Heat dropped, but reputation suffered.`);
    return `Your high HEAT caught up with you. You lost ${money(loss)} and some reputation.`;
  }

  function triggerDownfallIfNeeded() {
    if (!state.story.heroReached || state.story.downfall) return null;
    const risky = state.heat >= 4 || state.riskChoices >= 2;
    if (state.day < 5 && !risky) return null;
    if (!risky && state.day < 7) return null;

    state.story.downfall = true;
    const before = state.cash;
    if (risky) {
      state.cash = Math.floor(state.cash * .35); state.bank = Math.floor(state.bank * .72); state.heat = Math.max(2, state.heat - 2); state.reputation -= 3;
      for (const b of Object.values(state.businesses)) if (b.owned) b.active = false;
      addMessage('Life Event', 'Risk, attention and poor choices caused a major setback. Businesses stopped and much of your cash disappeared.');
      return `DOWNFALL: Your risky choices caught up with you. Cash fell from ${money(before)} to ${money(state.cash)} and your businesses stopped.`;
    }
    state.cash = Math.floor(state.cash * .55); state.bank = Math.floor(state.bank * .82); state.wellbeing = clamp(state.wellbeing - 12,0,100);
    if (state.businesses.streetStall.owned) state.businesses.streetStall.active = false;
    addMessage('Life Event', 'A market shock hit your progress. You lost money and must adapt, even without criminal heat.');
    return `SETBACK: A market shock hit your progress. You still have choices — rebuild smarter.`;
  }

  function startNewDay(fromSleep = true) {
    const income = businessIncome();
    state.day += 1; state.minutes = 450; state.energy = 100; state.jobsToday = {}; state.story.policeToday = false;
    state.heat = Math.max(0, state.heat - 1);
    state.wellbeing = clamp(state.wellbeing + 5,0,100);
    const police = policeConsequence(); const downfall = triggerDownfallIfNeeded();
    if (fromSleep) {
      const notes = [`Day ${state.day} begins.`]; if (income) notes.push(`${money(income)} business profit went to your bank.`); if (police) notes.push(police); if (downfall) notes.push(downfall);
      showDialogue('New Day', notes.join(' '));
    }
    checkMilestones(); updateAll(); saveState();
  }

  // --- Dialogue -----------------------------------------------------------
  function setModalState() {
    window.StreetHustleUIBlocking = dialogueOpen || phoneOpen;
    document.body.classList.toggle('modal-open', Boolean(window.StreetHustleUIBlocking));
  }
  function closeDialogue() { dialogueOpen = false; ui.dialogue?.classList.remove('visible'); ui.dialogueActions.innerHTML = ''; setModalState(); }
  function showDialogue(speaker, text, actions = []) {
    if (phoneOpen) closePhone(); dialogueOpen = true; ui.speaker.textContent = speaker; ui.dialogueText.textContent = text; ui.dialogueActions.innerHTML = '';
    for (const action of actions) {
      const btn = document.createElement('button'); btn.textContent = action.label; if (action.className) btn.className = action.className;
      btn.addEventListener('click', () => { closeDialogue(); action.action?.(); }); ui.dialogueActions.appendChild(btn);
    }
    ui.dialogueClose.textContent = actions.length ? 'Not now' : 'Continue'; ui.dialogue.classList.add('visible'); setModalState();
  }
  ui.dialogueClose?.addEventListener('click', closeDialogue);

  // --- Phone --------------------------------------------------------------
  function closePhone() { phoneOpen = false; ui.phone?.classList.remove('visible'); setModalState(); }
  function openPhone(tab = activePhoneTab) { if (dialogueOpen) closeDialogue(); activePhoneTab = tab; phoneOpen = true; ui.phone?.classList.add('visible'); renderPhone(); setModalState(); }
  function togglePhone() { phoneOpen ? closePhone() : openPhone(); }
  ui.phoneClose?.addEventListener('click', closePhone); ui.phoneButton?.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); togglePhone(); });
  window.addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'p' && !e.repeat) togglePhone(); });
  ui.phoneTabs?.addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (!b) return; activePhoneTab = b.dataset.tab; renderPhone(); });

  function card(title, body, button = '') { return `<div class="phone-card"><h3>${title}</h3>${body}${button}</div>`; }
  function renderPhone() {
    ui.phoneTime.textContent = formatClock();
    for (const b of ui.phoneTabs.querySelectorAll('[data-tab]')) b.classList.toggle('active', b.dataset.tab === activePhoneTab);
    const c = ui.phoneContent;
    if (activePhoneTab === 'home') {
      c.innerHTML = card('Current objective', `<p>${currentObjective()}</p><p><span class="badge good">Day ${state.day}</span> <span class="badge">${formatClock()}</span></p>`) +
        card('Life balance', `<p>Wellbeing: ${Math.round(state.wellbeing)}/100</p><div class="meter"><span style="width:${state.wellbeing}%"></span></div><p>Family: ${Math.round(state.family)}/100</p><div class="meter"><span style="width:${state.family}%"></span></div>`) +
        card('Messages', state.messages.length ? state.messages.slice(0,6).map((m) => `<p><strong>${m.from}:</strong> ${m.text}</p>`).join('') : '<div class="empty-state">No messages</div>');
    } else if (activePhoneTab === 'jobs') {
      const jobs = [
        ['carWash','Car wash','R30 +1 REP','At car wash'], ['stableShift','Stable car-wash shift','R55 +2 REP',state.story.stableWork?'Unlocked':'Unlock on Day 2'],
        ['crates','Carry shop crates','R20 +1 REP','Corner Shop'], ['delivery','Parcel delivery','R35 +2 REP','Talk to Ayanda'],
        ['construction','Construction helper','R80 +2 REP','REP 1 required'], ['football','Football challenge','R45 +1 REP','Near Home 03'],
        ['risky','Risky quick cash','R60 -1 REP +2 HEAT','Talk to Vusi']
      ];
      c.innerHTML = jobs.map(([id,name,pay,note]) => card(name, `<p>${pay}</p><small>${note}</small><p>${state.jobsToday[id] ? '<span class="badge good">Done today</span>' : '<span class="badge">Available</span>'}</p>`)).join('');
    } else if (activePhoneTab === 'money') {
      c.innerHTML = card('Wallet', `<p>Cash: <strong>${money(state.cash)}</strong></p><p>Bank: <strong>${money(state.bank)}</strong></p><p>Net worth: <strong>${money(netWorth())}</strong></p>`, `<div class="row"><button data-action="deposit" data-amount="100">Deposit R100</button><button class="alt" data-action="withdraw" data-amount="100">Withdraw R100</button></div>`);
    } else if (activePhoneTab === 'business') {
      c.innerHTML = Object.entries(businessCatalog).map(([id,b]) => {
        const owned = state.businesses[id].owned; const active = state.businesses[id].active;
        const button = owned ? `<button data-action="toggle-business" data-id="${id}">${active?'Pause':'Restart'}</button>` : `<button data-action="buy-business" data-id="${id}" ${state.cash < b.cost || state.reputation < b.rep || state.day < 3 ? 'disabled':''}>Start for ${money(b.cost)}</button>`;
        return card(b.name, `<p>${b.description}</p><p>Daily gross: ${money(b.daily)} · REP ${b.rep} required</p><p>${owned ? `<span class="badge ${active?'good':''}">${active?'Active':'Paused'}</span>` : '<span class="badge">Not owned</span>'}</p>`, button);
      }).join('');
    } else if (activePhoneTab === 'garage') {
      c.innerHTML = card('Used Hatchback', `<p>First drivable prototype vehicle.</p><p>Price: R900 · REP 3 required</p><p>${state.assets.vehicleOwned?'<span class="badge good">Owned — parked near Home 05</span>':'<span class="badge">Not owned</span>'}</p>`, state.assets.vehicleOwned ? '' : `<button data-action="buy-vehicle" ${state.cash<900||state.reputation<3?'disabled':''}>Buy R900</button>`);
    } else if (activePhoneTab === 'bag') {
      const rows = Object.entries(state.inventory).filter(([,n]) => n>0).map(([id,n]) => `<p><strong>${shopCatalog[id]?.name || id}:</strong> ${n}</p>`).join('');
      c.innerHTML = card(`Inventory (${itemCount()})`, rows || '<div class="empty-state">Your bag is empty.</div>');
    } else if (activePhoneTab === 'people') {
      c.innerHTML = Object.entries(state.relationships).map(([name,val]) => card(name, `<p>Trust ${val}/100</p><div class="meter"><span style="width:${val}%"></span></div>`)).join('');
    } else if (activePhoneTab === 'profile') {
      c.innerHTML = card('Life profile', `<p>Current character: <strong>${characters[state.currentCharacter].name}</strong></p><p>REP ${state.reputation} · HEAT ${state.heat} · Risk choices ${state.riskChoices}</p><p>${characters[state.currentCharacter].description}</p>`) +
        card('Characters', Object.entries(characters).map(([id,ch]) => `<p class="row"><span><strong>${ch.name}</strong> · age ${ch.age}</span><button data-action="switch-character" data-id="${id}" ${state.unlockedCharacters.includes(id)?'':'disabled'}>${state.currentCharacter===id?'Active':state.unlockedCharacters.includes(id)?'Switch':'Locked'}</button></p>`).join('')) +
        card('Save / Reset', `<p>Autosave is on. Reset only if you want to start the alpha from R0.</p>`, `<div class="row"><button data-action="save-now">Save now</button><button class="warn" data-action="reset-game">Reset alpha</button></div>`);
    }
  }

  ui.phoneContent?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]'); if (!btn || btn.disabled) return;
    const action = btn.dataset.action; const id = btn.dataset.id; const amount = Number(btn.dataset.amount) || 0;
    if (action === 'deposit') {
      if (state.cash < amount) return toast('Not enough cash'); state.cash -= amount; state.bank += amount; toast(`${money(amount)} deposited`);
    } else if (action === 'withdraw') {
      if (state.bank < amount) return toast('Not enough bank balance'); state.bank -= amount; state.cash += amount; toast(`${money(amount)} withdrawn`);
    } else if (action === 'buy-business') {
      const b = businessCatalog[id]; if (!b || state.day < 3 || state.reputation < b.rep || !spend(b.cost)) return toast('Requirements not met');
      state.businesses[id].owned = true; state.businesses[id].active = true; state.story.businessStarted = true; state.reputation += 1;
      addMessage('Business', `${b.name} started. Daily profit is paid into your bank after sleep.`); toast(`${b.name} started`);
    } else if (action === 'toggle-business') {
      const b = state.businesses[id]; if (b?.owned) { b.active = !b.active; toast(b.active?'Business restarted':'Business paused'); }
    } else if (action === 'buy-vehicle') {
      if (state.reputation < 3 || !spend(900)) return toast('Need R900 and REP 3'); state.assets.vehicleOwned = true; world.setVehicleAvailable(true); toast('Used hatchback purchased');
    } else if (action === 'switch-character') {
      if (!state.unlockedCharacters.includes(id)) return; state.currentCharacter = id; toast(`${characters[id].name} selected`);
    } else if (action === 'save-now') {
      saveState(); toast('Saved');
    } else if (action === 'reset-game') {
      if (confirm('Reset Street Hustle alpha progress and start from R0?')) { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(OLD_SAVE_KEY); location.reload(); }
    }
    checkMilestones(); updateAll(); saveState(false); renderPhone();
  });

  // --- Shop ---------------------------------------------------------------
  function buyShopItem(id) {
    const item = shopCatalog[id]; if (!item) return;
    if (!spend(item.cost)) return toast(`Need ${money(item.cost)}`);
    addItem(id,1);
    if (id === 'bread') { state.story.breadBought = true; }
    if (id === 'meal') { state.energy = clamp(state.energy+30,0,100); state.wellbeing = clamp(state.wellbeing+6,0,100); }
    if (id === 'water') { state.energy = clamp(state.energy+12,0,100); }
    if (id === 'outfit') { state.reputation += 1; }
    relationship('Shopkeeper',1); advanceTime(8); toast(`${item.name} bought for ${money(item.cost)}`); updateAll(); saveState();
  }
  function openShop() {
    showDialogue('Corner Shop', `Cash ${money(state.cash)}. What do you need?`, Object.entries(shopCatalog).map(([id,item]) => ({ label:`${item.name} · ${money(item.cost)}`, action:()=>buyShopItem(id) })));
  }

  // --- Jobs ---------------------------------------------------------------
  function finishJob(id, label, pay, rep, heat = 0, minutes = 45, energy = 10, relationName = null) {
    if (state.jobsToday[id]) return toast('Already done today');
    if (state.energy < energy) return toast('Too tired — eat, drink or sleep');
    state.jobsToday[id] = true; addJobCount(id); reward(pay,rep,heat); advanceTime(minutes,energy);
    if (heat > 0) state.riskChoices += 1; else state.legitimateJobs += 1;
    if (relationName) relationship(relationName,2);
    addMessage('Work', `${label}: +${money(pay)}, ${rep>=0?'+':''}${rep} REP${heat?`, +${heat} HEAT`:''}.`);
    toast(`${label}: +${money(pay)}`); checkMilestones(); updateAll(); saveState();
  }

  // --- Day/sleep ----------------------------------------------------------
  function sleepAtHome() {
    if (!state.story.day1Complete) return showDialogue('Ma','Finish the bread objective before ending Day 1.');
    showDialogue('Home','Sleep and start the next day?', [
      { label:'Sleep', action:()=>startNewDay(true) }, { label:'Stay awake', className:'secondary', action:()=>{} }
    ]);
  }

  // --- Interactions -------------------------------------------------------
  function distTo(x,z) { const p = player.getPosition(); return Math.hypot(p.x-x,p.z-z); }
  function nearVehicle() { const p=player.getPosition(),v=world.vehicle.getPosition(); return state.assets.vehicleOwned && Math.hypot(p.x-v.x,p.z-v.z)<4.1; }

  const interactables = [
    { id:'ma', x:-8.3,z:18,r:3.0,prompt:()=>state.story.breadReturned?'MA · E Talk':state.inventory.bread>0?'MA · E Give bread':'MA · E Talk', action:()=>{
      if (!state.story.introTalked) { state.story.introTalked=true; relationship('Ma',2); showDialogue('Ma','There is no bread at home. Please make at least R25 and bring one loaf. How you make the money is your choice — but choices follow you.'); }
      else if (state.inventory.bread>0 && !state.story.breadReturned) { addItem('bread',-1); state.story.breadReturned=true; state.story.day1Complete=true; state.reputation+=2; state.family=clamp(state.family+12,0,100); relationship('Ma',6); showDialogue('Ma','Thank you. You came back with what the house needed. Money matters, but what you do with it matters too.'); }
      else showDialogue('Ma', state.story.rebuilt?'You fell and stood up again. Remember what got you here.':state.story.heroReached?'I can see things are changing for you. Do not lose yourself chasing more.':'Be careful out there. Build something that lasts.');
      updateAll(); saveState();
    }},
    { id:'home',x:-8.1,z:21.5,r:2.6,prompt:()=>state.story.day1Complete?'HOME · E Sleep / end day':'HOME · E Rest',action:sleepAtHome },
    { id:'carwash',x:-16,z:-25,r:4.1,prompt:()=>state.story.stableWork&&!state.jobsToday.stableShift?'CAR WASH · E Stable shift R55':!state.jobsToday.carWash?'CAR WASH · E Casual work R30':'CAR WASH · Done today',action:()=>{
      if (!state.story.introTalked) return showDialogue('Sipho','Talk to Ma first. Then come back if you need work.');
      if (state.story.stableWork && !state.jobsToday.stableShift) return finishJob('stableShift','Stable car-wash shift',55,2,0,70,14,'Sipho');
      if (!state.jobsToday.carWash) return finishJob('carWash','Car wash',30,1,0,45,10,'Sipho');
    }},
    { id:'sipho',x:-11.5,z:-25,r:3,prompt:()=>state.day===2&&!state.story.stableWork?'SIPHO · E Ask about stable work':'SIPHO · E Talk',action:()=>{
      if (state.day===2&&!state.story.stableWork&&legitimateJobsToday()>=2) { state.story.stableWork=true; relationship('Sipho',8); state.reputation+=2; addMessage('Sipho','Stable car-wash shifts unlocked: R55 per day when available.'); showDialogue('Sipho','You have been working properly today. I can give you a more reliable shift from now on. It is not riches, but it is a base.'); }
      else if (state.day===2&&!state.story.stableWork) showDialogue('Sipho',`Show me consistency first. Do two legitimate jobs today. You have done ${legitimateJobsToday()}/2.`);
      else showDialogue('Sipho','Reliable money is slower than shortcuts, but it gives you room to build.');
      updateAll(); saveState();
    }},
    { id:'crates',x:8.3,z:-19,r:3.0,prompt:()=>state.jobsToday.crates?'SHOP CRATES · Done today':'SHOP CRATES · E Work R20',action:()=>finishJob('crates','Carry crates',20,1,0,30,8,'Shopkeeper') },
    { id:'shopkeeper',x:8.6,z:-23,r:3.0,prompt:()=> 'CORNER SHOP · E Shop / talk',action:openShop },
    { id:'ayanda',x:6.6,z:-29,r:3.0,prompt:()=>state.story.deliveryAccepted?'AYANDA · Parcel active':'AYANDA · E Delivery work',action:()=>{
      if (state.jobsToday.delivery) return showDialogue('Ayanda','That delivery is done for today.');
      if (!state.story.deliveryAccepted) { state.story.deliveryAccepted=true; state.inventory.parcel=1; relationship('Ayanda',2); showDialogue('Ayanda','Take this parcel to the blue marker near Home 02. Payment is R35.'); updateAll(); saveState(); }
      else showDialogue('Ayanda','The parcel goes to the blue marker near Home 02.');
    }},
    { id:'delivery',x:-8.2,z:4,r:3.0,active:()=>state.story.deliveryAccepted&&!state.jobsToday.delivery,prompt:()=> 'DELIVERY · E Drop parcel',action:()=>{
      state.story.deliveryAccepted=false; state.inventory.parcel=0; finishJob('delivery','Parcel delivery',35,2,0,40,8,'Ayanda'); showDialogue('Customer','Package received. Your R35 payment has been sent.');
    }},
    { id:'construction',x:24,z:6.5,r:3.2,prompt:()=>state.jobsToday.construction?'CONSTRUCTION · Done today':state.reputation<1?'CONSTRUCTION · REP 1 required':'CONSTRUCTION · E Helper shift R80',action:()=>{
      if (state.reputation<1) return showDialogue('Thando','I need someone people can vouch for. Build at least REP 1 first.'); finishJob('construction','Construction helper',80,2,0,100,18,'Thando');
    }},
    { id:'thando',x:24,z:3.5,r:2.8,prompt:()=> 'THANDO · E Talk',action:()=>{ relationship('Thando',1); showDialogue('Thando','There is honest work here when the site is busy. Build skills and people remember you.'); saveState(false); }},
    { id:'football',x:-26,z:-12,r:3.4,prompt:()=>state.jobsToday.football?'FOOTBALL · Done today':'FOOTBALL · E Local challenge R45',action:()=>finishJob('football','Football challenge',45,1,0,55,14) },
    { id:'vusi',x:27,z:26.5,r:3.2,prompt:()=>state.jobsToday.risky?'VUSI · Nothing else today':'VUSI · E Risky quick cash R60',action:()=>{
      if (!state.story.introTalked) return showDialogue('Vusi','Handle your home situation first.');
      showDialogue('Vusi','Quick R60. You will get paid, but attention follows this kind of shortcut.',[
        {label:'Take the risk',className:'danger',action:()=>finishJob('risky','Risky quick cash',60,-1,2,35,5,'Vusi')},
        {label:'Walk away',className:'secondary',action:()=>{state.reputation+=1;relationship('Vusi',-1);toast('You walked away');updateAll();saveState();}}
      ]);
    }}
  ];

  function processInteraction() {
    if (dialogueOpen || phoneOpen) return;
    if (world.driving) { world.exitVehicle(); toast('Exited vehicle'); return; }
    if (nearVehicle()) { if (world.enterVehicle()) { toast('Driving — Esc or E to exit'); advanceTime(2); } return; }
    activeInteractable?.action?.();
  }
  window.addEventListener('street-hustle-interact', processInteraction);

  // --- HUD/update ---------------------------------------------------------
  function updateHud() {
    const ch = characters[state.currentCharacter];
    ui.character.textContent = ch.name.toUpperCase(); ui.day.textContent = `DAY ${state.day}`; ui.clock.textContent = formatClock();
    ui.cash.textContent = `CASH: ${money(state.cash)}`; ui.bank.textContent = `BANK: ${money(state.bank)}`; ui.rep.textContent = `REP: ${state.reputation}`;
    ui.heat.textContent = `HEAT: ${state.heat}`; ui.energy.textContent = `ENERGY: ${Math.round(state.energy)}`; ui.objective.textContent = currentObjective();
    if (ui.phoneTime) ui.phoneTime.textContent = formatClock(); parcelVisual.enabled = state.inventory.parcel>0;
  }
  function updateAll() { checkMilestones(); updateHud(); world.setVehicleAvailable(Boolean(state.assets.vehicleOwned)); if (phoneOpen) renderPhone(); }

  function findInteraction() {
    if (world.driving) return { prompt:'VEHICLE · E Exit' };
    if (nearVehicle()) return { prompt:'HATCHBACK · E Drive' };
    const p = player.getPosition(); let best=null,bestD=Infinity;
    for (const i of interactables) {
      if (i.active && !i.active()) continue; const d=Math.hypot(p.x-i.x,p.z-i.z); if (d<i.r&&d<bestD) { best=i;bestD=d; }
    }
    return best;
  }

  app.on('update', (dt) => {
    clockAccumulator += dt; autosaveAccumulator += dt;
    if (!dialogueOpen && !phoneOpen) {
      state.minutes += dt * 0.4;
      state.energy = clamp(state.energy - dt * 0.012, 0, 100);
      if (state.minutes >= 1440) { state.minutes -= 1440; startNewDay(false); }
    }
    world.setLighting(hour());
    activeInteractable = findInteraction();
    const prompt = activeInteractable?.prompt ? (typeof activeInteractable.prompt==='function'?activeInteractable.prompt():activeInteractable.prompt) : '';
    ui.interaction.textContent = prompt || ''; ui.interaction.classList.toggle('visible', Boolean(prompt) && !dialogueOpen && !phoneOpen);
    if (clockAccumulator >= 1) { clockAccumulator=0; updateHud(); }
    if (autosaveAccumulator >= 5) { autosaveAccumulator=0; saveState(false); }
  });

  window.addEventListener('beforeunload', () => saveState(false));
  window.addEventListener('street-hustle-driving', () => saveState(false));

  updateAll(); saveState(false);
  if (!state.story.introTalked) setTimeout(() => toast('Start by talking to Ma at home'), 700);
}
