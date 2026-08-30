import * as pc from 'playcanvas';

// Street Hustle environment detail pass.
// This deliberately uses lightweight primitives so the prototype stays fast
// in a browser and on ordinary Android phones.

const app = pc.Application.getApplication('application') ?? pc.Application.getApplication();

if (!app) {
  console.warn('Street Hustle: could not find PlayCanvas app for neighbourhood details.');
} else {
  const makeMaterial = (r, g, b, metalness = 0, gloss = 0.2) => {
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(r, g, b);
    material.metalness = metalness;
    material.gloss = gloss;
    material.update();
    return material;
  };

  const m = {
    wall: makeMaterial(0.78, 0.72, 0.61),
    wallDark: makeMaterial(0.47, 0.43, 0.37),
    metal: makeMaterial(0.20, 0.22, 0.22, 0.15, 0.32),
    gate: makeMaterial(0.12, 0.15, 0.15, 0.25, 0.3),
    glass: makeMaterial(0.18, 0.33, 0.42, 0.05, 0.65),
    door: makeMaterial(0.32, 0.16, 0.07),
    white: makeMaterial(0.9, 0.9, 0.84),
    yellow: makeMaterial(0.95, 0.68, 0.08),
    red: makeMaterial(0.69, 0.08, 0.06),
    blue: makeMaterial(0.06, 0.27, 0.55),
    green: makeMaterial(0.08, 0.38, 0.19),
    pole: makeMaterial(0.27, 0.24, 0.20),
    cable: makeMaterial(0.035, 0.035, 0.035),
    lamp: makeMaterial(0.95, 0.90, 0.63, 0, 0.5),
    pavement: makeMaterial(0.49, 0.48, 0.44),
    dirt: makeMaterial(0.50, 0.32, 0.17),
    tank: makeMaterial(0.16, 0.28, 0.34, 0.1, 0.28)
  };

  function primitive(name, type, x, y, z, sx, sy, sz, material, rx = 0, ry = 0, rz = 0) {
    const e = new pc.Entity(name);
    e.addComponent('model', { type });
    e.setPosition(x, y, z);
    e.setLocalScale(sx, sy, sz);
    e.setEulerAngles(rx, ry, rz);
    e.model.material = material;
    app.root.addChild(e);
    return e;
  }

  function houseFront(name, x, z, width, depth, height, side = 'left') {
    const roadSide = side === 'left' ? x + width / 2 + 0.025 : x - width / 2 - 0.025;
    const faceYaw = 90;

    // Front door facing the road.
    primitive(`${name}_Door`, 'box', roadSide, 1.15, z, 0.10, 2.15, 1.05, m.door, 0, faceYaw, 0);

    // Two simple blue-grey windows.
    primitive(`${name}_WindowA`, 'box', roadSide, 1.85, z - 2.0, 0.11, 1.2, 1.35, m.glass, 0, faceYaw, 0);
    primitive(`${name}_WindowB`, 'box', roadSide, 1.85, z + 2.0, 0.11, 1.2, 1.35, m.glass, 0, faceYaw, 0);

    // Small concrete doorstep.
    const stepX = side === 'left' ? roadSide + 0.55 : roadSide - 0.55;
    primitive(`${name}_Step`, 'box', stepX, 0.13, z, 1.0, 0.26, 1.55, m.pavement);
  }

  function yardFence(name, x, z, width, depth, side = 'left') {
    const h = 1.05;
    const rail = 0.11;
    const nearX = side === 'left' ? x + width / 2 + 2.0 : x - width / 2 - 2.0;
    const farX = side === 'left' ? x - width / 2 - 2.0 : x + width / 2 + 2.0;
    const minZ = z - depth / 2 - 1.6;
    const maxZ = z + depth / 2 + 1.6;

    // Back and side boundary walls.
    primitive(`${name}_BackWall`, 'box', farX, h / 2, z, 0.25, h, maxZ - minZ, m.wall);
    primitive(`${name}_TopWall`, 'box', x, h / 2, maxZ, Math.abs(farX - nearX), h, 0.25, m.wall);
    primitive(`${name}_BottomWall`, 'box', x, h / 2, minZ, Math.abs(farX - nearX), h, 0.25, m.wall);

    // Street-facing fence with a gap for the gate.
    primitive(`${name}_FenceA`, 'box', nearX, 0.65, z - 3.0, rail, 1.3, 2.6, m.gate);
    primitive(`${name}_FenceB`, 'box', nearX, 0.65, z + 3.0, rail, 1.3, 2.6, m.gate);
    primitive(`${name}_Gate`, 'box', nearX, 0.72, z, rail, 1.44, 2.9, m.metal);

    // Vertical bars to give the gate/fence a South African residential feel.
    for (let dz = -4.0; dz <= 4.0; dz += 0.55) {
      if (Math.abs(dz) < 1.5) continue;
      primitive(`${name}_Bar_${dz.toFixed(1)}`, 'box', nearX, 0.72, z + dz, 0.10, 1.44, 0.09, m.gate);
    }
  }

  // Existing prototype house positions from main.js.
  const houses = [
    ['SbuHome', -13, 18, 7, 8, 4, 'left'],
    ['Home02', -14, 4, 8, 7, 4.5, 'left'],
    ['Home03', -14, -10, 7, 8, 4, 'left'],
    ['Home04', 14, 14, 8, 8, 4.2, 'right'],
    ['Home05', 15, -6, 9, 7, 4.6, 'right']
  ];

  for (const house of houses) {
    houseFront(...house);
    yardFence(house[0], house[1], house[2], house[3], house[4], house[6]);
  }

  // Small stoep/awning for Sbu's starting home.
  primitive('SbuHome_Awning', 'box', -8.7, 2.55, 18, 2.2, 0.18, 4.0, m.metal);
  primitive('SbuHome_AwningPostA', 'box', -7.8, 1.25, 16.35, 0.14, 2.5, 0.14, m.metal);
  primitive('SbuHome_AwningPostB', 'box', -7.8, 1.25, 19.65, 0.14, 2.5, 0.14, m.metal);

  // Corner shop frontage: awning, shutter, colourful sign blocks and bins.
  primitive('CornerShop_Awning', 'box', 9.55, 3.3, -23, 2.0, 0.20, 7.6, m.green);
  primitive('CornerShop_Shutter', 'box', 9.93, 1.55, -23, 0.12, 3.0, 4.4, m.metal, 0, 90, 0);
  primitive('CornerShop_SignBoard', 'box', 9.45, 4.55, -23, 0.22, 1.2, 6.6, m.red);
  primitive('CornerShop_SignStripe', 'box', 9.30, 4.55, -23, 0.08, 0.22, 5.8, m.white);
  primitive('ShopBinA', 'box', 8.9, 0.48, -27.2, 0.8, 0.95, 0.8, m.blue);
  primitive('ShopBinB', 'box', 8.9, 0.48, -18.8, 0.8, 0.95, 0.8, m.green);

  // Road edge markings and two speed humps.
  primitive('RoadEdgeLeft', 'box', -4.65, 0.105, 0, 0.12, 0.02, 68, m.white);
  primitive('RoadEdgeRight', 'box', 4.65, 0.105, 0, 0.12, 0.02, 68, m.white);
  primitive('SpeedHump01', 'box', 0, 0.18, 12, 9.3, 0.22, 0.75, m.yellow);
  primitive('SpeedHump02', 'box', 0, 0.18, -15, 9.3, 0.22, 0.75, m.yellow);

  // Electricity poles and simple overhead lines along both sides of the street.
  const poleZs = [-30, -14, 2, 18, 32];
  const leftPoleX = -8.0;
  const rightPoleX = 8.0;

  function electricityPole(name, x, z) {
    primitive(`${name}_Pole`, 'cylinder', x, 3.65, z, 0.26, 7.3, 0.26, m.pole);
    primitive(`${name}_CrossArm`, 'box', x, 6.65, z, 2.4, 0.14, 0.14, m.pole);
    primitive(`${name}_InsulatorL`, 'cylinder', x - 0.8, 6.9, z, 0.11, 0.30, 0.11, m.white);
    primitive(`${name}_InsulatorR`, 'cylinder', x + 0.8, 6.9, z, 0.11, 0.30, 0.11, m.white);
  }

  for (let i = 0; i < poleZs.length; i++) {
    electricityPole(`PoleL${i}`, leftPoleX, poleZs[i]);
    electricityPole(`PoleR${i}`, rightPoleX, poleZs[i]);
  }

  for (let i = 0; i < poleZs.length - 1; i++) {
    const z1 = poleZs[i];
    const z2 = poleZs[i + 1];
    const midZ = (z1 + z2) / 2;
    const length = Math.abs(z2 - z1);

    for (const x of [leftPoleX - 0.8, leftPoleX + 0.8, rightPoleX - 0.8, rightPoleX + 0.8]) {
      primitive(`Cable_${x}_${i}`, 'box', x, 6.88, midZ, 0.035, 0.035, length, m.cable);
    }
  }

  // Street lights attached to selected poles.
  for (const [x, z, side] of [[leftPoleX, 2, 1], [rightPoleX, -14, -1], [leftPoleX, -30, 1]]) {
    primitive(`LampArm_${x}_${z}`, 'box', x + side * 0.75, 5.65, z, 1.55, 0.10, 0.10, m.metal);
    primitive(`LampHead_${x}_${z}`, 'box', x + side * 1.45, 5.55, z, 0.48, 0.16, 0.34, m.lamp);
  }

  // JoJo-style water tanks / utility tanks in two yards.
  primitive('WaterTank01', 'cylinder', -20.2, 1.25, 18.8, 1.35, 2.5, 1.35, m.tank);
  primitive('WaterTank02', 'cylinder', 20.4, 1.25, -5.2, 1.35, 2.5, 1.35, m.tank);

  // Informal taxi stop / waiting point near the shop.
  primitive('TaxiStopPole', 'box', 7.8, 1.65, -28.5, 0.13, 3.3, 0.13, m.metal);
  primitive('TaxiStopSign', 'box', 7.8, 2.8, -28.5, 0.12, 0.85, 1.15, m.blue, 0, 90, 0);
  primitive('TaxiBenchSeat', 'box', 7.0, 0.65, -29.0, 2.6, 0.18, 0.7, m.metal);
  primitive('TaxiBenchLegA', 'box', 6.2, 0.32, -29.0, 0.14, 0.65, 0.14, m.metal);
  primitive('TaxiBenchLegB', 'box', 7.8, 0.32, -29.0, 0.14, 0.65, 0.14, m.metal);

  // Car wash gets a basic shade structure so the existing job marker feels located.
  primitive('CarWashShade', 'box', -16, 3.0, -25, 8.4, 0.16, 5.4, m.blue);
  for (const [x, z] of [[-19.8, -27.3], [-12.2, -27.3], [-19.8, -22.7], [-12.2, -22.7]]) {
    primitive(`CarWashPost_${x}_${z}`, 'box', x, 1.5, z, 0.15, 3.0, 0.15, m.metal);
  }

  // A few compact dirt patches break up the perfectly green test terrain.
  primitive('DirtYard01', 'box', -20, 0.012, 5, 7.0, 0.025, 8.5, m.dirt);
  primitive('DirtYard02', 'box', 21, 0.012, 14, 6.5, 0.025, 7.0, m.dirt);

  console.info('Street Hustle: neighbourhood detail pass loaded.');
}
