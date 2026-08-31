import * as pc from 'playcanvas';

// STREET HUSTLE — INTERIOR REALISM
// Adds low-cost believable home/shop/clinic/gym/workshop detail. Existing
// enterable rooms from living-world.js are decorated in place when found.

const world=window.StreetHustleWorld;
const app=world?.app;
if(!app){console.error('Street Hustle interior realism could not start.');}
else{
  const material=(r,g,b,metal=0,gloss=.16,emit=null)=>{const m=new pc.StandardMaterial();m.diffuse=new pc.Color(r,g,b);m.metalness=metal;m.gloss=gloss;if(emit){m.emissive=new pc.Color(...emit.slice(0,3));m.emissiveIntensity=emit[3]??1;}m.update();return m;};
  const mat={wood:material(.28,.14,.06),darkWood:material(.14,.07,.03),steel:material(.32,.34,.36,.65,.42),white:material(.82,.82,.78),cream:material(.70,.66,.56),black:material(.025,.025,.03),glass:material(.05,.15,.20,.04,.68),tv:material(.015,.02,.025,.02,.75,[.02,.05,.08,.20]),red:material(.55,.06,.04),blue:material(.07,.22,.53),green:material(.07,.38,.17),yellow:material(.78,.56,.08),fridge:material(.72,.75,.76,.12,.38),fabric:material(.25,.35,.46),floor:material(.30,.22,.14),tile:material(.64,.63,.60),medicine:material(.80,.80,.75),gym:material(.12,.14,.16,.25,.25),rubber:material(.035,.035,.038),product1:material(.77,.18,.07),product2:material(.08,.38,.68),product3:material(.74,.58,.08),product4:material(.15,.58,.24)};
  function part(parent,name,type,x,y,z,sx,sy,sz,m,rx=0,ry=0,rz=0){const e=new pc.Entity(name);e.addComponent('model',{type});parent.addChild(e);e.setLocalPosition(x,y,z);e.setLocalScale(sx,sy,sz);e.setLocalEulerAngles(rx,ry,rz);e.model.material=m;return e;}
  function findEventually(name,callback,tries=80){let count=0;const timer=setInterval(()=>{const e=app.root.findByName(name);if(e){clearInterval(timer);callback(e);return;}count++;if(count>=tries)clearInterval(timer);},150);}

  function decorateHome(root){
    if(root.findByName('Realism_HomeKitchen'))return;
    const kitchen=new pc.Entity('Realism_HomeKitchen');root.addChild(kitchen);
    // Kitchen corner: counters, sink, stove, kettle, fridge.
    part(kitchen,'CounterBase','box',-2.8,.62,2.75,3.3,1.15,.72,mat.darkWood);
    part(kitchen,'CounterTop','box',-2.8,1.22,2.75,3.45,.10,.84,mat.steel);
    part(kitchen,'Sink','box',-2.3,1.26,2.72,.72,.08,.46,mat.black);
    part(kitchen,'TapStem','cylinder',-2.3,1.48,2.72,.05,.42,.05,mat.steel);
    part(kitchen,'Stove','box',-.95,.70,2.75,1.0,1.25,.75,mat.black);
    for(const x of [-1.22,-.72])for(const z of [2.52,2.92])part(kitchen,`StovePlate_${x}_${z}`,'cylinder',x,1.36,z,.18,.025,.18,mat.steel);
    part(kitchen,'Fridge','box',-3.65,1.22,1.55,1.0,2.4,1.0,mat.fridge);
    part(kitchen,'FridgeHandle','box',-3.15,1.30,1.4,.04,.55,.06,mat.black);
    part(kitchen,'Kettle','cylinder',-3.2,1.47,2.7,.22,.38,.22,mat.steel);
    // Lounge: TV, cabinet, rug, coffee table, family photos.
    part(root,'Realism_TVCabinet','box',3.55,.42,1.4,2.2,.75,.55,mat.darkWood);
    part(root,'Realism_TV','box',3.55,1.45,1.2,1.85,1.15,.12,mat.tv);
    part(root,'Realism_Rug','box',.45,.075,.6,3.5,.03,2.5,mat.fabric);
    part(root,'Realism_CoffeeTable','box',.45,.48,.6,1.9,.10,1.05,mat.wood);
    for(const [x,z] of [[-.35,.2],[1.25,.2],[-.35,1.0],[1.25,1.0]])part(root,`CoffeeLeg_${x}_${z}`,'box',x,.25,z,.08,.45,.08,mat.darkWood);
    for(let i=0;i<3;i++){part(root,`FamilyPhoto_${i}`,'box',1.4+i*.75,2.85,-4.84,.55,.72,.045,i%2?mat.blue:mat.red);part(root,`FamilyPhotoInner_${i}`,'box',1.4+i*.75,2.85,-4.89,.42,.56,.02,mat.cream);}
    // Bedroom/storage details.
    part(root,'Realism_Wardrobe','box',-3.55,1.55,-3.35,1.35,3.0,1.05,mat.darkWood);
    part(root,'Realism_WardrobeHandleA','box',-3.2,1.55,-3.89,.035,.45,.03,mat.steel);
    part(root,'Realism_WardrobeHandleB','box',-3.9,1.55,-3.89,.035,.45,.03,mat.steel);
    part(root,'Realism_LaundryBasket','cylinder',-1.1,.45,-3.5,.55,.85,.55,mat.cream);
    // Ceiling light.
    const bulb=part(root,'Realism_HomeBulb','sphere',0,4.28,0,.25,.12,.25,mat.white);
    try{const l=new pc.Entity('Realism_HomeLight');l.addComponent('light',{type:'omni',color:new pc.Color(1,.78,.52),intensity:.85,range:8,castShadows:false});l.setLocalPosition(0,3.8,0);root.addChild(l);}catch{}
  }

  function decorateShop(root){
    if(root.findByName('Realism_ShopProducts'))return;
    const products=new pc.Entity('Realism_ShopProducts');root.addChild(products);
    // Product rows on existing shelves.
    const colours=[mat.product1,mat.product2,mat.product3,mat.product4,mat.white];
    for(const sx of [-3.1,0,3.1])for(let row=0;row<4;row++)for(let col=0;col<5;col++){
      part(products,`Product_${sx}_${row}_${col}`,'box',sx-.52+col*.26,.74+row*.78,1.28,.18,.28,.22,colours[(row+col)%colours.length]);
    }
    // Till/counter detail.
    part(root,'Realism_Till','box',1.8,1.72,-2.65,.75,.45,.65,mat.black);
    part(root,'Realism_TillScreen','box',1.8,2.0,-2.88,.52,.28,.04,mat.tv,-12,0,0);
    part(root,'Realism_CardMachine','box',.95,1.72,-2.72,.25,.12,.34,mat.black,-12,0,0);
    // Chest freezer, drinks fridge contents, bread crates.
    part(root,'Realism_Freezer','box',-3.85,.62,-1.55,1.25,1.05,2.1,mat.white);
    part(root,'Realism_FreezerGlass','box',-3.85,1.17,-1.55,1.12,.06,1.9,mat.glass);
    for(let row=0;row<4;row++)for(let col=0;col<3;col++)part(root,`FridgeDrink_${row}_${col}`,'cylinder',3.35+col*.24,.45+row*.45,-2.45,.08,.27,.08,col%2?mat.product1:mat.product2);
    for(let i=0;i<3;i++){part(root,`BreadCrate_${i}`,'box',-2.8+i*.9,.30,-3.6,.75,.55,.65,mat.yellow);for(let b=0;b<3;b++)part(root,`Bread_${i}_${b}`,'sphere',-3.05+i*.9+b*.25,.60,-3.6,.20,.11,.30,mat.cream);}
    // Security camera.
    part(root,'Realism_SecurityCamArm','box',3.8,3.75,-4.68,.45,.07,.07,mat.steel,0,0,-15);
    part(root,'Realism_SecurityCam','box',3.45,3.65,-4.68,.38,.22,.25,mat.black,0,0,-15);
  }

  findEventually('Interior_SbuHome',decorateHome);
  findEventually('Interior_CornerShop',decorateShop);

  // Non-enterable visual set dressing for advanced locations. These props are
  // placed behind/near windows and doors so the buildings read correctly from outside.
  const worldProps=new pc.Entity('RealisticLocationProps');app.root.addChild(worldProps);
  // Clinic reception glimpses.
  part(worldProps,'ClinicReception','box',-31,1.0,28.15,4.5,1.2,.55,mat.white);
  part(worldProps,'ClinicBenchA','box',-33,.55,27.8,2.3,.15,.60,mat.steel);
  part(worldProps,'ClinicBenchB','box',-29,.55,27.8,2.3,.15,.60,mat.steel);
  part(worldProps,'ClinicCrossV','box',-31,3.6,26.92,.38,1.4,.08,mat.red);
  part(worldProps,'ClinicCrossH','box',-31,3.6,26.92,1.4,.38,.08,mat.red);
  // Gym visible equipment.
  for(const x of [28.5,31,33.5]){part(worldProps,`GymBench_${x}`,'box',x,.45,27.7,1.7,.12,.52,mat.gym);part(worldProps,`GymBar_${x}`,'cylinder',x,1.05,27.7,.05,1.8,.05,mat.steel,0,0,90);for(const dx of [-.95,.95])part(worldProps,`GymWeight_${x}_${dx}`,'cylinder',x+dx,1.05,27.7,.28,.16,.28,mat.rubber,0,0,90);}
  // Workshop tools/tyres/compressor.
  for(let i=0;i<5;i++)part(worldProps,`WorkshopTyre_${i}`,'cylinder',28+i*.55,.48,-27.2,.46,.28,.46,mat.rubber,90,0,0);
  part(worldProps,'WorkshopToolbox','box',33.5,.85,-27.2,1.2,1.6,.65,mat.red);
  for(let i=0;i<4;i++)part(worldProps,`WorkshopDrawer_${i}`,'box',33.5,.35+i*.35,-27.55,1.0,.08,.025,mat.black);
  part(worldProps,'WorkshopCompressor','cylinder',26.7,.65,-27.3,.62,1.2,.62,mat.blue,0,0,90);

  window.StreetHustleInteriorRealism={decorateHome,decorateShop};
  console.info('Street Hustle: interior realism layer loaded.');
}
