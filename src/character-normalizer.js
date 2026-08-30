import * as pc from 'playcanvas';

// Imported 3D character files can use very different coordinate systems,
// orientations and unit scales. This helper waits for the prototype character,
// automatically finds the orientation that makes it stand upright, scales it
// to a sensible human height, then places its feet on the ground.

const TARGET_HEIGHT = 2.75;
const MAX_WAIT_MS = 15000;
const CHECK_EVERY_MS = 120;

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function settleFrames(count = 2) {
  for (let i = 0; i < count; i += 1) await nextFrame();
}

function getWorldBounds(entity) {
  const renderComponents = entity.findComponents('render');

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  let found = false;

  for (const render of renderComponents) {
    for (const meshInstance of render.meshInstances ?? []) {
      const aabb = meshInstance.aabb;
      if (!aabb) continue;

      const c = aabb.center;
      const h = aabb.halfExtents;
      minX = Math.min(minX, c.x - h.x);
      minY = Math.min(minY, c.y - h.y);
      minZ = Math.min(minZ, c.z - h.z);
      maxX = Math.max(maxX, c.x + h.x);
      maxY = Math.max(maxY, c.y + h.y);
      maxZ = Math.max(maxZ, c.z + h.z);
      found = true;
    }
  }

  if (!found) return null;

  return {
    minX,
    minY,
    minZ,
    maxX,
    maxY,
    maxZ,
    width: maxX - minX,
    height: maxY - minY,
    depth: maxZ - minZ
  };
}

async function chooseUprightOrientation(humanoid) {
  // Keep the character's intended 180 degree facing direction while trying
  // the common X/Z axis corrections used by imported glTF/FBX rigs.
  const candidates = [
    { x: 0, y: 180, z: 0 },
    { x: 90, y: 180, z: 0 },
    { x: -90, y: 180, z: 0 },
    { x: 0, y: 180, z: 90 },
    { x: 0, y: 180, z: -90 },
    { x: 180, y: 180, z: 0 }
  ];

  let best = null;

  for (const rotation of candidates) {
    humanoid.setLocalEulerAngles(rotation.x, rotation.y, rotation.z);
    await settleFrames(2);

    const bounds = getWorldBounds(humanoid);
    if (!bounds) continue;

    // A standing human should be clearly taller vertically than horizontally.
    const horizontal = Math.max(bounds.width, bounds.depth, 0.001);
    const score = bounds.height / horizontal;

    if (!best || score > best.score) {
      best = { rotation, score, bounds };
    }
  }

  if (!best) return null;

  humanoid.setLocalEulerAngles(best.rotation.x, best.rotation.y, best.rotation.z);
  await settleFrames(2);

  console.info(
    `Street Hustle: selected upright character rotation X=${best.rotation.x}, Y=${best.rotation.y}, Z=${best.rotation.z}.`
  );

  return getWorldBounds(humanoid);
}

async function normalizeCharacter() {
  const started = performance.now();

  while (performance.now() - started < MAX_WAIT_MS) {
    const app = pc.Application.getApplication('application') ?? pc.Application.getApplication();
    const humanoid = app?.root?.findByName('PrototypeHumanoid');

    if (!humanoid) {
      await new Promise((resolve) => setTimeout(resolve, CHECK_EVERY_MS));
      continue;
    }

    // Let PlayCanvas calculate initial mesh AABBs and animation transforms.
    await settleFrames(3);

    const uprightBounds = await chooseUprightOrientation(humanoid);
    if (!uprightBounds) {
      await new Promise((resolve) => setTimeout(resolve, CHECK_EVERY_MS));
      continue;
    }

    const currentHeight = uprightBounds.height;
    if (!Number.isFinite(currentHeight) || currentHeight <= 0.001) return;

    const correction = TARGET_HEIGHT / currentHeight;
    const currentScale = humanoid.getLocalScale();

    humanoid.setLocalScale(
      currentScale.x * correction,
      currentScale.y * correction,
      currentScale.z * correction
    );

    // Wait for scaled bounds, then move the visual so its lowest rendered
    // point is on y = 0. This affects visuals only, not player movement.
    await settleFrames(3);

    const after = getWorldBounds(humanoid);
    if (after) {
      const local = humanoid.getLocalPosition();
      humanoid.setLocalPosition(local.x, local.y - after.minY, local.z);
    }

    console.info(
      `Street Hustle: normalized prototype character to about ${TARGET_HEIGHT} world units tall and placed feet on the ground.`
    );
    return;
  }

  console.warn('Street Hustle: character normalizer timed out before the prototype humanoid appeared.');
}

normalizeCharacter();
