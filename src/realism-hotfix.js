import * as pc from 'playcanvas';

// STREET HUSTLE — REALISM HOTFIX
// Fixes two runtime issues exposed by Alpha 0.10 testing:
// 1) vehicle decoration was sometimes attached to scaled child meshes, causing
//    plates/lights/bumpers to stretch across the road;
// 2) pedestrians could converge on the same route point and visually stack.

const world = window.StreetHustleWorld;
const app = world?.app;

if (!app) {
  console.error('Street Hustle realism hotfix could not start: world core missing.');
} else {
  function material(r, g, b, metalness = 0, gloss = .2, emissive = null) {
    const m = new pc.StandardMaterial();
    m.diffuse = new pc.Color(r, g, b);
    m.metalness = metalness;
    m.gloss = gloss;
    if (emissive) {
      m.emissive = new pc.Color(emissive[0], emissive[1], emissive[2]);
      m.emissiveIntensity = emissive[3] ?? 1;
    }
    m.update();
    return m;
  }

  const mat = {
    black: material(.025,.025,.028,0,.08),
    white: material(.88,.88,.84,0,.15),
    head: material(.92,.90,.72,0,.4,[.9,.85,.55,.7]),
    tail: material(.58,.012,.008,0,.32,[.62,.006,.004,.45])
  };

  function walk(root, visitor) {
    visitor(root);
    for (const child of [...root.children]) walk(child, visitor);
  }

  // Remove every decoration produced by the buggy scanner. We rebuild only the
  // correct subset below. The name test is deliberately narrow so native vehicle
  // geometry and the newer detailed traffic system are not touched.
  const badDecorationPattern = /_(FrontBumper|RearBumper|PlateFront|PlateRear|Head_-?\.?\d+|Tail_-?\.?\d+|Mirror_-?\.?\d+)$/;
  const toDestroy = [];
  walk(app.root, (entity) => {
    if (badDecorationPattern.test(entity.name)) toDestroy.push(entity);
  });
  for (const entity of toDestroy) {
    try { entity.destroy(); } catch { /* already removed by parent */ }
  }

  function piece(root, name, type, x,y,z, sx,sy,sz, m, rx=0,ry=0,rz=0) {
    const e = new pc.Entity(name);
    e.addComponent('model', { type });
    root.addChild(e);
    e.setLocalPosition(x,y,z);
    e.setLocalScale(sx,sy,sz);
    e.setLocalEulerAngles(rx,ry,rz);
    e.model.material = m;
    return e;
  }

  const fixed = new Set();
  function isLegacyVehicleRoot(entity) {
    // True vehicle containers are direct children of app.root. Child pieces such
    // as Traffic_Taxi01_Body are rejected here even if their names match.
    if (entity.parent !== app.root) return false;
    if (entity.name === 'PlayerVehicle') return true;
    if (/^Traffic_(Taxi01|Taxi02|CarBlue|CarGrey)$/.test(entity.name)) return true;
    if (/^HazardTraffic_(Bakkie|Sedan)$/.test(entity.name)) return true;
    if (/^PoliceUnit_\d+$/.test(entity.name)) return true;
    return false;
  }

  function decorate(root) {
    if (!root || fixed.has(root.getGuid())) return;
    fixed.add(root.getGuid());
    const n = `Fixed_${root.name}`;
    piece(root,`${n}_FrontBumper`,'box',0,.43,-2.01,2.02,.20,.15,mat.black);
    piece(root,`${n}_RearBumper`,'box',0,.43,2.01,2.02,.20,.15,mat.black);
    piece(root,`${n}_PlateFront`,'box',0,.56,-2.105,.68,.22,.025,mat.white);
    piece(root,`${n}_PlateRear`,'box',0,.56,2.105,.68,.22,.025,mat.white);
    for (const x of [-.67,.67]) {
      piece(root,`${n}_Head_${x}`,'box',x,.73,-2.09,.36,.20,.035,mat.head);
      piece(root,`${n}_Tail_${x}`,'box',x,.73,2.09,.36,.20,.035,mat.tail);
    }
    for (const x of [-1.01,1.01]) piece(root,`${n}_Mirror_${x}`,'box',x,1.17,-.52,.15,.18,.24,mat.black);
  }

  function rebuildVehicleDetails() {
    for (const child of app.root.children) if (isLegacyVehicleRoot(child)) decorate(child);
  }
  rebuildVehicleDetails();
  setTimeout(rebuildVehicleDetails, 1800);
  setTimeout(rebuildVehicleDetails, 4200);

  // ---------------------------------------------------------------------
  // Pedestrian separation / anti-stacking
  // ---------------------------------------------------------------------
  function collectPedestrians() {
    const list = [];
    walk(app.root, (e) => {
      if (/^(AmbientNPC_|Crowd_)/.test(e.name) && e.parent === app.root) list.push(e);
    });
    return list;
  }

  let separationTimer = 0;
  app.on('update', (dt) => {
    separationTimer += dt;
    if (separationTimer < .08) return;
    const stepDt = separationTimer;
    separationTimer = 0;

    const people = collectPedestrians().filter((p) => p.enabled);
    const controlled = world.getControlledPosition();

    for (let i = 0; i < people.length; i++) {
      const a = people[i];
      const ap = a.getPosition();

      // Keep a little personal space around the player too, but never teleport
      // pedestrians far enough to break their route logic.
      const pdx = ap.x - controlled.x;
      const pdz = ap.z - controlled.z;
      const playerD = Math.hypot(pdx,pdz);
      if (playerD > .001 && playerD < .85) {
        const push = (.85-playerD) * .26;
        a.setPosition(ap.x + pdx/playerD*push, ap.y, ap.z + pdz/playerD*push);
      }

      for (let j = i + 1; j < people.length; j++) {
        const b = people[j];
        const bp = b.getPosition();
        let dx = ap.x - bp.x;
        let dz = ap.z - bp.z;
        let d = Math.hypot(dx,dz);
        if (d >= .82) continue;

        // If two actors are mathematically on the same point, choose a stable
        // deterministic direction based on their array positions.
        if (d < .001) {
          const angle = ((i * 37 + j * 61) % 360) * Math.PI / 180;
          dx = Math.cos(angle);
          dz = Math.sin(angle);
          d = 1;
        }

        const push = Math.min(.18, (.82-d) * .24 + stepDt * .02);
        const nx = dx/d;
        const nz = dz/d;
        a.setPosition(ap.x + nx*push, ap.y, ap.z + nz*push);
        b.setPosition(bp.x - nx*push, bp.y, bp.z - nz*push);
      }
    }
  });

  window.StreetHustleRealismHotfix = {
    rebuildVehicleDetails,
    get removedDecorationCount() { return toDestroy.length; }
  };

  console.info(`Street Hustle: realism hotfix loaded; removed ${toDestroy.length} invalid vehicle-detail pieces.`);
}
