import * as pc from 'playcanvas';

// Imported 3D character files can use very different unit scales.
// This small normalizer waits for the prototype character to appear,
// measures its rendered world-space height, then scales it to a sensible
// Street Hustle human height and places its feet on the ground.

const TARGET_HEIGHT = 2.75;
const MAX_WAIT_MS = 15000;
const CHECK_EVERY_MS = 120;

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
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
  return { minX, minY, minZ, maxX, maxY, maxZ };
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

    // Give PlayCanvas a couple of render frames to calculate mesh AABBs.
    await nextFrame();
    await nextFrame();

    const before = getWorldBounds(humanoid);
    if (!before) {
      await new Promise((resolve) => setTimeout(resolve, CHECK_EVERY_MS));
      continue;
    }

    const currentHeight = before.maxY - before.minY;
    if (!Number.isFinite(currentHeight) || currentHeight <= 0.001) return;

    const correction = TARGET_HEIGHT / currentHeight;
    const currentScale = humanoid.getLocalScale();
    humanoid.setLocalScale(
      currentScale.x * correction,
      currentScale.y * correction,
      currentScale.z * correction
    );

    // Wait for the bounds to update after scaling, then lift/lower the model
    // so that its lowest rendered point sits on y = 0.
    await nextFrame();
    await nextFrame();

    const after = getWorldBounds(humanoid);
    if (after) {
      const local = humanoid.getLocalPosition();
      humanoid.setLocalPosition(local.x, local.y - after.minY, local.z);
    }

    console.info(
      `Street Hustle: normalized prototype character from ${currentHeight.toFixed(2)} to about ${TARGET_HEIGHT} world units.`
    );
    return;
  }

  console.warn('Street Hustle: character normalizer timed out before the prototype humanoid appeared.');
}

normalizeCharacter();
