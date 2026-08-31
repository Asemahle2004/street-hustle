import * as pc from 'playcanvas';

// STREET HUSTLE — REAL PEOPLE PROTOTYPE LAYER
// Replaces primitive NPC bodies with skinned humanoid prototype models where
// possible. Existing box characters remain as fallbacks if a model fails.
// Ambient NPC roots are still moved by living-world.js, so these humanoids
// automatically walk routes, stop, turn and continue with that system.

const world = window.StreetHustleWorld;
const app = world?.app;

if (!app) {
  console.error('Street Hustle real-people layer could not start: world core missing.');
} else {
  const TARGET_HEIGHT = 2.65;
  const MODEL_URLS = {
    xbot: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Xbot.glb',
    michelle: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Michelle.glb',
    soldier: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Soldier.glb'
  };

  const assignments = [
    ['NPC_Ma', 'michelle', false],
    ['NPC_Sipho', 'xbot', false],
    ['NPC_Ayanda', 'michelle', false],
    ['NPC_Vusi', 'soldier', false],
    ['NPC_Shopkeeper', 'xbot', false],
    ['NPC_Thando', 'xbot', false],
    ['AmbientNPC_Lebo', 'michelle', true],
    ['AmbientNPC_Musa', 'xbot', true],
    ['AmbientNPC_Nandi', 'michelle', true],
    ['AmbientNPC_Bongani', 'xbot', true],
    ['AmbientNPC_Amahle', 'michelle', true],
    ['AmbientNPC_Sizwe', 'xbot', true]
  ];

  const loaded = new Map();
  const upgraded = new Map();

  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  async function settle(count = 2) {
    for (let i = 0; i < count; i += 1) await nextFrame();
  }

  function getBounds(entity) {
    const renders = entity.findComponents('render');
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    let found = false;

    for (const render of renders) {
      for (const mesh of render.meshInstances ?? []) {
        const aabb = mesh.aabb;
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
      minX, minY, minZ, maxX, maxY, maxZ,
      width: maxX - minX,
      height: maxY - minY,
      depth: maxZ - minZ
    };
  }

  async function orientAndScale(model) {
    const candidates = [
      { x: 0, y: 180, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 90, y: 180, z: 0 },
      { x: -90, y: 180, z: 0 },
      { x: 0, y: 180, z: 90 },
      { x: 0, y: 180, z: -90 }
    ];

    let best = null;
    for (const r of candidates) {
      model.setLocalEulerAngles(r.x, r.y, r.z);
      await settle(2);
      const b = getBounds(model);
      if (!b) continue;
      const horizontal = Math.max(b.width, b.depth, 0.001);
      const score = b.height / horizontal;
      if (!best || score > best.score) best = { r, score };
    }

    if (!best) return false;
    model.setLocalEulerAngles(best.r.x, best.r.y, best.r.z);
    await settle(2);
    const before = getBounds(model);
    if (!before || before.height < 0.001) return false;

    const factor = TARGET_HEIGHT / before.height;
    const s = model.getLocalScale();
    model.setLocalScale(s.x * factor, s.y * factor, s.z * factor);
    await settle(3);

    const after = getBounds(model);
    if (after) {
      const p = model.getLocalPosition();
      model.setLocalPosition(p.x, p.y - after.minY, p.z);
    }
    return true;
  }

  function findTrack(asset, names) {
    const animations = asset.resource?.animations ?? [];
    for (const wanted of names) {
      const target = wanted.toLowerCase();
      for (const animation of animations) {
        const track = animation.resource ?? animation;
        const labels = [animation.name, track?.name]
          .filter(Boolean)
          .map((name) => String(name).toLowerCase());
        if (labels.some((name) => name === target || name.includes(target))) return track;
      }
    }
    return null;
  }

  function configureAnimation(host, asset, walking) {
    const walk = findTrack(asset, ['walk', 'walking', 'run']);
    const idle = findTrack(asset, ['idle', 'standing', 'breathing']) ?? walk;
    if (!idle && !walk) return;

    try {
      host.addComponent('anim', { activate: true });
      host.anim.loadStateGraph({
        layers: [{
          name: 'npc',
          states: [{ name: 'START' }, { name: 'Idle' }, { name: 'Walk' }, { name: 'END' }],
          transitions: [{ from: 'START', to: walking && walk ? 'Walk' : 'Idle', time: 0 }]
        }],
        parameters: {}
      });
      if (idle) host.anim.baseLayer.assignAnimation('Idle', idle);
      if (walk) host.anim.baseLayer.assignAnimation('Walk', walk);
    } catch (error) {
      console.warn('Street Hustle: NPC animation setup skipped.', error);
    }
  }

  function hidePrimitiveFallback(root) {
    for (const modelComponent of root.findComponents('model')) {
      modelComponent.enabled = false;
    }
  }

  function restorePrimitiveFallback(root) {
    for (const modelComponent of root.findComponents('model')) {
      modelComponent.enabled = true;
    }
  }

  function loadAsset(id) {
    if (loaded.has(id)) return loaded.get(id);
    const promise = new Promise((resolve, reject) => {
      const url = MODEL_URLS[id];
      app.assets.loadFromUrlAndFilename(url, `${id}.glb`, 'container', (error, asset) => {
        if (error || !asset?.resource) reject(error || new Error(`Could not load ${id}`));
        else resolve(asset);
      });
    });
    loaded.set(id, promise);
    return promise;
  }

  async function upgradeNpc(rootName, modelId, walking) {
    const started = performance.now();
    let root = null;
    while (!root && performance.now() - started < 20000) {
      root = app.root.findByName(rootName);
      if (!root) await new Promise((resolve) => setTimeout(resolve, 180));
    }
    if (!root || upgraded.has(rootName)) return;

    try {
      const asset = await loadAsset(modelId);
      const host = new pc.Entity(`${rootName}_RealVisual`);
      root.addChild(host);
      const model = asset.resource.instantiateRenderEntity({ castShadows: false });
      model.name = `${rootName}_Humanoid`;
      host.addChild(model);
      model.setLocalPosition(0, 0, 0);
      model.setLocalScale(1, 1, 1);

      const okay = await orientAndScale(model);
      if (!okay) throw new Error('Could not normalize humanoid bounds');

      configureAnimation(host, asset, walking);
      hidePrimitiveFallback(root);
      upgraded.set(rootName, { root, host, walking, modelId });
    } catch (error) {
      restorePrimitiveFallback(root);
      console.warn(`Street Hustle: kept fallback NPC for ${rootName}.`, error);
    }
  }

  // Load the two lighter crowd archetypes first. The soldier is usually already
  // cached because the player character uses the same URL.
  Promise.allSettled([
    loadAsset('xbot'),
    loadAsset('michelle'),
    loadAsset('soldier')
  ]).then(() => {
    for (const [rootName, modelId, walking] of assignments) {
      upgradeNpc(rootName, modelId, walking);
    }
  });

  // Ambient people are moved/rotated by living-world.js. If they are waiting at
  // a waypoint, pause their animation; once they move again, resume it. We infer
  // this from root velocity so people no longer moonwalk or walk in place.
  const previous = new Map();
  let sampleAccumulator = 0;
  app.on('update', (dt) => {
    sampleAccumulator += dt;
    if (sampleAccumulator < 0.16) return;
    const sampleDt = sampleAccumulator;
    sampleAccumulator = 0;

    for (const [name, data] of upgraded) {
      if (!data.walking || !data.host.anim || !data.root.enabled) continue;
      const pos = data.root.getPosition();
      const old = previous.get(name);
      previous.set(name, pos.clone());
      if (!old) continue;
      const speed = Math.hypot(pos.x - old.x, pos.z - old.z) / Math.max(sampleDt, 0.001);
      try {
        const layer = data.host.anim.baseLayer;
        if (speed > 0.12 && layer.activeState !== 'Walk') layer.transition('Walk', 0.15);
        if (speed <= 0.12 && layer.activeState !== 'Idle') layer.transition('Idle', 0.18);
      } catch {
        // Some imported clips do not expose runtime transitions consistently.
        // The NPC still moves and turns correctly even if animation switching is skipped.
      }
    }
  });

  window.StreetHustleRealPeople = {
    get upgradedCount() { return upgraded.size; },
    assignments: assignments.map(([name, model, walking]) => ({ name, model, walking }))
  };
}
