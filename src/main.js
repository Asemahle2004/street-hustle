import * as pc from 'playcanvas';

const canvas = document.getElementById('application');
const app = new pc.Application(canvas);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.start();

const cashEl = document.getElementById('cash');
const repEl = document.getElementById('rep');
const objectiveEl = document.getElementById('objective');
const interactionEl = document.getElementById('interaction');
const loadingEl = document.getElementById('loading');
const interactButton = document.getElementById('interact-button');
const runButton = document.getElementById('run-button');

let cash = 0;
let reputation = 0;
let carWashDone = false;
let interactRequested = false;
let runRequested = false;
let characterAnimReady = false;
let lastAnimSpeed = -1;

const keys = new Set();
const virtualKeys = new Set();

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
  grass: makeMaterial(0.19, 0.42, 0.17, 0, 0.1),
  road: makeMaterial(0.12, 0.13, 0.14, 0, 0.15),
  line: makeMaterial(0.92, 0.82, 0.2, 0, 0.1),
  concrete: makeMaterial(0.62, 0.62, 0.58, 0, 0.12),
  houseA: makeMaterial(0.72, 0.45, 0.27, 0, 0.2),
  houseB: makeMaterial(0.45, 0.61, 0.72, 0, 0.2),
  houseC: makeMaterial(0.72, 0.68, 0.42, 0, 0.2),
  roof: makeMaterial(0.27, 0.20, 0.16, 0, 0.1),
  shop: makeMaterial(0.25, 0.48, 0.34, 0, 0.25),
  player: makeMaterial(0.12, 0.31, 0.72, 0, 0.2),
  skin: makeMaterial(0.34, 0.19, 0.12, 0, 0.15),
  job: makeMaterial(0.95, 0.58, 0.08, 0, 0.3),
  tree: makeMaterial(0.16, 0.38, 0.13, 0, 0.1),
  trunk: makeMaterial(0.28, 0.16, 0.08, 0, 0.05)
};

const obstacles = [];

function createPrimitive(name, type, position, scale, material, parent = app.root) {
  const entity = new pc.Entity(name);
  entity.addComponent('model', { type });
  entity.setPosition(position.x, position.y, position.z);
  entity.setLocalScale(scale.x, scale.y, scale.z);
  entity.model.material = material;
  parent.addChild(entity);
  return entity;
}

function createBuilding(name, x, z, width, depth, height, material) {
  const body = createPrimitive(
    name,
    'box',
    new pc.Vec3(x, height / 2, z),
    new pc.Vec3(width, height, depth),
    material
  );

  createPrimitive(
    `${name}_Roof`,
    'box',
    new pc.Vec3(x, height + 0.18, z),
    new pc.Vec3(width + 0.3, 0.32, depth + 0.3),
    materials.roof
  );

  obstacles.push({
    minX: x - width / 2,
    maxX: x + width / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2
  });

  return body;
}

function createTree(x, z) {
  createPrimitive('TreeTrunk', 'cylinder', new pc.Vec3(x, 1.1, z), new pc.Vec3(0.42, 2.2, 0.42), materials.trunk);
  createPrimitive('TreeTop', 'sphere', new pc.Vec3(x, 3.1, z), new pc.Vec3(2.1, 2.1, 2.1), materials.tree);
}

function blocked(x, z) {
  const padding = 0.7;
  if (Math.abs(x) > 38 || Math.abs(z) > 38) return true;

  return obstacles.some((o) =>
    x > o.minX - padding &&
    x < o.maxX + padding &&
    z > o.minZ - padding &&
    z < o.maxZ + padding
  );
}

// World
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

// Car wash area: open space, not a collision obstacle.
createPrimitive('CarWashPad', 'box', new pc.Vec3(-16, 0.06, -25), new pc.Vec3(10, 0.12, 8), materials.concrete);
createPrimitive('CarWashMarker', 'cylinder', new pc.Vec3(-16, 0.35, -25), new pc.Vec3(2.2, 0.55, 2.2), materials.job);

for (const [x, z] of [[-25, 28], [24, 28], [-26, 10], [25, 4], [-26, -12], [27, -15], [-27, -30], [27, -31]]) {
  createTree(x, z);
}

// Player root controls position, collision and facing direction.
const player = new pc.Entity('Player');
player.setPosition(0, 0, 25);
app.root.addChild(player);

// Visuals live under a separate child so imported model orientation can be corrected
// without changing the player's movement direction.
const playerVisual = new pc.Entity('PlayerVisual');
player.addChild(playerVisual);

// Lightweight fallback is shown while the real prototype humanoid is loading.
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
    const names = [animationAsset.name, track?.name]
      .filter(Boolean)
      .map((name) => String(name).toLowerCase());

    if (names.some((name) => name === target || name.endsWith(`/${target}`) || name.includes(target))) {
      return track;
    }
  }

  return null;
}

function configureCharacterAnimation(containerAsset) {
  const animations = containerAsset.resource.animations ?? [];
  const idleTrack = findAnimationTrack(animations, 'Idle');
  const walkTrack = findAnimationTrack(animations, 'Walk');
  const runTrack = findAnimationTrack(animations, 'Run');

  if (!idleTrack || !walkTrack || !runTrack) {
    console.warn('Street Hustle: humanoid loaded, but Idle/Walk/Run tracks were not all found.');
    return;
  }

  playerVisual.addComponent('anim', { activate: true });

  const stateGraph = {
    layers: [
      {
        name: 'locomotion',
        states: [
          { name: 'START' },
          { name: 'Idle', speed: 1 },
          { name: 'Walk', speed: 1 },
          { name: 'Run', speed: 1 },
          { name: 'END' }
        ],
        transitions: [
          { from: 'START', to: 'Idle', time: 0, priority: 0 },
          {
            from: 'Idle',
            to: 'Walk',
            time: 0.16,
            priority: 0,
            conditions: [{ parameterName: 'movement', predicate: pc.ANIM_GREATER_THAN, value: 0 }]
          },
          {
            from: 'Walk',
            to: 'Idle',
            time: 0.18,
            priority: 0,
            conditions: [{ parameterName: 'movement', predicate: pc.ANIM_LESS_THAN_EQUAL_TO, value: 0 }]
          },
          {
            from: 'Walk',
            to: 'Run',
            time: 0.15,
            priority: 0,
            conditions: [{ parameterName: 'movement', predicate: pc.ANIM_GREATER_THAN, value: 1 }]
          },
          {
            from: 'Run',
            to: 'Walk',
            time: 0.15,
            priority: 0,
            conditions: [{ parameterName: 'movement', predicate: pc.ANIM_LESS_THAN, value: 2 }]
          }
        ]
      }
    ],
    parameters: {
      movement: {
        name: 'movement',
        type: pc.ANIM_PARAMETER_INTEGER,
        value: 0
      }
    }
  };

  playerVisual.anim.loadStateGraph(stateGraph);
  const locomotion = playerVisual.anim.baseLayer;
  locomotion.assignAnimation('Idle', idleTrack);
  locomotion.assignAnimation('Walk', walkTrack);
  locomotion.assignAnimation('Run', runTrack);
  playerVisual.anim.setInteger('movement', 0);
  characterAnimReady = true;
  lastAnimSpeed = 0;
}

// Temporary prototype humanoid. It is streamed by the browser, so there is no PC installation.
// It will later be replaced by Street Hustle's own character art.
const PROTOTYPE_CHARACTER_URL = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Soldier.glb';

app.assets.loadFromUrlAndFilename(PROTOTYPE_CHARACTER_URL, 'Soldier.glb', 'container', (error, asset) => {
  if (error || !asset?.resource) {
    console.warn('Street Hustle: prototype humanoid could not load. Keeping fallback character.', error);
    return;
  }

  try {
    const humanoid = asset.resource.instantiateRenderEntity({ castShadows: false });
    humanoid.name = 'PrototypeHumanoid';
    humanoid.setLocalPosition(0, 0, 0);
    humanoid.setLocalScale(1.25, 1.25, 1.25);
    // Three.js sample faces the opposite way to our movement convention.
    humanoid.setLocalEulerAngles(0, 180, 0);
    playerVisual.addChild(humanoid);

    fallbackVisual.enabled = false;
    configureCharacterAnimation(asset);
  } catch (loadError) {
    console.warn('Street Hustle: humanoid setup failed. Keeping fallback character.', loadError);
    fallbackVisual.enabled = true;
  }
});

// Lighting
app.scene.ambientLight = new pc.Color(0.48, 0.48, 0.48);

const sun = new pc.Entity('Sun');
sun.addComponent('light', {
  type: 'directional',
  color: new pc.Color(1, 0.95, 0.82),
  intensity: 1.25,
  castShadows: false
});
sun.setEulerAngles(48, 32, 0);
app.root.addChild(sun);

// Third-person orbit camera.
const camera = new pc.Entity('Camera');
camera.addComponent('camera', {
  clearColor: new pc.Color(0.46, 0.68, 0.88),
  farClip: 180,
  fov: 60
});
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

function inputHeld(code) {
  return keys.has(code) || virtualKeys.has(code);
}

function requestInteraction() {
  interactRequested = true;
}

window.addEventListener('keydown', (event) => {
  const code = event.key.toLowerCase();
  keys.add(code);
  if (code === 'e') requestInteraction();
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.key.toLowerCase());
});

window.addEventListener('blur', () => {
  keys.clear();
  runRequested = false;
});

for (const button of document.querySelectorAll('[data-key]')) {
  const key = button.dataset.key;
  const press = (event) => {
    event.preventDefault();
    event.stopPropagation();
    virtualKeys.add(key);
  };
  const release = (event) => {
    event.preventDefault();
    event.stopPropagation();
    virtualKeys.delete(key);
  };

  button.addEventListener('pointerdown', press);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('pointerleave', release);
}

interactButton.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  event.stopPropagation();
  requestInteraction();
});

if (runButton) {
  const startRun = (event) => {
    event.preventDefault();
    event.stopPropagation();
    runRequested = true;
  };
  const stopRun = (event) => {
    event.preventDefault();
    event.stopPropagation();
    runRequested = false;
  };

  runButton.addEventListener('pointerdown', startRun);
  runButton.addEventListener('pointerup', stopRun);
  runButton.addEventListener('pointercancel', stopRun);
  runButton.addEventListener('pointerleave', stopRun);
}

// Drag directly on the 3D view to rotate the camera.
canvas.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'mouse' && event.button !== 0 && event.button !== 2) return;

  cameraDragging = true;
  cameraPointerId = event.pointerId;
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
  canvas.setPointerCapture?.(event.pointerId);
  event.preventDefault();
});

canvas.addEventListener('pointermove', (event) => {
  if (!cameraDragging || event.pointerId !== cameraPointerId) return;

  const dx = event.clientX - lastPointerX;
  const dy = event.clientY - lastPointerY;
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;

  cameraYaw -= dx * 0.28;
  cameraPitch = clamp(cameraPitch + dy * 0.22, 10, 55);
  event.preventDefault();
});

function stopCameraDrag(event) {
  if (event.pointerId !== cameraPointerId) return;
  cameraDragging = false;
  cameraPointerId = null;
  canvas.releasePointerCapture?.(event.pointerId);
}

canvas.addEventListener('pointerup', stopCameraDrag);
canvas.addEventListener('pointercancel', stopCameraDrag);
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

canvas.addEventListener('wheel', (event) => {
  cameraDistance = clamp(cameraDistance + event.deltaY * 0.01, 6.5, 17);
  event.preventDefault();
}, { passive: false });

function updateHud() {
  cashEl.textContent = `CASH: R${cash}`;
  repEl.textContent = `REP: ${reputation}`;

  if (cash >= 30) {
    objectiveEl.textContent = 'OBJECTIVE COMPLETE: You earned your first R30';
  }
}

function showInteraction(text) {
  interactionEl.textContent = text;
  interactionEl.classList.toggle('visible', Boolean(text));
}

function distanceXZ(a, x, z) {
  const dx = a.x - x;
  const dz = a.z - z;
  return Math.sqrt(dx * dx + dz * dz);
}

function setCharacterAnimationSpeed(speedState) {
  if (!characterAnimReady || !playerVisual.anim || lastAnimSpeed === speedState) return;
  playerVisual.anim.setInteger('movement', speedState);
  lastAnimSpeed = speedState;
}

app.on('update', (dt) => {
  const pos = player.getPosition();

  let forwardInput = 0;
  let strafeInput = 0;

  if (inputHeld('w') || inputHeld('arrowup')) forwardInput += 1;
  if (inputHeld('s') || inputHeld('arrowdown')) forwardInput -= 1;
  if (inputHeld('d') || inputHeld('arrowright')) strafeInput += 1;
  if (inputHeld('a') || inputHeld('arrowleft')) strafeInput -= 1;

  const inputMagnitude = Math.hypot(forwardInput, strafeInput);
  const wantsToRun = inputHeld('shift') || runRequested;

  if (inputMagnitude > 0) {
    forwardInput /= inputMagnitude;
    strafeInput /= inputMagnitude;

    const yawRad = cameraYaw * Math.PI / 180;

    // Movement is relative to the direction the camera is facing.
    const forwardX = -Math.sin(yawRad);
    const forwardZ = -Math.cos(yawRad);
    const rightX = Math.cos(yawRad);
    const rightZ = -Math.sin(yawRad);

    const moveX = forwardX * forwardInput + rightX * strafeInput;
    const moveZ = forwardZ * forwardInput + rightZ * strafeInput;

    const speed = wantsToRun ? 11.5 : 6.2;
    const nextX = clamp(pos.x + moveX * speed * dt, -38, 38);
    const nextZ = clamp(pos.z + moveZ * speed * dt, -38, 38);

    if (!blocked(nextX, pos.z)) pos.x = nextX;
    if (!blocked(pos.x, nextZ)) pos.z = nextZ;

    player.setPosition(pos);

    const playerYaw = Math.atan2(moveX, -moveZ) * 180 / Math.PI;
    player.setEulerAngles(0, playerYaw, 0);
    setCharacterAnimationSpeed(wantsToRun ? 2 : 1);
  } else {
    setCharacterAnimationSpeed(0);
  }

  // Orbit camera around the player using yaw, pitch and zoom distance.
  const yawRad = cameraYaw * Math.PI / 180;
  const pitchRad = cameraPitch * Math.PI / 180;
  const horizontalDistance = Math.cos(pitchRad) * cameraDistance;
  const verticalDistance = Math.sin(pitchRad) * cameraDistance;

  lookTarget.set(pos.x, 1.65, pos.z);
  desiredCamera.set(
    pos.x + Math.sin(yawRad) * horizontalDistance,
    lookTarget.y + verticalDistance,
    pos.z + Math.cos(yawRad) * horizontalDistance
  );

  const camPos = camera.getPosition();
  const smooth = 1 - Math.pow(0.002, dt);
  camPos.x += (desiredCamera.x - camPos.x) * smooth;
  camPos.y += (desiredCamera.y - camPos.y) * smooth;
  camPos.z += (desiredCamera.z - camPos.z) * smooth;
  camera.setPosition(camPos);
  camera.lookAt(lookTarget);

  const nearCarWash = distanceXZ(pos, -16, -25) < 4.3;
  if (nearCarWash && !carWashDone) {
    showInteraction('CAR WASH JOB · Press E · Earn R30');
    if (interactRequested) {
      cash += 30;
      reputation += 1;
      carWashDone = true;
      updateHud();
      showInteraction('Job complete! +R30 · +1 REP');
    }
  } else if (!nearCarWash) {
    showInteraction('');
  }

  interactRequested = false;
});

updateHud();
loadingEl.remove();
