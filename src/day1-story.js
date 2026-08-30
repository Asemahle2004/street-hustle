import * as pc from 'playcanvas';

// Street Hustle — Day 1 gameplay layer.
// Adds the first story loop, NPC interactions, job choices, consequences,
// inventory and browser autosave without requiring a server.

const app = pc.Application.getApplication('application') ?? pc.Application.getApplication();
const player = app?.root?.findByName('Player');

if (!app || !player) {
  console.warn('Street Hustle: Day 1 story could not start because the app/player was not found.');
} else {
  const cashEl = document.getElementById('cash');
  const repEl = document.getElementById('rep');
  const heatEl = document.getElementById('heat');
  const bagEl = document.getElementById('bag');
  const objectiveEl = document.getElementById('objective');
  const interactionEl = document.getElementById('interaction');
  const interactButton = document.getElementById('interact-button');
  const dialogueEl = document.getElementById('dialogue');
  const dialogueSpeakerEl = document.getElementById('dialogue-speaker');
  const dialogueTextEl = document.getElementById('dialogue-text');
  const dialogueCloseEl = document.getElementById('dialogue-close');
  const saveStatusEl = document.getElementById('save-status');

  const SAVE_KEY = 'streetHustle.day1.v1';

  const defaultState = () => ({
    cash: 0,
    reputation: 0,
    heat: 0,
    introTalked: false,
    breadBought: false,
    breadReturned: false,
    day1Complete: false,
    inventory: {
      bread: false,
      parcel: false
    },
    jobs: {
      carWash: false,
      carryCrates: false,
      delivery: false,
      riskyQuickCash: false
    },
    deliveryAccepted: false,
    playerPosition: { x: 0, y: 0, z: 25 }
  });

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultState();
      const saved = JSON.parse(raw);
      const base = defaultState();
      return {
        ...base,
        ...saved,
        inventory: { ...base.inventory, ...(saved.inventory ?? {}) },
        jobs: { ...base.jobs, ...(saved.jobs ?? {}) },
        playerPosition: { ...base.playerPosition, ...(saved.playerPosition ?? {}) }
      };
    } catch (error) {
      console.warn('Street Hustle: save could not be read, starting Day 1 fresh.', error);
      return defaultState();
    }
  }

  const state = loadState();
  let interactionQueued = false;
  let dialogueOpen = false;
  let lastSaveFlashTimer = null;
  let saveAccumulator = 0;

  player.setPosition(
    Number(state.playerPosition.x) || 0,
    0,
    Number(state.playerPosition.z) || 25
  );

  function flashSaved() {
    if (!saveStatusEl) return;
    saveStatusEl.textContent = 'AUTOSAVED';
    saveStatusEl.classList.add('visible');
    clearTimeout(lastSaveFlashTimer);
    lastSaveFlashTimer = setTimeout(() => saveStatusEl.classList.remove('visible'), 900);
  }

  function saveState(showFlash = true) {
    try {
      const pos = player.getPosition();
      state.playerPosition = { x: pos.x, y: 0, z: pos.z };
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      if (showFlash) flashSaved();
    } catch (error) {
      console.warn('Street Hustle: autosave failed.', error);
    }
  }

  function makeMaterial(r, g, b, gloss = 0.2) {
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(r, g, b);
    material.gloss = gloss;
    material.update();
    return material;
  }

  const materials = {
    skinA: makeMaterial(0.34, 0.19, 0.12),
    skinB: makeMaterial(0.24, 0.12, 0.07),
    mama: makeMaterial(0.50, 0.12, 0.32),
    sipho: makeMaterial(0.10, 0.34, 0.62),
    ayanda: makeMaterial(0.72, 0.42, 0.08),
    vusi: makeMaterial(0.20, 0.20, 0.21),
    shopkeeper: makeMaterial(0.12, 0.48, 0.25),
    trousers: makeMaterial(0.10, 0.11, 0.13),
    markerGood: makeMaterial(0.12, 0.70, 0.28, 0.35),
    markerRisk: makeMaterial(0.75, 0.08, 0.06, 0.35),
    markerDelivery: makeMaterial(0.15, 0.42, 0.85, 0.35),
    parcel: makeMaterial(0.45, 0.28, 0.10)
  };

  function primitive(name, type, x, y, z, sx, sy, sz, material, parent = app.root) {
    const entity = new pc.Entity(name);
    entity.addComponent('model', { type });
    entity.setPosition(x, y, z);
    entity.setLocalScale(sx, sy, sz);
    entity.model.material = material;
    parent.addChild(entity);
    return entity;
  }

  function createNpc(name, x, z, shirt, skin = materials.skinA) {
    const root = new pc.Entity(name);
    root.setPosition(x, 0, z);
    app.root.addChild(root);

    primitive(`${name}_Body`, 'box', 0, 1.55, 0, 0.85, 1.55, 0.50, shirt, root);
    primitive(`${name}_Head`, 'sphere', 0, 2.65, 0, 0.68, 0.68, 0.68, skin, root);
    primitive(`${name}_LegL`, 'box', -0.22, 0.48, 0, 0.27, 0.95, 0.30, materials.trousers, root);
    primitive(`${name}_LegR`, 'box', 0.22, 0.48, 0, 0.27, 0.95, 0.30, materials.trousers, root);
    return root;
  }

  // First living-neighbourhood NPCs.
  createNpc('Mama', -8.3, 18.0, materials.mama, materials.skinB);
  createNpc('Sipho', -11.5, -25.0, materials.sipho);
  createNpc('Ayanda', 6.6, -29.0, materials.ayanda, materials.skinB);
  createNpc('Vusi', 27.0, 26.5, materials.vusi);
  createNpc('Shopkeeper', 8.6, -23.0, materials.shopkeeper);

  // Small world-space markers for jobs/delivery destinations.
  const crateMarker = primitive('CarryCratesMarker', 'cylinder', 8.3, 0.18, -19.0, 1.1, 0.22, 1.1, materials.markerGood);
  const deliveryMarker = primitive('DeliveryMarker', 'cylinder', -8.2, 0.18, 4.0, 1.1, 0.22, 1.1, materials.markerDelivery);
  const riskMarker = primitive('RiskMarker', 'cylinder', 27.0, 0.18, 23.8, 1.1, 0.22, 1.1, materials.markerRisk);
  const parcelVisual = primitive('ParcelVisual', 'box', 0.55, 1.45, 0.25, 0.38, 0.38, 0.38, materials.parcel, player);
  parcelVisual.enabled = Boolean(state.inventory.parcel);

  function distanceXZ(position, x, z) {
    const dx = position.x - x;
    const dz = position.z - z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  function showDialogue(speaker, text) {
    dialogueOpen = true;
    dialogueSpeakerEl.textContent = speaker;
    dialogueTextEl.textContent = text;
    dialogueEl.classList.add('visible');
  }

  function closeDialogue() {
    dialogueOpen = false;
    dialogueEl.classList.remove('visible');
  }

  dialogueCloseEl?.addEventListener('click', closeDialogue);

  function requestInteraction(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (dialogueOpen) {
      closeDialogue();
      return;
    }
    interactionQueued = true;
  }

  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'e') requestInteraction();
  });
  interactButton?.addEventListener('pointerdown', requestInteraction);

  function currentObjective() {
    if (state.day1Complete) {
      return 'DAY 1 COMPLETE: You helped at home. Explore the neighbourhood.';
    }
    if (!state.introTalked) {
      return 'OBJECTIVE: Talk to Ma at home';
    }
    if (!state.breadBought) {
      if (state.cash < 25) return 'OBJECTIVE: Earn at least R25 for bread';
      return 'OBJECTIVE: Go to the Corner Shop and buy bread (R25)';
    }
    if (!state.breadReturned) {
      return 'OBJECTIVE: Take the bread home to Ma';
    }
    return 'DAY 1 COMPLETE';
  }

  function updateHud() {
    cashEl.textContent = `CASH: R${state.cash}`;
    repEl.textContent = `REP: ${state.reputation}`;
    if (heatEl) heatEl.textContent = `HEAT: ${state.heat}`;
    if (bagEl) {
      const items = [];
      if (state.inventory.bread) items.push('Bread');
      if (state.inventory.parcel) items.push('Parcel');
      bagEl.textContent = items.length ? `BAG: ${items.join(', ')}` : 'BAG: Empty';
    }
    objectiveEl.textContent = currentObjective();
    parcelVisual.enabled = Boolean(state.inventory.parcel);
  }

  function reward(amount, rep = 0, heat = 0) {
    state.cash += amount;
    state.reputation += rep;
    state.heat = Math.max(0, state.heat + heat);
    updateHud();
    saveState();
  }

  function requireIntro() {
    if (state.introTalked) return true;
    showDialogue('Street Hustle', 'Go home and talk to Ma first. Your Day 1 story starts there.');
    return false;
  }

  const interactables = [
    {
      id: 'mama', x: -8.3, z: 18.0, radius: 3.0,
      prompt: () => state.breadBought && !state.breadReturned ? 'MA · Press E · Give her the bread' : 'MA · Press E · Talk',
      action: () => {
        if (!state.introTalked) {
          state.introTalked = true;
          showDialogue('Ma', 'Sbu, there is no bread in the house. Please try make at least R25 and bring one loaf home. How you make the money is your choice — just think about the consequences.');
          updateHud();
          saveState();
          return;
        }
        if (state.inventory.bread && !state.breadReturned) {
          state.inventory.bread = false;
          state.breadReturned = true;
          state.day1Complete = true;
          state.reputation += 2;
          showDialogue('Ma', 'Thank you. You came back with what the house needed. Money matters, but what you do with it matters too.');
          updateHud();
          saveState();
          return;
        }
        showDialogue('Ma', state.day1Complete ? 'You did what you needed to do today. Tomorrow will bring new choices.' : 'We still need that bread. Be careful out there.');
      }
    },
    {
      id: 'carwash', x: -16.0, z: -25.0, radius: 4.1,
      prompt: () => state.jobs.carWash ? 'CAR WASH · Job already done today' : 'CAR WASH · Press E · Work for R30',
      action: () => {
        if (!requireIntro() || state.jobs.carWash) return;
        state.jobs.carWash = true;
        reward(30, 1, 0);
        showDialogue('Sipho', 'Sharp! Good work. Here is your R30. Come back another day if I have more cars.');
      }
    },
    {
      id: 'crates', x: 8.3, z: -19.0, radius: 3.2,
      prompt: () => state.jobs.carryCrates ? 'SHOP CRATES · Job already done today' : 'SHOP CRATES · Press E · Help unload · R20',
      action: () => {
        if (!requireIntro() || state.jobs.carryCrates) return;
        state.jobs.carryCrates = true;
        reward(20, 1, 0);
        showDialogue('Shopkeeper', 'Thanks for helping with those crates. R20 for your time.');
      }
    },
    {
      id: 'ayanda', x: 6.6, z: -29.0, radius: 3.0,
      prompt: () => {
        if (state.jobs.delivery) return 'AYANDA · Delivery completed';
        if (state.deliveryAccepted) return 'AYANDA · Parcel is in your bag';
        return 'AYANDA · Press E · Ask about delivery work';
      },
      action: () => {
        if (!requireIntro() || state.jobs.delivery) return;
        if (!state.deliveryAccepted) {
          state.deliveryAccepted = true;
          state.inventory.parcel = true;
          showDialogue('Ayanda', 'Take this parcel to the blue marker near Home 02. Bring it there and I will pay you R35.');
          updateHud();
          saveState();
        } else {
          showDialogue('Ayanda', 'The parcel still needs to go to the blue marker near Home 02.');
        }
      }
    },
    {
      id: 'delivery', x: -8.2, z: 4.0, radius: 3.0,
      prompt: () => state.deliveryAccepted && !state.jobs.delivery ? 'DELIVERY · Press E · Drop parcel' : '',
      active: () => state.deliveryAccepted && !state.jobs.delivery,
      action: () => {
        if (!state.deliveryAccepted || state.jobs.delivery) return;
        state.deliveryAccepted = false;
        state.inventory.parcel = false;
        state.jobs.delivery = true;
        reward(35, 2, 0);
        showDialogue('Delivery Customer', 'Package received. Ayanda sent your R35 payment.');
      }
    },
    {
      id: 'vusi', x: 27.0, z: 26.5, radius: 3.3,
      prompt: () => state.jobs.riskyQuickCash ? 'VUSI · Nothing else today' : 'VUSI · Press E · Risky quick cash · R60',
      action: () => {
        if (!requireIntro() || state.jobs.riskyQuickCash) return;
        state.jobs.riskyQuickCash = true;
        reward(60, -1, 2);
        showDialogue('Vusi', 'Easy money, right? You got R60 — but people noticed. Your HEAT went up by 2 and your reputation took a knock.');
      }
    },
    {
      id: 'shop', x: 8.6, z: -23.0, radius: 3.0,
      prompt: () => {
        if (!state.introTalked) return 'CORNER SHOP · Press E · Talk';
        if (state.breadBought) return 'CORNER SHOP · Bread already bought';
        return `CORNER SHOP · Press E · Buy bread R25${state.cash < 25 ? ' · Not enough cash' : ''}`;
      },
      action: () => {
        if (!state.introTalked) {
          showDialogue('Shopkeeper', 'Morning. Come back if you need anything.');
          return;
        }
        if (state.breadBought) {
          showDialogue('Shopkeeper', 'You already bought your bread.');
          return;
        }
        if (state.cash < 25) {
          showDialogue('Shopkeeper', `Bread is R25. You only have R${state.cash}.`);
          return;
        }
        state.cash -= 25;
        state.breadBought = true;
        state.inventory.bread = true;
        showDialogue('Shopkeeper', 'One loaf — R25. Thanks.');
        updateHud();
        saveState();
      }
    }
  ];

  function nearestInteractable() {
    const pos = player.getPosition();
    let nearest = null;
    let nearestDistance = Infinity;

    for (const item of interactables) {
      if (item.active && !item.active()) continue;
      const prompt = item.prompt();
      if (!prompt) continue;
      const distance = distanceXZ(pos, item.x, item.z);
      if (distance <= item.radius && distance < nearestDistance) {
        nearest = item;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  function updateInteractionPrompt() {
    if (dialogueOpen) return;
    const nearest = nearestInteractable();
    if (!nearest) {
      interactionEl.textContent = '';
      interactionEl.classList.remove('visible');
      return;
    }
    interactionEl.textContent = nearest.prompt();
    interactionEl.classList.add('visible');
  }

  // Existing main.js has a prototype car-wash system. This story layer owns the
  // persistent Day 1 economy, so it rewrites the HUD each frame after main.js.
  app.on('update', (dt) => {
    if (dialogueOpen) {
      interactionEl.classList.remove('visible');
    } else {
      updateInteractionPrompt();
    }

    if (interactionQueued) {
      interactionQueued = false;
      const nearest = nearestInteractable();
      nearest?.action();
    }

    saveAccumulator += dt;
    if (saveAccumulator >= 2.0) {
      saveAccumulator = 0;
      saveState(false);
    }

    // Keep persistent story values authoritative if legacy prototype code writes the HUD.
    updateHud();
  });

  window.addEventListener('beforeunload', () => saveState(false));

  // Hide markers when their activities are complete.
  app.on('update', () => {
    crateMarker.enabled = !state.jobs.carryCrates;
    deliveryMarker.enabled = state.deliveryAccepted && !state.jobs.delivery;
    riskMarker.enabled = !state.jobs.riskyQuickCash;
  });

  updateHud();
  saveState(false);
  console.info('Street Hustle: Day 1 story, NPCs, jobs, inventory and autosave loaded.');
}
