import * as pc from 'playcanvas';

const canvas = document.getElementById('application');
const app = new pc.Application(canvas);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.start();
window.addEventListener('resize', () => app.resizeCanvas());

const runButton = document.getElementById('run-button');
const interactButton = document.getElementById('interact-button');

const keys = new Set();
const virtualKeys = new Set();
let runRequested = false;
let characterAnimReady = false;
let lastAnimSpeed = -1;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const makeMaterial = (r, g, b, metalness = 0, gloss = 0.25) => {
  const material = new pc.StandardMaterial();
  material.diffuse = new pc.Color(r, g, b);
  material.metalness = metalness;
  material.gloss = gloss;
  material.update();
  return material;
};

const materials = {
  grass: makeMaterial(0.18, 0.39, 0.16, 0, 0.08),
  road: makeMaterial(0.10, 0.11, 0.12, 0, 0.12),
  line: makeMaterial(0.94, 0.78, 0.10, 0, 0.08),
  concrete: makeMaterial(0.60, 0.58, 0.52, 0, 0.10),
  houseA: makeMaterial(0.72, 0.56, 0.33, 0, 0.18),
  houseB: makeMaterial(0.46, 0.61, 0.70, 0, 0.18),
  houseC: makeMaterial(0.72, 0.67, 0.43, 0, 0.18),
  roof: makeMaterial(0.25, 0.18, 0.13, 0, 0.08),
  shop: makeMaterial(0.22, 0.46, 0.31, 0, 0.22),
  player: makeMaterial(0.10, 0.28, 0.68, 0, 0.18),
  skin: makeMaterial(0.34, 0.19, 0.12, 0, 0.12),
  tree: makeMaterial(0.14, 0.35, 0.11, 0, 0.08),
  trunk: makeMaterial(0.28, 0.15, 0.07, 0, 0.04),
  carBody: makeMaterial(0.55, 0.07, 0.05, 0.1, 0.45),
  carGlass: makeMaterial(0.08, 0.18, 0.24, 0.05, 0.65),
  tyre: makeMaterial(0.035, 0.035, 0.035, 0, 0.08),
  hub: makeMaterial(0.45, 0.46, 0.48, 0.6, 0.5)
};

const obstacles = [];

function createPrimitive(name, type, position, scale, material, parent = app.root, rotation = null) {
  const entity = new pc.Entity(name);
  entity.addComponent('model', { type });
  entity.setPosition(position.x, position.y, position.z);
  entity.setLocalScale(scale.x, scale.y, scale.z);
  if (rotation) entity.setEulerAngles(rotation.x, rotation.y, rotation.z);
  entity.model.material = material;
  parent.addChild(entity);
  return entity;
}

function createBuilding(name, x, z, width, depth, height, material) {
  const body = createPrimitive(name, 'box', new pc.Vec3(x, height / 2, z), new pc.Vec3(width, height, depth), material);
  createPrimitive(`${name}_Roof`, 'box', new pc.Vec3(x, height + 0.18, z), new pc.Vec3(width + 0.3, 0.32, depth + 0.3), materials.roof);
  obstacles.push({ minX: x - width / 2, maxX: x + width / 2, minZ: z - depth / 2, maxZ: z + depth / 2 });
  return body;
}

function createTree(x, z) {
  createPrimitive('TreeTrunk', 'cylinder', new pc.Vec3(x, 1.1, z), new pc.Vec3(0.42, 2.2, 0.42), materials.trunk);
  createPrimitive('TreeTop', 'sphere', new pc.Vec3(x, 3.1, z), new pc.Vec3(2.1, 2.1, 2.1), materials.tree);
}

function blocked(x, z, padding = 0.7) {
  if (Math.abs(x) > 38 || Math.abs(z) > 38) return true;
  return obstacles.some((o) => x > o.minX - padding && x < o.maxX + padding && z > o.minZ - padding && z < o.maxZ + padding);
}

// --- Base neighbourhood ----------------------------------------------------
createPrimitive('Ground', 'box', new pc.Vec3(0, -0.3, 0), new pc.Vec3(80, 0.6, 80), materials.grass);
createPrimitive('MainRoad', 'box', new pc.Vec3(0, 0.04, 0), new pc.Vec3(10, 0.08, 70), materials.road);
createPrimitive('RoadLine', 'box', new pc.Vec3(0, 0.095, 0), new pc.Vec3(0.18, 0.02, 68), materials.line);
createPrimitive('SidewalkL', 'box', new pc.Vec3(-6.1, 0.12, 0), new pc.Vec3(2, 0.24, 70), materials.concrete);
createPrimitive('SidewalkR', 'box', new pc.Vec3(6.1, 0.12, 0), new pc.Vec3(2, 0.24, 70), materials.concrete);

createBuilding('SbuHome', -13, 18, 7, 8, 4, materials.houseA);
createBuilding('Home02', -14, 4, 8, 7, 4.5, materials.houseB);
createBuilding('Home03', -14, -10, 7, 8, 4, materials.houseC);
createBuilding('Home04', 14, 14, 8, 8, 4.2, materials.houseB);
createBuilding('Home05', 15, -6, 9, 7, 4.6, materials.houseA);
createBuilding('CornerShop', 15, -23, 10, 9, 5.5, materials.shop);
createPrimitive('CarWashPad', 'box', new pc.Vec3(-16, 0.06, -25), new pc.Vec3(10, 0.12, 8), materials.concrete);

for (const [x, z] of [[-25, 28], [24, 28], [-26, 10], [25, 4], [-26, -12], [27, -15], [-27, -30], [27, -31]]) createTree(x, z);

// --- Player ---------------------------------------------------------------
const player = new pc.Entity('Player');
player.setPosition(0, 0, 25);
app.root.addChild(player);

const playerVisual = new pc.Entity('PlayerVisual');
player.addChild(playerVisual);

const fallbackVisual = new pc.Entity('FallbackVisual');
playerVisual.addChild(fallbackVisual);
createPrimitive('Body', 'box', new pc.Vec3(0, 1.45, 0), new pc.Vec3(0.9, 1.7, 0.55), materials.player, fallbackVisual);
createPrimitive('Head', 'sphere', new pc.Vec3(0, 2.65, 0), new pc.Vec3(0.72, 0.72, 0.72), materials.skin, fallbackVisual);
createPrimitive('LegL', 'box', new pc.Vec3(-0.25, 0.45, 0), new pc.Vec3(0.28, 0.9, 0.32), materials.player, fallbackVisual);
createPrimitive('LegR', 'box', new pc.Vec3(0.25, 0.45, 0), new pc.Vec3(0.28, 0.9, 0.32), materials.player, fallbackVisual);

function findAnimationTrack(animations, wantedName) {
  const target = wantedName.toLowerCase();
  for (const animationAsset of animations) {
    const track = animationAsset.resource ?? animationAsset;
    const names = [animationAsset.name, track?.name].filter(Boolean).map((name) => String(name).toLowerCase());
    if (names.some((name) => name === target || name.endsWith(`/${target}`) || name.includes(target))) return track;
  }
  return null;
}

function configureCharacterAnimation(containerAsset) {
  const animations = containerAsset.resource.animations ?? [];
  const idleTrack = findAnimationTrack(animations, 'Idle');
  const walkTrack = findAnimationTrack(animations, 'Walk');
  const runTrack = findAnimationTrack(animations, 'Run');
  if (!idleTrack || !walkTrack || !runTrack) return;

  playerVisual.addComponent('anim', { activate: true });
  playerVisual.anim.loadStateGraph({
    layers: [{
      name: 'locomotion',
      states: [{ name: 'START' }, { name: 'Idle' }, { name: 'Walk' }, { name: 'Run' }, { name: 'END' }],
      transitions: [
        { from: 'START', to: 'Idle', time: 0 },
        { from: 'Idle', to: 'Walk', time: 0.14, conditions: [{ parameterName: 'movement', predicate: pc.ANIM_GREATER_THAN, value: 0 }] },
        { from: 'Walk', to: 'Idle', time: 0.16, conditions: [{ parameterName: 'movement', predicate: pc.ANIM_LESS_THAN_EQUAL_TO, value: 0 }] },
        { from: 'Walk', to: 'Run', time: 0.12, conditions: [{ parameterName: 'movement', predicate: pc.ANIM_GREATER_THAN, value: 1 }] },
        { from: 'Run', to: 'Walk', time: 0.12, conditions: [{ parameterName: 'movement', predicate: pc.ANIM_LESS_THAN, value: 2 }] }
      ]
    }],
    parameters: { movement: { name: 'movement', type: pc.ANIM_PARAMETER_INTEGER, value: 0 } }
  });
  const layer = playerVisual.anim.baseLayer;
  layer.assignAnimation('Idle', idleTrack);
  layer.assignAnimation('Walk', walkTrack);
  layer.assignAnimation('Run', runTrack);
  characterAnimReady = true;
}

const PROTOTYPE_CHARACTER_URL = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Soldier.glb';
app.assets.loadFromUrlAndFilename(PROTOTYPE_CHARACTER_URL, 'Soldier.glb', 'container', (error, asset) => {
  if (error || !asset?.resource) return;
  try {
    const humanoid = asset.resource.instantiateRenderEntity({ castShadows: false });
    humanoid.name = 'PrototypeHumanoid';
    humanoid.setLocalPosition(0, 0, 0);
    humanoid.setLocalScale(1.25, 1.25, 1.25);
    playerVisual.addChild(humanoid);
    fallbackVisual.enabled = false;
    configureCharacterAnimation(asset);
  } catch (err) {
    console.warn('Street Hustle: character setup failed; fallback remains.', err);
  }
});

function setCharacterAnimation(state) {
  if (!characterAnimReady || !playerVisual.anim || lastAnimSpeed === state) return;
  playerVisual.anim.setInteger('movement', state);
  lastAnimSpeed = state;
}

// --- Vehicle --------------------------------------------------------------
const vehicle = new pc.Entity('PlayerVehicle');
vehicle.setPosition(18, 0, -12);
app.root.addChild(vehicle);
createPrimitive('CarChassis', 'box', new pc.Vec3(0, 0.65, 0), new pc.Vec3(2.2, 0.75, 4.2), materials.carBody, vehicle);
createPrimitive('CarCabin', 'box', new pc.Vec3(0, 1.25, -0.15), new pc.Vec3(1.85, 0.75, 2.1), materials.carGlass, vehicle);
for (const [x, z] of [[-1.05,-1.4],[1.05,-1.4],[-1.05,1.4],[1.05,1.4]]) {
  createPrimitive(`Wheel_${x}_${z}`, 'cylinder', new pc.Vec3(x, 0.42, z), new pc.Vec3(0.52, 0.25, 0.52), materials.tyre, vehicle, new pc.Vec3(0,0,90));
}
vehicle.enabled = false;
let vehicleOwned = false;
let driving = false;
let vehicleSpeed = 0;
let vehicleYaw = 0;

function setVehicleAvailable(available) {
  vehicleOwned = Boolean(available);
  vehicle.enabled = vehicleOwned;
}

function enterVehicle() {
  if (!vehicleOwned || driving) return false;
  const p = player.getPosition();
  const v = vehicle.getPosition();
  if (Math.hypot(p.x - v.x, p.z - v.z) > 4.2) return false;
  driving = true;
  playerVisual.enabled = false;
  setCharacterAnimation(0);
  window.dispatchEvent(new CustomEvent('street-hustle-driving', { detail: { driving: true } }));
  return true;
}

function exitVehicle() {
  if (!driving) return false;
  driving = false;
  vehicleSpeed = 0;
  const v = vehicle.getPosition();
  player.setPosition(clamp(v.x + 2.2, -37, 37), 0, clamp(v.z, -37, 37));
  playerVisual.enabled = true;
  window.dispatchEvent(new CustomEvent('street-hustle-driving', { detail: { driving: false } }));
  return true;
}

// --- Lighting and camera --------------------------------------------------
app.scene.ambientLight = new pc.Color(0.48, 0.48, 0.48);
const sun = new pc.Entity('Sun');
sun.addComponent('light', { type: 'directional', color: new pc.Color(1, 0.95, 0.82), intensity: 1.25, castShadows: false });
sun.setEulerAngles(48, 32, 0);
app.root.addChild(sun);

const camera = new pc.Entity('Camera');
camera.addComponent('camera', { clearColor: new pc.Color(0.46, 0.68, 0.88), farClip: 220, fov: 60 });
app.root.addChild(camera);

let cameraYaw = 0;
let cameraPitch = 24;
let cameraDistance = 11;
let cameraDragging = false;
let cameraPointerId = null;
let lastPointerX = 0;
let lastPointerY = 0;
const desiredCamera = new pc.Vec3();
const lookTarget = new pc.Vec3();

function setLighting(hour) {
  const h = ((Number(hour) % 24) + 24) % 24;
  const daylight = clamp(Math.sin(((h - 6) / 12) * Math.PI), 0.08, 1);
  app.scene.ambientLight = new pc.Color(0.12 + daylight * 0.38, 0.14 + daylight * 0.36, 0.18 + daylight * 0.32);
  sun.light.intensity = 0.12 + daylight * 1.2;
  camera.camera.clearColor = new pc.Color(0.05 + daylight * 0.41, 0.08 + daylight * 0.60, 0.14 + daylight * 0.74);
}

function inputHeld(code) { return keys.has(code) || virtualKeys.has(code); }
function uiBlocked() { return Boolean(window.StreetHustleUIBlocking); }

window.addEventListener('keydown', (event) => {
  const code = event.key.toLowerCase();
  keys.add(code);
  if (code === 'e' && !event.repeat) window.dispatchEvent(new CustomEvent('street-hustle-interact'));
  if (code === 'escape' && driving) exitVehicle();
});
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); runRequested = false; });

for (const button of document.querySelectorAll('[data-key]')) {
  const key = button.dataset.key;
  const press = (event) => { event.preventDefault(); event.stopPropagation(); virtualKeys.add(key); };
  const release = (event) => { event.preventDefault(); event.stopPropagation(); virtualKeys.delete(key); };
  button.addEventListener('pointerdown', press);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('pointerleave', release);
}

interactButton?.addEventListener('pointerdown', (event) => {
  event.preventDefault(); event.stopPropagation();
  window.dispatchEvent(new CustomEvent('street-hustle-interact'));
});

if (runButton) {
  const start = (event) => { event.preventDefault(); event.stopPropagation(); runRequested = true; };
  const stop = (event) => { event.preventDefault(); event.stopPropagation(); runRequested = false; };
  runButton.addEventListener('pointerdown', start);
  runButton.addEventListener('pointerup', stop);
  runButton.addEventListener('pointercancel', stop);
  runButton.addEventListener('pointerleave', stop);
}

canvas.addEventListener('pointerdown', (event) => {
  if (uiBlocked()) return;
  if (event.pointerType === 'mouse' && event.button !== 0 && event.button !== 2) return;
  cameraDragging = true; cameraPointerId = event.pointerId; lastPointerX = event.clientX; lastPointerY = event.clientY;
  canvas.setPointerCapture?.(event.pointerId); event.preventDefault();
});
canvas.addEventListener('pointermove', (event) => {
  if (!cameraDragging || event.pointerId !== cameraPointerId) return;
  const dx = event.clientX - lastPointerX; const dy = event.clientY - lastPointerY;
  lastPointerX = event.clientX; lastPointerY = event.clientY;
  cameraYaw -= dx * 0.28; cameraPitch = clamp(cameraPitch + dy * 0.22, 10, 58); event.preventDefault();
});
function stopCameraDrag(event) {
  if (event.pointerId !== cameraPointerId) return;
  cameraDragging = false; cameraPointerId = null; canvas.releasePointerCapture?.(event.pointerId);
}
canvas.addEventListener('pointerup', stopCameraDrag);
canvas.addEventListener('pointercancel', stopCameraDrag);
canvas.addEventListener('contextmenu', (event) => event.preventDefault());
canvas.addEventListener('wheel', (event) => { cameraDistance = clamp(cameraDistance + event.deltaY * 0.01, 6.5, 18); event.preventDefault(); }, { passive: false });

function movePlayer(dt) {
  const pos = player.getPosition();
  let forwardInput = 0, strafeInput = 0;
  if (inputHeld('w') || inputHeld('arrowup')) forwardInput += 1;
  if (inputHeld('s') || inputHeld('arrowdown')) forwardInput -= 1;
  if (inputHeld('d') || inputHeld('arrowright')) strafeInput += 1;
  if (inputHeld('a') || inputHeld('arrowleft')) strafeInput -= 1;
  const mag = Math.hypot(forwardInput, strafeInput);
  if (!mag || uiBlocked()) { setCharacterAnimation(0); return; }
  forwardInput /= mag; strafeInput /= mag;
  const yawRad = cameraYaw * Math.PI / 180;
  const forwardX = -Math.sin(yawRad), forwardZ = -Math.cos(yawRad);
  const rightX = Math.cos(yawRad), rightZ = -Math.sin(yawRad);
  const moveX = forwardX * forwardInput + rightX * strafeInput;
  const moveZ = forwardZ * forwardInput + rightZ * strafeInput;
  const wantsRun = inputHeld('shift') || runRequested;
  const speed = wantsRun ? 11.2 : 6.1;
  const nx = clamp(pos.x + moveX * speed * dt, -38, 38);
  const nz = clamp(pos.z + moveZ * speed * dt, -38, 38);
  if (!blocked(nx, pos.z)) pos.x = nx;
  if (!blocked(pos.x, nz)) pos.z = nz;
  player.setPosition(pos);
  player.setEulerAngles(0, Math.atan2(moveX, -moveZ) * 180 / Math.PI, 0);
  setCharacterAnimation(wantsRun ? 2 : 1);
}

function driveVehicle(dt) {
  if (uiBlocked()) return;
  let throttle = 0, steer = 0;
  if (inputHeld('w') || inputHeld('arrowup')) throttle += 1;
  if (inputHeld('s') || inputHeld('arrowdown')) throttle -= 1;
  if (inputHeld('a') || inputHeld('arrowleft')) steer -= 1;
  if (inputHeld('d') || inputHeld('arrowright')) steer += 1;
  const accel = throttle * 12;
  vehicleSpeed += accel * dt;
  vehicleSpeed *= Math.pow(0.42, dt);
  vehicleSpeed = clamp(vehicleSpeed, -6, 15);
  if (Math.abs(vehicleSpeed) > 0.25) vehicleYaw += steer * (52 * dt) * Math.sign(vehicleSpeed);
  const rad = vehicleYaw * Math.PI / 180;
  const pos = vehicle.getPosition();
  const nx = clamp(pos.x - Math.sin(rad) * vehicleSpeed * dt, -37, 37);
  const nz = clamp(pos.z - Math.cos(rad) * vehicleSpeed * dt, -37, 37);
  if (!blocked(nx, pos.z, 1.6)) pos.x = nx; else vehicleSpeed *= -0.15;
  if (!blocked(pos.x, nz, 1.6)) pos.z = nz; else vehicleSpeed *= -0.15;
  vehicle.setPosition(pos); vehicle.setEulerAngles(0, vehicleYaw, 0);
}

app.on('update', (dt) => {
  if (driving) driveVehicle(dt); else movePlayer(dt);
  const target = driving ? vehicle.getPosition() : player.getPosition();
  const targetHeight = driving ? 1.0 : 1.65;
  const distance = driving ? Math.max(cameraDistance, 12) : cameraDistance;
  const yawRad = cameraYaw * Math.PI / 180;
  const pitchRad = cameraPitch * Math.PI / 180;
  const horizontal = Math.cos(pitchRad) * distance;
  const vertical = Math.sin(pitchRad) * distance;
  lookTarget.set(target.x, targetHeight, target.z);
  desiredCamera.set(target.x + Math.sin(yawRad) * horizontal, lookTarget.y + vertical, target.z + Math.cos(yawRad) * horizontal);
  const camPos = camera.getPosition();
  const smooth = 1 - Math.pow(0.002, dt);
  camPos.x += (desiredCamera.x - camPos.x) * smooth;
  camPos.y += (desiredCamera.y - camPos.y) * smooth;
  camPos.z += (desiredCamera.z - camPos.z) * smooth;
  camera.setPosition(camPos); camera.lookAt(lookTarget);
});

window.StreetHustleWorld = {
  app, player, playerVisual, camera, sun, vehicle,
  get driving() { return driving; },
  get vehicleOwned() { return vehicleOwned; },
  setVehicleAvailable,
  enterVehicle,
  exitVehicle,
  blocked,
  setLighting,
  teleport(x, z) { player.setPosition(clamp(x, -37, 37), 0, clamp(z, -37, 37)); },
  getControlledPosition() { return (driving ? vehicle : player).getPosition(); }
};

setLighting(9);
const loadingEl = document.getElementById('loading');
loadingEl?.remove();
