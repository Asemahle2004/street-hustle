import * as pc from 'playcanvas';

// STREET HUSTLE — CITY DENSITY EXPANSION
// Adds a denser city edge around the original neighbourhood: mini-CBD, market,
// industrial/workshop, sport/community and technology areas. Geometry stays
// lightweight so the browser/mobile prototype remains usable.

const world = window.StreetHustleWorld;
const app = world?.app;
const player = world?.player;

if (!app || !player) {
  console.error('Street Hustle city expansion could not start: world core missing.');
} else {
  function material(r, g, b, metalness = 0, gloss = .2) {
    const m = new pc.StandardMaterial();
    m.diffuse = new pc.Color(r, g, b);
    m.metalness = metalness;
    m.gloss = gloss;
    m.update();
    return m;
  }

  const mat = {
    asphalt: material(.08,.09,.10,0,.08),
    concrete: material(.52,.51,.47,0,.10),
    line: material(.92,.75,.10,0,.08),
    glass: material(.08,.20,.28,.06,.60),
    cbd1: material(.30,.34,.39,.10,.32),
    cbd2: material(.46,.49,.54,.12,.28),
    cbd3: material(.25,.31,.37,.14,.36),
    industrial: material(.37,.32,.25,.08,.18),
    warehouse: material(.48,.47,.43,.12,.20),
    marketRed: material(.68,.12,.10),
    marketBlue: material(.10,.30,.60),
    marketGreen: material(.08,.48,.25),
    tech: material(.12,.32,.46,.06,.38),
    sport: material(.12,.36,.17),
    white: material(.88,.88,.84),
    black: material(.035,.035,.04),
    metal: material(.34,.36,.39,.55,.42),
    taxi: material(.90,.76,.12,.08,.38),
    bakkie: material(.77,.77,.72,.12,.42),
    sedan: material(.17,.20,.25,.14,.44),
    brick: material(.49,.24,.15),
    roof: material(.22,.16,.12),
    grass: material(.14,.37,.15),
    dirt: material(.46,.33,.20),
    solar: material(.04,.12,.22,.20,.64),
    wood: material(.35,.18,.08)
  };

  const root = new pc.Entity('CityExpansion');
  app.root.addChild(root);

  function part(name, type, x, y, z, sx, sy, sz, m, rx = 0, ry = 0, rz = 0, parent = root) {
    const e = new pc.Entity(name);
    e.addComponent('model', { type });
    parent.addChild(e);
    e.setLocalPosition(x,y,z);
    e.setLocalScale(sx,sy,sz);
    e.setLocalEulerAngles(rx,ry,rz);
    e.model.material = m;
    return e;
  }

  const localObstacles = [];
  function obstacle(x,z,w,d,padding=.35) {
    localObstacles.push({ minX:x-w/2-padding,maxX:x+w/2+padding,minZ:z-d/2-padding,maxZ:z+d/2+padding });
  }

  function building(name,x,z,w,d,h,m,windows=true) {
    part(name,'box',x,h/2,z,w,h,d,m);
    part(`${name}_Roof`,'box',x,h+.14,z,w+.18,.28,d+.18,mat.roof);
    obstacle(x,z,w,d,.25);
    if (windows) {
      const rows = Math.max(1, Math.min(4, Math.floor(h/2.4)));
      for (let row=0;row<rows;row++) {
        const y=1.5+row*2.0;
        if (y>h-.5) continue;
        for (const off of [-w*.25,w*.25]) {
          part(`${name}_Window_${row}_${off}`,'box',x+off,y,z-d/2-.035,Math.min(1.1,w*.18),.82,.06,mat.glass);
        }
      }
    }
  }

  function parkedCar(name,x,z,body,scale=1) {
    const car=new pc.Entity(name); root.addChild(car); car.setLocalPosition(x,0,z);
    part(`${name}_Body`,'box',0,.55,0,1.8*scale,.62*scale,3.7*scale,body,0,0,0,car);
    part(`${name}_Cabin`,'box',0,1.05,-.08,1.5*scale,.55*scale,1.7*scale,mat.glass,0,0,0,car);
    for (const [wx,wz] of [[-.88,-1.2],[.88,-1.2],[-.88,1.2],[.88,1.2]]) {
      part(`${name}_Wheel_${wx}_${wz}`,'cylinder',wx*scale,.34,wz*scale,.42*scale,.22*scale,.42*scale,mat.black,0,0,90,car);
    }
    return car;
  }

  // --- Northern mini CBD -------------------------------------------------
  // The clinic and gym occupy the far north-west/north-east corners, so the
  // taller blocks are kept closer to the centre to avoid overlap.
  part('CBDCrossRoad','box',0,.035,34,72,.07,7.2,mat.asphalt);
  part('CBDCrossLine','box',0,.08,34,68,.025,.14,mat.line);
  part('CBDWalkNorth','box',0,.12,38.2,72,.22,1.2,mat.concrete);
  part('CBDWalkSouth','box',0,.12,29.8,72,.22,1.2,mat.concrete);

  building('CBD_Block_A',-22,26.0,7,6,10.5,mat.cbd1);
  building('CBD_Block_B',-11,26.0,7,6,8.5,mat.cbd2);
  building('CBD_Block_C',11,26.0,7,6,9.5,mat.cbd3);
  building('CBD_Block_D',22,26.0,7,6,11.5,mat.cbd2);
  part('CBD_Plaza','box',0,.04,28,7,.08,3.4,mat.concrete);
  part('CBD_PlazaPlanter','box',0,.35,28,4.2,.7,.9,mat.brick);
  for (const x of [-2,2]) part(`CBD_Palm_${x}`,'cylinder',x,1.2,28,.22,2.4,.22,mat.wood);

  // --- South-east market + taxi commerce --------------------------------
  // Shifted west of the mechanic so the market does not occupy the workshop.
  part('MarketDirt','box',16,.025,-34,20,.05,7,mat.dirt);
  for (let i=0;i<4;i++) {
    const x=9.5+i*4.2;
    const colour=[mat.marketRed,mat.marketBlue,mat.marketGreen,mat.taxi][i];
    part(`MarketCounter_${i}`,'box',x,.7,-34,3.0,1.25,1.2,mat.industrial);
    part(`MarketRoof_${i}`,'box',x,2.45,-34,3.4,.16,2.5,colour);
    for (const px of [x-1.35,x+1.35]) part(`MarketPole_${i}_${px}`,'box',px,1.25,-34,.11,2.5,.11,mat.metal);
  }
  parkedCar('ParkedTaxiMarket',26,-34,mat.taxi,1.02);
  parkedCar('ParkedSedanMarket',21,-29.8,mat.sedan,.92);

  // --- South-west sport/community zone ----------------------------------
  // Kept east of the police station and south of the existing car wash.
  part('CommunityPitch','box',-15,.035,-34,16,.07,7,mat.sport);
  part('PitchLineLong','box',-15,.08,-34,.09,.02,6.4,mat.white);
  part('PitchLineCross','box',-15,.08,-34,15.2,.02,.09,mat.white);
  for (const gx of [-22.3,-7.7]) {
    part(`GoalPost_${gx}_L`,'box',gx,.70,-35.5,.10,1.4,.10,mat.white);
    part(`GoalPost_${gx}_R`,'box',gx,.70,-32.5,.10,1.4,.10,mat.white);
    part(`GoalPost_${gx}_Top`,'box',gx,1.38,-34,.10,.10,3.0,mat.white);
  }
  part('CommunityStand','box',-15,.60,-29.9,10,1.0,1.3,mat.concrete);
  building('CommunityHall',-30,-15,9,6,5.3,mat.brick,false);

  // --- East industrial / workshop strip ---------------------------------
  building('Workshop_A',30,16,10,7,5.2,mat.industrial,false);
  building('Warehouse_B',30,5,11,8,6.5,mat.warehouse,false);
  part('WorkshopDoor','box',30,1.7,12.45,4.3,3.1,.12,mat.metal);
  part('WarehouseDoor','box',30,2.0,1.0,5.0,3.7,.12,mat.metal);
  parkedCar('WorkshopBakkie',24,14,mat.bakkie,1.02);
  for (const x of [24,28,32,35]) part(`WorkshopCrate_${x}`,'box',x,.45,9.5,1.0,.9,1.0,mat.wood);

  // --- West technology / media strip ------------------------------------
  building('TechRepairHub',-30,16,9,7,5.4,mat.tech,false);
  building('MediaStudio',-22,7,8,6,5.2,mat.cbd3,false);
  for (let i=0;i<4;i++) {
    part(`TechSolar_${i}`,'box',-33+i*2.1,5.72,16,1.7,.08,1.2,mat.solar,-18,0,0);
  }
  part('TechAwning','box',-30,3.2,12.45,8,.15,1.7,mat.marketBlue);

  // --- Edge housing gives city continuity -------------------------------
  building('EdgeHome_SW',-22,-20,6.0,5.5,3.7,mat.brick,false);
  building('EdgeHome_SE',21,-19,6.0,5.5,3.7,mat.brick,false);

  // --- Street furniture / lights ----------------------------------------
  for (const [x,z] of [[-35,34],[-12,34],[12,34],[35,34],[-35,-18],[35,-18]]) {
    part(`CityLightPole_${x}_${z}`,'cylinder',x,2.5,z,.15,5,.15,mat.metal);
    part(`CityLight_${x}_${z}`,'box',x,5.05,z,.7,.20,.32,mat.white);
  }
  for (const [x,z] of [[-7,30],[7,30],[-7,-30],[7,-30]]) {
    part(`BenchSeat_${x}_${z}`,'box',x,.52,z,2.1,.18,.55,mat.wood);
    part(`BenchBack_${x}_${z}`,'box',x,1.02,z+.25,2.1,.78,.14,mat.wood);
  }

  // --- Lightweight collision for newly added buildings ------------------
  let safePosition=player.getPosition().clone();
  function insideObstacle(pos,pad=.25) {
    return localObstacles.some((o)=>pos.x>o.minX-pad&&pos.x<o.maxX+pad&&pos.z>o.minZ-pad&&pos.z<o.maxZ+pad);
  }

  const zones=[
    {id:'mini-cbd',label:'TOWNSHIP CENTRE',x:0,z:28,r:15},
    {id:'market',label:'STREET MARKET',x:16,z:-34,r:10},
    {id:'sports',label:'COMMUNITY SPORTS GROUND',x:-15,z:-34,r:10},
    {id:'industrial',label:'WORKSHOP DISTRICT',x:29,z:10,r:11},
    {id:'technology',label:'TECH & MEDIA STRIP',x:-27,z:11,r:12}
  ];
  let currentZone='';

  app.on('update',()=>{
    if (world.driving) return;
    const pos=player.getPosition();
    if (insideObstacle(pos)) player.setPosition(safePosition);
    else safePosition=pos.clone();

    let found='';
    for (const zone of zones) {
      if (Math.hypot(pos.x-zone.x,pos.z-zone.z)<zone.r) { found=zone.id; break; }
    }
    if (found!==currentZone) {
      currentZone=found;
      if (found) {
        const zone=zones.find((z)=>z.id===found);
        window.dispatchEvent(new CustomEvent('street-hustle-district',{detail:{id:zone.id,label:zone.label}}));
      }
    }
  });

  window.StreetHustleCityExpansion={root,zones,localObstacles};
}
