import * as pc from 'playcanvas';

// STREET HUSTLE — LIVING WORLD BETA LAYER
// Adds ambient NPC schedules, moving traffic/taxis, a realtime minimap,
// lightweight enterable interiors and procedural ambient audio.
// Kept separate from the life-simulation layer so these systems can be
// debugged or replaced without risking money/story/save progression.

const world = window.StreetHustleWorld;
const app = world?.app;
const player = world?.player;

if (!world || !app || !player) {
  console.error('Street Hustle living-world layer could not start: world core missing.');
} else {
  const interactionEl = document.getElementById('interaction');
  const clockEl = document.getElementById('clock');
  const minimap = document.getElementById('minimap');
  const mapCtx = minimap?.getContext('2d');
  const soundButton = document.getElementById('sound-toggle');

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function makeMaterial(r, g, b, metalness = 0, gloss = 0.2) {
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(r, g, b);
    material.metalness = metalness;
    material.gloss = gloss;
    material.update();
    return material;
  }

  const mat = {
    skin1: makeMaterial(.33,.18,.11),
    skin2: makeMaterial(.23,.11,.07),
    shirtBlue: makeMaterial(.08,.30,.62),
    shirtRed: makeMaterial(.62,.08,.08),
    shirtGreen: makeMaterial(.08,.44,.23),
    shirtGold: makeMaterial(.80,.48,.06),
    shirtPurple: makeMaterial(.40,.15,.52),
    trousers: makeMaterial(.07,.08,.10),
    taxi: makeMaterial(.94,.80,.12,.08,.42),
    taxiStripe: makeMaterial(.10,.12,.14),
    white: makeMaterial(.88,.88,.84),
    trafficBlue: makeMaterial(.07,.26,.58,.08,.42),
    trafficGrey: makeMaterial(.32,.34,.37,.1,.38),
    glass: makeMaterial(.08,.18,.24,.05,.62),
    tyre: makeMaterial(.025,.025,.025),
    interiorWall: makeMaterial(.77,.72,.61),
    interiorFloor: makeMaterial(.37,.27,.18),
    interiorCeiling: makeMaterial(.72,.70,.66),
    wood: makeMaterial(.36,.18,.07),
    shelf: makeMaterial(.28,.29,.31,.1,.25),
    bed: makeMaterial(.18,.38,.58),
    blanket: makeMaterial(.56,.18,.20),
    counter: makeMaterial(.23,.32,.22),
    marker: makeMaterial(.12,.70,.30,0,.35)
  };

  function part(parent, name, type, x, y, z, sx, sy, sz, material, rx = 0, ry = 0, rz = 0) {
    const entity = new pc.Entity(name);
    entity.addComponent('model', { type });
    parent.addChild(entity);
    entity.setLocalPosition(x, y, z);
    entity.setLocalScale(sx, sy, sz);
    entity.setLocalEulerAngles(rx, ry, rz);
    entity.model.material = material;
    return entity;
  }

  // -----------------------------------------------------------------------
  // 1) AMBIENT NPC DAILY ROUTINES
  // -----------------------------------------------------------------------
  function createPedestrian(name, shirt, skin, route, speed = 1.15, offset = 0) {
    const root = new pc.Entity(`AmbientNPC_${name}`);
    app.root.addChild(root);
    part(root, `${name}_Body`, 'box', 0, 1.45, 0, .72, 1.42, .44, shirt);
    part(root, `${name}_Head`, 'sphere', 0, 2.45, 0, .59, .59, .59, skin);
    part(root, `${name}_LegL`, 'box', -.19, .45, 0, .23, .9, .27, mat.trousers);
    part(root, `${name}_LegR`, 'box', .19, .45, 0, .23, .9, .27, mat.trousers);
    root.setPosition(route[0][0], 0, route[0][1]);
    return { name, root, route, speed, index: offset % route.length, wait: offset * .3 };
  }

  const pedestrians = [
    createPedestrian('Lebo', mat.shirtPurple, mat.skin2, [[-7,30],[-7,10],[-7,-8],[-7,-26],[-12,-28]], 1.10, 0),
    createPedestrian('Musa', mat.shirtGreen, mat.skin1, [[7,-30],[7,-12],[7,7],[7,27],[13,29]], 1.22, 1),
    createPedestrian('Nandi', mat.shirtGold, mat.skin2, [[-20,6],[-8,6],[8,6],[21,5],[8,6]], 1.05, 2),
    createPedestrian('Bongani', mat.shirtRed, mat.skin1, [[19,16],[8,16],[-8,16],[-20,17],[-8,16]], 1.18, 3),
    createPedestrian('Amahle', mat.shirtBlue, mat.skin2, [[18,-20],[8,-20],[-7,-20],[-19,-21],[-7,-20]], 1.08, 4),
    createPedestrian('Sizwe', mat.shirtGreen, mat.skin1, [[-22,-3],[-8,-3],[8,-3],[22,-4],[8,-3]], 1.14, 5)
  ];

  function getClockHour() {
    const text = clockEl?.textContent || '09:00';
    const match = /^(\d{1,2}):(\d{2})/.exec(text.trim());
    if (!match) return 9;
    return (Number(match[1]) || 0) + (Number(match[2]) || 0) / 60;
  }

  function updatePedestrian(ped, dt, hour) {
    const active = hour >= 5.5 && hour < 22.0;
    ped.root.enabled = active && currentInterior === null;
    if (!active || currentInterior !== null) return;

    if (ped.wait > 0) {
      ped.wait -= dt;
      return;
    }

    const target = ped.route[ped.index];
    const pos = ped.root.getPosition();
    const dx = target[0] - pos.x;
    const dz = target[1] - pos.z;
    const distance = Math.hypot(dx, dz);

    if (distance < .35) {
      ped.index = (ped.index + 1) % ped.route.length;
      ped.wait = 1.2 + Math.random() * 2.8;
      return;
    }

    const step = Math.min(distance, ped.speed * dt);
    const nx = pos.x + dx / distance * step;
    const nz = pos.z + dz / distance * step;
    ped.root.setPosition(nx, 0, nz);
    ped.root.setEulerAngles(0, Math.atan2(dx, -dz) * 180 / Math.PI, 0);
  }

  // -----------------------------------------------------------------------
  // 2) MOVING TRAFFIC + TAXI ROUTINE
  // -----------------------------------------------------------------------
  function createRoadVehicle(name, bodyMaterial, x, z, direction = 1, taxi = false) {
    const root = new pc.Entity(`Traffic_${name}`);
    app.root.addChild(root);
    root.setPosition(x, 0, z);
    part(root, `${name}_Body`, 'box', 0, .62, 0, 1.85, .68, 3.8, bodyMaterial);
    part(root, `${name}_Cabin`, 'box', 0, 1.16, -.1, 1.58, .60, 1.85, mat.glass);
    if (taxi) {
      part(root, `${name}_Stripe`, 'box', 0, .70, -1.93, 1.55, .18, .06, mat.taxiStripe);
      part(root, `${name}_RoofSign`, 'box', 0, 1.56, -.1, .75, .18, .42, mat.white);
    }
    for (const [wx,wz] of [[-.9,-1.25],[.9,-1.25],[-.9,1.25],[.9,1.25]]) {
      part(root, `${name}_Wheel_${wx}_${wz}`, 'cylinder', wx, .38, wz, .43, .22, .43, mat.tyre, 0, 0, 90);
    }
    root.setEulerAngles(0, direction > 0 ? 180 : 0, 0);
    return { name, root, x, z, direction, speed: taxi ? 4.2 : 4.8 + Math.random() * 1.2, taxi, stopTimer: 0, stoppedAtRank: false };
  }

  const traffic = [
    createRoadVehicle('Taxi01', mat.taxi, -2.25, -34, 1, true),
    createRoadVehicle('CarBlue', mat.trafficBlue, 2.25, 25, -1, false),
    createRoadVehicle('CarGrey', mat.trafficGrey, -2.25, -6, 1, false),
    createRoadVehicle('Taxi02', mat.taxi, 2.25, 5, -1, true)
  ];

  function updateTraffic(car, dt, hour) {
    car.root.enabled = hour >= 5 && hour < 23 && currentInterior === null;
    if (!car.root.enabled) return;

    if (car.stopTimer > 0) {
      car.stopTimer -= dt;
      return;
    }

    const controlled = world.getControlledPosition();
    const pos = car.root.getPosition();
    const playerDistance = Math.hypot(controlled.x - pos.x, controlled.z - pos.z);
    const safeSpeed = playerDistance < 5.0 ? 0 : car.speed;

    let nextZ = pos.z + car.direction * safeSpeed * dt;

    // Taxis pause at the taxi rank near the corner shop once per loop.
    if (car.taxi && !car.stoppedAtRank) {
      const crossedRank = car.direction > 0 ? (pos.z < -29 && nextZ >= -29) : (pos.z > -29 && nextZ <= -29);
      if (crossedRank) {
        nextZ = -29;
        car.stopTimer = 3.5;
        car.stoppedAtRank = true;
      }
    }

    if (nextZ > 36) {
      nextZ = -36;
      car.stoppedAtRank = false;
    } else if (nextZ < -36) {
      nextZ = 36;
      car.stoppedAtRank = false;
    }

    car.root.setPosition(car.x, 0, nextZ);
  }

  // -----------------------------------------------------------------------
  // 3) REALTIME MINIMAP
  // -----------------------------------------------------------------------
  const landmarks = [
    { name: 'Home', x: -13, z: 18, color: '#e6a24b' },
    { name: 'Shop', x: 15, z: -23, color: '#5bc47d' },
    { name: 'Wash', x: -16, z: -25, color: '#4ba7e8' },
    { name: 'Work', x: 24, z: 6, color: '#dfb74b' },
    { name: 'Taxi', x: 7, z: -29, color: '#f3dc4f' }
  ];

  function mapPoint(x, z) {
    const size = minimap?.width || 180;
    return {
      x: (x + 40) / 80 * size,
      y: (40 - z) / 80 * size
    };
  }

  function drawMinimap() {
    if (!mapCtx || !minimap) return;
    const w = minimap.width;
    const h = minimap.height;
    mapCtx.clearRect(0, 0, w, h);

    mapCtx.fillStyle = '#183c1c';
    mapCtx.fillRect(0, 0, w, h);

    // Road and sidewalks.
    const roadA = mapPoint(-5, 40);
    const roadB = mapPoint(5, -40);
    mapCtx.fillStyle = '#24272a';
    mapCtx.fillRect(roadA.x, 0, roadB.x - roadA.x, h);
    mapCtx.strokeStyle = '#e6c83f';
    mapCtx.lineWidth = 1.5;
    mapCtx.beginPath();
    mapCtx.moveTo(w / 2, 0);
    mapCtx.lineTo(w / 2, h);
    mapCtx.stroke();

    // Houses / shop footprints.
    mapCtx.fillStyle = '#7a6650';
    const buildings = [
      [-13,18,7,8],[-14,4,8,7],[-14,-10,7,8],[14,14,8,8],[15,-6,9,7],[15,-23,10,9]
    ];
    for (const [x,z,bw,bd] of buildings) {
      const p1 = mapPoint(x - bw / 2, z + bd / 2);
      const p2 = mapPoint(x + bw / 2, z - bd / 2);
      mapCtx.fillRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
    }

    for (const lm of landmarks) {
      const p = mapPoint(lm.x, lm.z);
      mapCtx.fillStyle = lm.color;
      mapCtx.beginPath();
      mapCtx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
      mapCtx.fill();
    }

    if (world.vehicleOwned && world.vehicle.enabled) {
      const v = mapPoint(world.vehicle.getPosition().x, world.vehicle.getPosition().z);
      mapCtx.fillStyle = '#e5554e';
      mapCtx.fillRect(v.x - 2.5, v.y - 2.5, 5, 5);
    }

    for (const car of traffic) {
      if (!car.root.enabled) continue;
      const p = mapPoint(car.root.getPosition().x, car.root.getPosition().z);
      mapCtx.fillStyle = car.taxi ? '#f0d84a' : '#b8c2ce';
      mapCtx.fillRect(p.x - 1.5, p.y - 2.4, 3, 4.8);
    }

    const controlled = world.getControlledPosition();
    const p = mapPoint(controlled.x, controlled.z);
    const yaw = (world.driving ? world.vehicle.getEulerAngles().y : player.getEulerAngles().y) * Math.PI / 180;
    mapCtx.save();
    mapCtx.translate(p.x, p.y);
    mapCtx.rotate(-yaw);
    mapCtx.fillStyle = '#ffffff';
    mapCtx.strokeStyle = '#111';
    mapCtx.lineWidth = 1;
    mapCtx.beginPath();
    mapCtx.moveTo(0, -5.5);
    mapCtx.lineTo(4.5, 4.5);
    mapCtx.lineTo(-4.5, 4.5);
    mapCtx.closePath();
    mapCtx.fill();
    mapCtx.stroke();
    mapCtx.restore();

    mapCtx.strokeStyle = 'rgba(255,255,255,.45)';
    mapCtx.strokeRect(.5, .5, w - 1, h - 1);
  }

  // -----------------------------------------------------------------------
  // 4) LIGHTWEIGHT ENTERABLE 3D INTERIORS
  // -----------------------------------------------------------------------
  function createRoom(name, cx, cz, kind) {
    const root = new pc.Entity(`Interior_${name}`);
    app.root.addChild(root);
    root.setPosition(cx, 0, cz);

    const width = 10;
    const depth = 10;
    const wallH = 4.6;
    part(root, `${name}_Floor`, 'box', 0, .05, 0, width, .10, depth, mat.interiorFloor);
    part(root, `${name}_WallN`, 'box', 0, wallH / 2, -depth / 2, width, wallH, .20, mat.interiorWall);
    part(root, `${name}_WallS`, 'box', 0, wallH / 2, depth / 2, width, wallH, .20, mat.interiorWall);
    part(root, `${name}_WallE`, 'box', width / 2, wallH / 2, 0, .20, wallH, depth, mat.interiorWall);
    part(root, `${name}_WallW`, 'box', -width / 2, wallH / 2, 0, .20, wallH, depth, mat.interiorWall);
    part(root, `${name}_Ceiling`, 'box', 0, wallH, 0, width, .14, depth, mat.interiorCeiling);

    if (kind === 'home') {
      part(root, 'HomeBedBase', 'box', -2.4, .40, -1.8, 3.0, .55, 2.0, mat.wood);
      part(root, 'HomeMattress', 'box', -2.4, .77, -1.8, 2.8, .30, 1.85, mat.bed);
      part(root, 'HomeBlanket', 'box', -2.8, .96, -1.8, 1.55, .08, 1.72, mat.blanket);
      part(root, 'HomeTable', 'box', 2.2, .82, -2.1, 1.7, .15, 1.2, mat.wood);
      for (const [x,z] of [[1.55,-2.5],[2.85,-2.5],[1.55,-1.7],[2.85,-1.7]]) part(root, `TableLeg_${x}_${z}`, 'box', x, .4, z, .12, .8, .12, mat.wood);
      part(root, 'HomeSofa', 'box', 1.6, .65, 2.0, 2.8, 1.05, 1.0, mat.shirtBlue);
    } else {
      part(root, 'ShopCounter', 'box', 0, .85, -2.7, 6.5, 1.5, 1.05, mat.counter);
      for (const x of [-3.1,0,3.1]) {
        part(root, `ShopShelf_${x}`, 'box', x, 1.65, 1.7, 1.65, 3.0, .45, mat.shelf);
        for (const y of [.55,1.35,2.15,2.85]) part(root, `ShopShelfBoard_${x}_${y}`, 'box', x, y, 1.45, 1.7, .10, .70, mat.wood);
      }
      part(root, 'ShopFridge', 'box', 3.6, 1.3, -2.0, 1.35, 2.6, 1.4, mat.white);
    }

    // Exit marker inside the room.
    part(root, `${name}_ExitMarker`, 'cylinder', 0, .12, 3.85, 1.0, .18, 1.0, mat.marker);
    root.enabled = false;
    return { name, root, cx, cz, minX: cx - 4.35, maxX: cx + 4.35, minZ: cz - 4.35, maxZ: cz + 4.35 };
  }

  const interiors = {
    home: {
      room: createRoom('SbuHome', -30, 15, 'home'),
      exterior: { x: -8.6, z: 14.7 },
      returnTo: { x: -8.2, z: 14.2 },
      label: 'SBU HOME'
    },
    shop: {
      room: createRoom('CornerShop', 30, -5, 'shop'),
      exterior: { x: 9.1, z: -18.8 },
      returnTo: { x: 8.5, z: -18.0 },
      label: 'CORNER SHOP'
    }
  };

  let currentInterior = null;

  function distanceTo(point) {
    const pos = player.getPosition();
    return Math.hypot(pos.x - point.x, pos.z - point.z);
  }

  function enterInterior(id) {
    const interior = interiors[id];
    if (!interior || world.driving) return;
    currentInterior = id;
    for (const value of Object.values(interiors)) value.room.root.enabled = false;
    interior.room.root.enabled = true;
    player.setPosition(interior.room.cx, 0, interior.room.cz + 2.5);
    for (const ped of pedestrians) ped.root.enabled = false;
    for (const car of traffic) car.root.enabled = false;
    minimap?.classList.add('interior');
    window.dispatchEvent(new CustomEvent('street-hustle-location', { detail: { location: id, inside: true } }));
  }

  function exitInterior() {
    if (!currentInterior) return;
    const interior = interiors[currentInterior];
    interior.room.root.enabled = false;
    player.setPosition(interior.returnTo.x, 0, interior.returnTo.z);
    currentInterior = null;
    minimap?.classList.remove('interior');
    window.dispatchEvent(new CustomEvent('street-hustle-location', { detail: { location: 'street', inside: false } }));
  }

  function interiorPrompt() {
    if (world.driving || window.StreetHustleUIBlocking) return '';
    if (currentInterior) {
      const room = interiors[currentInterior].room;
      const exitPoint = { x: room.cx, z: room.cz + 3.85 };
      if (distanceTo(exitPoint) < 2.0) return `${interiors[currentInterior].label} · E Exit`;
      return '';
    }
    for (const [id, interior] of Object.entries(interiors)) {
      if (distanceTo(interior.exterior) < 1.75) return `${interior.label} · E Enter`;
    }
    return '';
  }

  function handleInteriorInteraction(event) {
    if (window.StreetHustleUIBlocking || world.driving) return;

    if (currentInterior) {
      const room = interiors[currentInterior].room;
      const exitPoint = { x: room.cx, z: room.cz + 3.85 };
      if (distanceTo(exitPoint) < 2.0) {
        event.stopImmediatePropagation();
        exitInterior();
      }
      return;
    }

    for (const [id, interior] of Object.entries(interiors)) {
      if (distanceTo(interior.exterior) < 1.75) {
        event.stopImmediatePropagation();
        enterInterior(id);
        return;
      }
    }
  }

  // Capture phase lets an actual doorway take priority over the older nearby
  // NPC interaction when both use the same E button.
  window.addEventListener('street-hustle-interact', handleInteriorInteraction, true);

  function enforceInteriorBounds() {
    if (!currentInterior) return;
    const room = interiors[currentInterior].room;
    const pos = player.getPosition();
    const x = clamp(pos.x, room.minX, room.maxX);
    const z = clamp(pos.z, room.minZ, room.maxZ);
    if (x !== pos.x || z !== pos.z) player.setPosition(x, 0, z);
  }

  // -----------------------------------------------------------------------
  // 5) PROCEDURAL AMBIENT / GAME AUDIO
  // -----------------------------------------------------------------------
  let audioContext = null;
  let masterGain = null;
  let ambienceGain = null;
  let engineGain = null;
  let engineOsc = null;
  let soundEnabled = true;
  let audioStarted = false;
  let birdTimer = 0;

  function startAudio() {
    if (audioStarted || !soundEnabled) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      soundEnabled = false;
      updateSoundButton();
      return;
    }

    audioContext = new AudioCtx();
    masterGain = audioContext.createGain();
    masterGain.gain.value = .18;
    masterGain.connect(audioContext.destination);

    // Very low city/wind bed generated from filtered noise.
    const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * .35;
    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    ambienceGain = audioContext.createGain();
    ambienceGain.gain.value = .07;
    noise.connect(filter).connect(ambienceGain).connect(masterGain);
    noise.start();

    // Shared distant engine tone. Its volume changes with traffic / driving.
    engineOsc = audioContext.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 70;
    engineGain = audioContext.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineGain).connect(masterGain);
    engineOsc.start();

    audioStarted = true;
    updateSoundButton();
  }

  function chirpBird() {
    if (!audioContext || !soundEnabled || currentInterior) return;
    const hour = getClockHour();
    if (hour < 5.5 || hour > 18.5) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sine';
    const now = audioContext.currentTime;
    osc.frequency.setValueAtTime(1750 + Math.random() * 350, now);
    osc.frequency.exponentialRampToValueAtTime(2600 + Math.random() * 400, now + .12);
    gain.gain.setValueAtTime(.0, now);
    gain.gain.linearRampToValueAtTime(.045, now + .02);
    gain.gain.exponentialRampToValueAtTime(.001, now + .19);
    osc.connect(gain).connect(masterGain);
    osc.start(now);
    osc.stop(now + .21);
  }

  function updateAudio(dt) {
    if (!audioStarted || !audioContext || !masterGain) return;
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    masterGain.gain.setTargetAtTime(soundEnabled ? .18 : 0, audioContext.currentTime, .08);

    if (engineGain && engineOsc) {
      const target = currentInterior ? 0 : (world.driving ? .10 : .018);
      engineGain.gain.setTargetAtTime(target, audioContext.currentTime, .12);
      engineOsc.frequency.setTargetAtTime(world.driving ? 105 : 66, audioContext.currentTime, .10);
    }

    if (ambienceGain) ambienceGain.gain.setTargetAtTime(currentInterior ? .012 : .07, audioContext.currentTime, .3);

    birdTimer -= dt;
    if (birdTimer <= 0) {
      chirpBird();
      birdTimer = 5 + Math.random() * 9;
    }
  }

  function updateSoundButton() {
    if (!soundButton) return;
    soundButton.textContent = soundEnabled ? 'SOUND ON' : 'SOUND OFF';
    soundButton.classList.toggle('muted', !soundEnabled);
  }

  function toggleSound(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    soundEnabled = !soundEnabled;
    if (soundEnabled && !audioStarted) startAudio();
    updateSoundButton();
  }

  soundButton?.addEventListener('click', toggleSound);
  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'm' && !event.repeat) toggleSound(event);
    if (!audioStarted && soundEnabled && ['w','a','s','d','e','p','arrowup','arrowdown','arrowleft','arrowright'].includes(event.key.toLowerCase())) startAudio();
  });
  window.addEventListener('pointerdown', () => {
    if (!audioStarted && soundEnabled) startAudio();
  }, { once: true });
  updateSoundButton();

  // -----------------------------------------------------------------------
  // UPDATE LOOP
  // -----------------------------------------------------------------------
  let mapAccumulator = 0;

  app.on('update', (dt) => {
    const hour = getClockHour();

    for (const ped of pedestrians) updatePedestrian(ped, dt, hour);
    for (const car of traffic) updateTraffic(car, dt, hour);
    enforceInteriorBounds();
    updateAudio(dt);

    const prompt = interiorPrompt();
    if (prompt && interactionEl) {
      interactionEl.textContent = prompt;
      interactionEl.classList.add('visible');
    }

    mapAccumulator += dt;
    if (mapAccumulator >= .08) {
      mapAccumulator = 0;
      drawMinimap();
    }
  });

  window.StreetHustleLivingWorld = {
    pedestrians,
    traffic,
    interiors,
    get currentInterior() { return currentInterior; },
    enterInterior,
    exitInterior,
    toggleSound
  };

  drawMinimap();
  console.info('Street Hustle: living-world beta layer loaded.');
}
