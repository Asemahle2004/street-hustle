import * as pc from 'playcanvas';

// STREET HUSTLE — VISUAL REALISM PASS
// Procedural, lightweight detail intended for the browser/mobile build. This
// does not pretend primitive geometry is final AAA art; it gives the prototype
// convincing material variation, South African street detail, richer vehicles,
// night lighting and environmental clutter while final licensed/original art is
// still being produced.

const world = window.StreetHustleWorld;
const app = world?.app;

if (!app) {
  console.error('Street Hustle visual realism layer could not start: world core missing.');
} else {
  const device = app.graphicsDevice;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function solid(r, g, b, metalness = 0, gloss = .18, emissive = null) {
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

  function canvasTexture(size, painter) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    painter(ctx, size);
    const texture = new pc.Texture(device, { width: size, height: size, mipmaps: true });
    texture.setSource(canvas);
    texture.addressU = pc.ADDRESS_REPEAT;
    texture.addressV = pc.ADDRESS_REPEAT;
    texture.minFilter = pc.FILTER_LINEAR_MIPMAP_LINEAR;
    texture.magFilter = pc.FILTER_LINEAR;
    return texture;
  }

  function textured(base, painter, tilingX = 1, tilingY = 1, gloss = .12) {
    const material = solid(base[0], base[1], base[2], 0, gloss);
    try {
      material.diffuseMap = canvasTexture(256, painter);
      material.diffuseMapTiling = new pc.Vec2(tilingX, tilingY);
      material.update();
    } catch (error) {
      console.warn('Street Hustle: procedural texture fallback used.', error);
    }
    return material;
  }

  const asphalt = textured([.12,.12,.12], (ctx,s) => {
    ctx.fillStyle='#292b2d'; ctx.fillRect(0,0,s,s);
    for(let i=0;i<1700;i++){
      const v=34+Math.floor(Math.random()*28); ctx.fillStyle=`rgb(${v},${v},${v})`;
      const r=Math.random()*1.8+.3; ctx.fillRect(Math.random()*s,Math.random()*s,r,r);
    }
    for(let i=0;i<8;i++){
      ctx.strokeStyle='rgba(8,8,8,.32)'; ctx.lineWidth=.6+Math.random()*1.2;
      ctx.beginPath(); let x=Math.random()*s,y=Math.random()*s; ctx.moveTo(x,y);
      for(let j=0;j<5;j++){x+=-15+Math.random()*30;y+=8+Math.random()*24;ctx.lineTo(x,y);} ctx.stroke();
    }
  }, 3, 18, .10);

  const concrete = textured([.58,.57,.53], (ctx,s) => {
    ctx.fillStyle='#aaa79e';ctx.fillRect(0,0,s,s);
    for(let i=0;i<900;i++){
      const v=135+Math.floor(Math.random()*45);ctx.fillStyle=`rgba(${v},${v},${v-4},.25)`;
      ctx.fillRect(Math.random()*s,Math.random()*s,1+Math.random()*2,1+Math.random()*2);
    }
    ctx.strokeStyle='rgba(65,65,60,.28)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,s*.52);ctx.lineTo(s,s*.48);ctx.stroke();
  }, 4, 12, .08);

  const grass = textured([.17,.37,.15], (ctx,s) => {
    ctx.fillStyle='#315e2b';ctx.fillRect(0,0,s,s);
    for(let i=0;i<2300;i++){
      const g=65+Math.floor(Math.random()*70);ctx.fillStyle=`rgba(${30+Math.floor(Math.random()*25)},${g},${25+Math.floor(Math.random()*20)},.7)`;
      ctx.fillRect(Math.random()*s,Math.random()*s,.6+Math.random()*1.2,1+Math.random()*3);
    }
  }, 18, 18, .04);

  const plasterCream = textured([.72,.64,.48], (ctx,s) => {
    ctx.fillStyle='#b9a77d';ctx.fillRect(0,0,s,s);
    for(let i=0;i<1000;i++){const a=Math.random()*.11;ctx.fillStyle=`rgba(70,55,38,${a})`;ctx.fillRect(Math.random()*s,Math.random()*s,1+Math.random()*3,1+Math.random()*2);}
  }, 2, 2, .08);

  const brick = textured([.48,.24,.15], (ctx,s) => {
    ctx.fillStyle='#74442f';ctx.fillRect(0,0,s,s);
    const h=24,w=48;ctx.lineWidth=3;ctx.strokeStyle='rgba(205,190,165,.55)';
    for(let y=0;y<s;y+=h){const off=((y/h)%2)*w/2;for(let x=-w;x<s+w;x+=w){ctx.strokeRect(x+off,y,w,h);}}
    for(let i=0;i<240;i++){ctx.fillStyle='rgba(40,20,12,.09)';ctx.fillRect(Math.random()*s,Math.random()*s,2+Math.random()*5,1+Math.random()*3);}
  }, 4, 4, .10);

  const corrugated = textured([.28,.30,.31], (ctx,s) => {
    ctx.fillStyle='#55595b';ctx.fillRect(0,0,s,s);
    for(let x=0;x<s;x+=12){ctx.fillStyle='rgba(220,225,225,.12)';ctx.fillRect(x,0,3,s);ctx.fillStyle='rgba(0,0,0,.14)';ctx.fillRect(x+6,0,3,s);}
    for(let i=0;i<120;i++){ctx.fillStyle='rgba(110,55,25,.16)';ctx.beginPath();ctx.arc(Math.random()*s,Math.random()*s,1+Math.random()*4,0,Math.PI*2);ctx.fill();}
  }, 5, 3, .20);

  const mat = {
    asphalt, concrete, grass, plasterCream, brick, corrugated,
    roadWhite: solid(.88,.87,.80,0,.07), roadYellow: solid(.94,.72,.05,0,.08),
    tarPatch: solid(.055,.058,.06,0,.06), drain: solid(.17,.18,.19,.65,.28),
    steel: solid(.24,.25,.26,.6,.30), black:solid(.035,.035,.038,0,.07),
    gate:solid(.09,.10,.105,.65,.22), glass:solid(.075,.17,.22,.03,.66),
    tank:solid(.16,.27,.31,.08,.22), solar:solid(.035,.10,.18,.15,.62),
    binGreen:solid(.08,.25,.14,0,.14), binBlue:solid(.07,.18,.38,0,.14),
    red:solid(.63,.055,.035,0,.16), white:solid(.88,.88,.85,0,.15),
    blue:solid(.06,.20,.54,.05,.25), amber:solid(.92,.48,.04,0,.32,[.7,.25,.01,.45]),
    headlight:solid(.9,.9,.72,0,.42,[.9,.88,.58,1.3]),
    tail:solid(.56,.015,.01,0,.35,[.7,.01,.005,.65]),
    vegetation:solid(.08,.29,.08,0,.04), aloe:solid(.10,.34,.20,0,.05),
    soil:solid(.34,.23,.14,0,.04), tyre:solid(.025,.025,.025,0,.08),
    paintA:solid(.68,.58,.40,0,.10), paintB:solid(.38,.55,.62,0,.12), paintC:solid(.65,.44,.25,0,.10)
  };

  const detailRoot = new pc.Entity('VisualRealism');
  app.root.addChild(detailRoot);

  function part(name,type,x,y,z,sx,sy,sz,m,rx=0,ry=0,rz=0,parent=detailRoot){
    const e=new pc.Entity(name);e.addComponent('model',{type});parent.addChild(e);
    e.setLocalPosition(x,y,z);e.setLocalScale(sx,sy,sz);e.setLocalEulerAngles(rx,ry,rz);e.model.material=m;return e;
  }

  // Replace the most obvious flat-color base materials when entities are found.
  function replaceMaterial(name, material) {
    const entity = app.root.findByName(name);
    if (!entity) return;
    for (const model of entity.findComponents('model')) model.material = material;
  }
  replaceMaterial('Ground', mat.grass);
  replaceMaterial('MainRoad', mat.asphalt);
  replaceMaterial('SidewalkL', mat.concrete);
  replaceMaterial('SidewalkR', mat.concrete);
  replaceMaterial('RoadLine', mat.roadYellow);

  // Road shoulder wear, tar repairs, drains, cat-eyes and pedestrian crossing.
  for (const z of [-27,-13,4,18,30]) {
    part(`TarRepair_${z}`,'box',-2.3,.088,z,2.8,.014,3.7,mat.tarPatch,0,Math.random()*8-4,0);
  }
  for (const z of [-29,-19,-9,1,11,21,31]) {
    for (const x of [-4.78,4.78]) {
      part(`StormDrain_${x}_${z}`,'box',x,.115,z,.55,.035,1.0,mat.drain);
      for(let i=-2;i<=2;i++) part(`DrainSlot_${x}_${z}_${i}`,'box',x+i*.09,.138,z,.028,.012,.78,mat.black);
    }
  }
  for (let z=-31;z<=31;z+=4) {
    part(`RoadEye_${z}`,'box',0,.125,z,.13,.035,.25,mat.roadYellow);
  }
  for(let i=-4;i<=4;i++) {
    if(i===0) continue;
    part(`Crosswalk_${i}`,'box',i*.82,.125,-15, .47,.025,4.4,mat.roadWhite);
  }
  for (const z of [-34,34]) {
    part(`StopLine_${z}`,'box',0,.13,z,8.9,.025,.28,mat.roadWhite);
  }

  // Boundary walls, gates, pillars and realistic yard details around the six core properties.
  const yards=[
    {id:'Sbu',x:-13,z:18,w:13,d:13,frontX:-7.2,colour:mat.plasterCream},
    {id:'H02',x:-14,z:4,w:13,d:12,frontX:-7.2,colour:mat.paintB},
    {id:'H03',x:-14,z:-10,w:13,d:13,frontX:-7.2,colour:mat.paintA},
    {id:'H04',x:14,z:14,w:13,d:13,frontX:7.2,colour:mat.paintB},
    {id:'H05',x:15,z:-6,w:14,d:12,frontX:7.2,colour:mat.paintA},
    {id:'Shop',x:15,z:-23,w:16,d:13,frontX:7.2,colour:mat.brick}
  ];

  function yard(y,index){
    const side = y.x < 0 ? -1 : 1;
    const innerX = side < 0 ? -7.1 : 7.1;
    const backZ=y.z+y.d/2;
    const frontZ=y.z-y.d/2;
    // Back and side walls.
    part(`${y.id}_BackWall`,'box',y.x,.62,backZ,y.w,1.24,.20,y.colour);
    const outerX=y.x+side*y.w/2;
    part(`${y.id}_OuterWall`,'box',outerX,.62,y.z,.20,1.24,y.d,y.colour);
    // Front wall split around a vehicle/person gate.
    const gateWidth=index===5?5.2:3.8;
    const leftSpan=(y.w-gateWidth)/2;
    const centre=y.x;
    part(`${y.id}_FrontWallA`,'box',centre-y.w/2+leftSpan/2,.62,frontZ,leftSpan,1.24,.20,y.colour);
    part(`${y.id}_FrontWallB`,'box',centre+y.w/2-leftSpan/2,.62,frontZ,leftSpan,1.24,.20,y.colour);
    // Gate is deliberately semi-open visually.
    part(`${y.id}_Gate`,'box',centre,.82,frontZ-.03,gateWidth,1.55,.12,mat.gate);
    for(let gx=centre-gateWidth/2+.22;gx<centre+gateWidth/2;gx+=.34) part(`${y.id}_GateBar_${gx}`,'box',gx,.86,frontZ-.11,.065,1.45,.065,mat.steel);
    for(const px of [centre-gateWidth/2-.18,centre+gateWidth/2+.18]) part(`${y.id}_GatePillar_${px}`,'box',px,.82,frontZ,.35,1.65,.35,y.colour);
    // Municipal wheelie bin near gate.
    const binMat=index%2?mat.binBlue:mat.binGreen;
    const bx=centre+side*(gateWidth/2+.65);
    part(`${y.id}_Bin`,'box',bx,.52,frontZ-.55,.58,.98,.64,binMat,0,side*7,0);
    part(`${y.id}_BinLid`,'box',bx,.99,frontZ-.55,.64,.10,.69,mat.black,0,side*7,0);
    for(const wz of [-.22,.22]) part(`${y.id}_BinWheel_${wz}`,'cylinder',bx-side*.31,.18,frontZ-.55+wz,.16,.11,.16,mat.black,0,0,90);
    // Water tank, satellite dish, washing line. Keep placement inside property.
    const tankX=y.x+side*(y.w*.28);
    part(`${y.id}_Tank`,'cylinder',tankX,1.16,backZ-1.25,1.12,2.3,1.12,mat.tank);
    part(`${y.id}_TankLid`,'cylinder',tankX,2.34,backZ-1.25,1.0,.10,1.0,mat.black);
    const dishX=y.x-side*2.2;
    part(`${y.id}_DishPole`,'cylinder',dishX,2.7,backZ-1.0,.07,2.1,.07,mat.steel);
    part(`${y.id}_Dish`,'sphere',dishX,3.8,backZ-1.05,.58,.20,.58,mat.white,-28,0,0);
    const lineX1=y.x-side*1.8,lineX2=y.x+side*1.8,lineZ=backZ-2.6;
    part(`${y.id}_WashPoleA`,'cylinder',lineX1,1.25,lineZ,.055,2.5,.055,mat.steel);
    part(`${y.id}_WashPoleB`,'cylinder',lineX2,1.25,lineZ,.055,2.5,.055,mat.steel);
    part(`${y.id}_WashLine`,'box',(lineX1+lineX2)/2,2.35,lineZ,Math.abs(lineX2-lineX1),.018,.018,mat.white);
    if(index<5){
      const clothes=[mat.red,mat.blue,mat.white];
      for(let c=0;c<3;c++) part(`${y.id}_Cloth_${c}`,'box',lineX1+(c+1)*(Math.abs(lineX2-lineX1)/4),2.05,lineZ,.55,.62,.018,clothes[c]);
    }
    // Solar geyser/panel detail for a few homes.
    if(index===0||index===3||index===4){
      part(`${y.id}_SolarPanel`,'box',y.x,4.7,y.z,2.7,.10,1.65,mat.solar,-14,0,0);
      part(`${y.id}_SolarTank`,'cylinder',y.x+1.8,4.72,y.z,.38,1.65,.38,mat.white,0,0,90);
    }
  }
  yards.forEach(yard);

  // Street-name and community signs made from geometry so they remain cheap.
  function sign(name,x,z,labelWidth,colour=mat.blue){
    part(`${name}_Pole`,'box',x,1.3,z,.10,2.6,.10,mat.steel);
    part(`${name}_Board`,'box',x,2.55,z,labelWidth,.72,.10,colour);
    // White bars suggest text from normal gameplay distance without loading fonts into 3D.
    for(let i=0;i<3;i++) part(`${name}_Text_${i}`,'box',x-labelWidth*.18+i*labelWidth*.18,2.55,z-.061,labelWidth*.13,.07,.018,mat.white);
  }
  sign('Sign_MainRoad',-7.2,27,2.8);
  sign('Sign_Taxi',7.2,-28,2.6,mat.roadYellow);
  sign('Sign_Clinic',-24.2,30,2.7,mat.binGreen);
  sign('Sign_Sports',-34,-18,3.2,mat.binGreen);

  // Vegetation: shrubs, aloes, planted verge trees and dry grass clumps.
  function bush(name,x,z,scale=.8,m=mat.vegetation){
    part(name,'sphere',x,.45*scale,z,1.25*scale,.8*scale,1.0*scale,m);
  }
  function aloe(name,x,z,scale=.8){
    const r=new pc.Entity(name);detailRoot.addChild(r);r.setLocalPosition(x,0,z);
    for(let i=0;i<7;i++) part(`${name}_Leaf_${i}`,'box',0,.38*scale,0,.12*scale,.85*scale,.16*scale,mat.aloe,20+Math.random()*35,i*(360/7),Math.random()*14-7,r);
  }
  const greenery=[[-20,24],[-20,16],[-21,7],[-21,-5],[-22,-14],[20,19],[21,10],[22,0],[22,-12],[23,-20],[-10,29],[10,29]];
  greenery.forEach(([x,z],i)=> i%3===0?aloe(`Aloe_${i}`,x,z,.8+Math.random()*.35):bush(`Bush_${i}`,x,z,.7+Math.random()*.45));
  for(let i=0;i<18;i++){
    const side=i%2?-1:1; const x=side*(8.2+Math.random()*2.5); const z=-31+Math.random()*62;
    part(`DryGrass_${i}`,'cylinder',x,.20,z,.16+Math.random()*.12,.40+Math.random()*.25,.16+Math.random()*.12,mat.soil,0,Math.random()*180,0);
  }

  // Detailed bus/taxi stop.
  const stop=new pc.Entity('RealisticTaxiStop');detailRoot.addChild(stop);stop.setLocalPosition(8.2,0,-27);
  part('TaxiStopSlab','box',0,.06,0,5.6,.12,4.0,mat.concrete,0,0,0,stop);
  part('TaxiStopRoof','box',0,2.8,0,5.6,.16,3.6,mat.corrugated,0,0,0,stop);
  for(const [x,z] of [[-2.5,-1.5],[2.5,-1.5],[-2.5,1.5],[2.5,1.5]]) part(`TaxiStopPost_${x}_${z}`,'box',x,1.4,z,.11,2.8,.11,mat.steel,0,0,0,stop);
  part('TaxiStopBench','box',0,.55,.85,3.8,.17,.58,mat.steel,0,0,0,stop);
  part('TaxiStopBack','box',0,1.12,1.08,3.8,.8,.10,mat.steel,0,0,0,stop);

  // Decorate existing vehicles with plates, bumpers, lights and mirrors.
  const decorated = new Set();
  function attachTo(root,name,type,x,y,z,sx,sy,sz,m,rx=0,ry=0,rz=0){
    const e=new pc.Entity(name);e.addComponent('model',{type});root.addChild(e);e.setLocalPosition(x,y,z);e.setLocalScale(sx,sy,sz);e.setLocalEulerAngles(rx,ry,rz);e.model.material=m;return e;
  }
  function decorateVehicle(root){
    if(!root||decorated.has(root.getGuid())) return;
    decorated.add(root.getGuid());
    const prefix=root.name;
    attachTo(root,`${prefix}_FrontBumper`,'box',0,.44,-2.02,2.05,.24,.18,mat.black);
    attachTo(root,`${prefix}_RearBumper`,'box',0,.44,2.02,2.05,.24,.18,mat.black);
    attachTo(root,`${prefix}_PlateFront`,'box',0,.55,-2.13,.74,.25,.035,mat.white);
    attachTo(root,`${prefix}_PlateRear`,'box',0,.55,2.13,.74,.25,.035,mat.white);
    for(const x of [-.68,.68]){
      attachTo(root,`${prefix}_Head_${x}`,'box',x,.72,-2.12,.42,.25,.05,mat.headlight);
      attachTo(root,`${prefix}_Tail_${x}`,'box',x,.72,2.12,.42,.24,.05,mat.tail);
    }
    for(const x of [-1.03,1.03]) attachTo(root,`${prefix}_Mirror_${x}`,'box',x,1.18,-.55,.18,.22,.32,mat.black);
  }
  function scanVehicles(){
    const roots=[];
    const names=['PlayerVehicle'];
    for(const n of names){const e=app.root.findByName(n);if(e)roots.push(e);}
    const walk=(e)=>{if(/^Traffic_|^HazardTraffic_|^PoliceUnit_/.test(e.name))roots.push(e);for(const c of e.children)walk(c);};
    walk(app.root);
    roots.forEach(decorateVehicle);
  }
  setTimeout(scanVehicles,1400);
  setTimeout(scanVehicles,4500);

  // Night lighting. Real point lights are limited to a few important locations;
  // emissive lamps provide cheap perceived density elsewhere.
  const lampSpecs=[[-6.8,20],[-6.8,0],[-6.8,-20],[6.8,20],[6.8,0],[6.8,-20],[0,34],[-25,30],[25,30]];
  const lamps=[];
  for(const [x,z] of lampSpecs){
    const pole=part(`RealLampPole_${x}_${z}`,'cylinder',x,2.7,z,.10,5.4,.10,mat.steel);
    part(`RealLampArm_${x}_${z}`,'box',x+(x<0?.34:-.34),5.25,z,.75,.08,.08,mat.steel);
    const bulb=part(`RealLampBulb_${x}_${z}`,'sphere',x+(x<0?.68:-.68),5.15,z,.20,.14,.20,mat.headlight);
    lamps.push({pole,bulb});
  }
  const realLights=[];
  for(const [x,z] of [[-6.1,10],[6.1,-10],[0,34]]){
    const l=new pc.Entity(`StreetPointLight_${x}_${z}`);l.addComponent('light',{type:'omni',color:new pc.Color(1,.72,.38),intensity:0,range:13,castShadows:false});l.setPosition(x,4.6,z);app.root.addChild(l);realLights.push(l);
  }

  // Performance-aware shadow upgrade. Desktop gets one moderate directional
  // shadow; touch/mobile keeps it disabled to preserve frame rate.
  const finePointer = window.matchMedia?.('(pointer:fine)')?.matches ?? true;
  try {
    if (world.sun?.light) {
      world.sun.light.castShadows = finePointer;
      if ('shadowResolution' in world.sun.light) world.sun.light.shadowResolution = finePointer ? 1024 : 512;
    }
  } catch { /* renderer still works without shadows */ }

  let lightingTimer=0;
  app.on('update',(dt)=>{
    lightingTimer+=dt;
    if(lightingTimer<.5)return;
    lightingTimer=0;
    const text=document.getElementById('clock')?.textContent||'12:00';
    const m=text.match(/(\d{1,2}):(\d{2})/);const hour=m?Number(m[1])+Number(m[2])/60:12;
    const night=hour>=18.2||hour<5.8;
    for(const l of realLights) l.light.intensity=night?1.2:0;
  });

  window.StreetHustleVisualRealism={detailRoot,materials:mat,scanVehicles};
  console.info('Street Hustle: visual realism layer loaded.');
}
