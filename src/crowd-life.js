import * as pc from 'playcanvas';

// STREET HUSTLE — CROWD LIFE
// Adds a second population layer using shared humanoid prototype assets. These
// pedestrians walk, turn, pause, wait, form small groups and follow different
// daily routines. The existing mission NPCs stay untouched.

const world=window.StreetHustleWorld;
const app=world?.app;
if(!app){console.error('Street Hustle crowd-life layer could not start.');}
else{
  const URLS={
    xbot:'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Xbot.glb',
    michelle:'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Michelle.glb',
    soldier:'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Soldier.glb'
  };
  const assets=new Map();
  const people=[];
  const nextFrame=()=>new Promise(r=>requestAnimationFrame(r));

  function load(id){
    if(assets.has(id))return assets.get(id);
    const p=new Promise((resolve,reject)=>app.assets.loadFromUrlAndFilename(URLS[id],`${id}-crowd.glb`,'container',(err,a)=>err||!a?.resource?reject(err||new Error(id)):resolve(a)));
    assets.set(id,p);return p;
  }
  function bounds(entity){
    let minY=Infinity,maxY=-Infinity,minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity,found=false;
    for(const r of entity.findComponents('render'))for(const mi of r.meshInstances??[]){const a=mi.aabb;if(!a)continue;found=true;const c=a.center,h=a.halfExtents;minY=Math.min(minY,c.y-h.y);maxY=Math.max(maxY,c.y+h.y);minX=Math.min(minX,c.x-h.x);maxX=Math.max(maxX,c.x+h.x);minZ=Math.min(minZ,c.z-h.z);maxZ=Math.max(maxZ,c.z+h.z);}
    return found?{minY,maxY,height:maxY-minY,width:maxX-minX,depth:maxZ-minZ}:null;
  }
  async function normalize(model,target=2.55){
    const rotations=[[0,180,0],[0,0,0],[90,180,0],[-90,180,0],[0,180,90],[0,180,-90]];let best=null;
    for(const r of rotations){model.setLocalEulerAngles(...r);await nextFrame();await nextFrame();const b=bounds(model);if(!b)continue;const score=b.height/Math.max(b.width,b.depth,.001);if(!best||score>best.score)best={r,score};}
    if(!best)return false;model.setLocalEulerAngles(...best.r);await nextFrame();const b=bounds(model);if(!b||b.height<.001)return false;const s=model.getLocalScale(),f=target/b.height;model.setLocalScale(s.x*f,s.y*f,s.z*f);await nextFrame();await nextFrame();const after=bounds(model);if(after){const p=model.getLocalPosition();model.setLocalPosition(p.x,p.y-after.minY,p.z);}return true;
  }
  function findTrack(asset,names){
    for(const want of names){const q=want.toLowerCase();for(const a of asset.resource?.animations??[]){const t=a.resource??a;const labels=[a.name,t?.name].filter(Boolean).map(x=>String(x).toLowerCase());if(labels.some(x=>x.includes(q)))return t;}}return null;
  }
  function animation(host,asset){
    const idle=findTrack(asset,['idle','standing'])||findTrack(asset,['walk']);const walk=findTrack(asset,['walk','walking'])||findTrack(asset,['run']);if(!walk&&!idle)return;
    try{host.addComponent('anim',{activate:true});host.anim.loadStateGraph({layers:[{name:'crowd',states:[{name:'START'},{name:'Idle'},{name:'Walk'},{name:'END'}],transitions:[{from:'START',to:'Idle',time:0},{from:'Idle',to:'Walk',time:.18,conditions:[{parameterName:'moving',predicate:pc.ANIM_EQUAL_TO,value:true}]},{from:'Walk',to:'Idle',time:.22,conditions:[{parameterName:'moving',predicate:pc.ANIM_EQUAL_TO,value:false}]}]}],parameters:{moving:{name:'moving',type:pc.ANIM_PARAMETER_BOOLEAN,value:false}}});if(idle)host.anim.baseLayer.assignAnimation('Idle',idle);if(walk)host.anim.baseLayer.assignAnimation('Walk',walk);}catch(e){console.warn('Crowd animation fallback',e);}
  }
  function setMoving(p,moving){if(p.moving===moving)return;p.moving=moving;try{p.host.anim?.setBoolean('moving',moving);}catch{}}
  function angleDelta(a,b){return ((b-a+540)%360)-180;}
  function lerpAngle(a,b,t){return a+angleDelta(a,b)*Math.min(1,t);}

  const routines=[
    {name:'TaxiCommuter1',model:'michelle',route:[[9,-31],[9,-27],[8,-25]],speed:1.0,wait:[4,8]},
    {name:'TaxiCommuter2',model:'xbot',route:[[6,-30],[7,-27],[8,-29]],speed:1.15,wait:[3,7]},
    {name:'ShopCustomer1',model:'michelle',route:[[8,-15],[8,-20],[9,-22],[7,-18]],speed:1.05,wait:[2,5]},
    {name:'ShopCustomer2',model:'xbot',route:[[7,-9],[8,-18],[7,-22],[7,-12]],speed:1.18,wait:[1,4]},
    {name:'WorkshopWorker1',model:'soldier',route:[[22,13],[25,14],[29,13],[25,9]],speed:1.1,wait:[2,4]},
    {name:'WorkshopWorker2',model:'xbot',route:[[24,7],[29,8],[31,12],[27,15]],speed:1.22,wait:[2,5]},
    {name:'SportsFan1',model:'michelle',route:[[-20,-17],[-25,-18],[-30,-18],[-25,-16]],speed:1.0,wait:[3,7]},
    {name:'SportsFan2',model:'xbot',route:[[-34,-18],[-30,-20],[-24,-20],[-28,-17]],speed:1.2,wait:[2,6]},
    {name:'CBDWalker1',model:'michelle',route:[[-14,27],[-8,27],[0,27],[8,27],[14,27]],speed:1.25,wait:[1,3]},
    {name:'CBDWalker2',model:'xbot',route:[[15,26],[8,28],[0,29],[-8,28],[-15,26]],speed:1.32,wait:[1,3]},
    {name:'TechWorker',model:'xbot',route:[[-22,10],[-25,13],[-27,9],[-23,5]],speed:1.08,wait:[2,5]},
    {name:'NeighbourWalker',model:'michelle',route:[[-8,22],[-8,13],[-8,3],[-8,-8],[-8,-18]],speed:1.02,wait:[2,5]},
    {name:'NeighbourWalker2',model:'soldier',route:[[8,18],[8,8],[8,-3],[8,-14],[8,-23]],speed:1.12,wait:[2,5]},
    {name:'ParkVisitor',model:'michelle',route:[[-20,1],[-24,1],[-26,4],[-23,-2]],speed:.92,wait:[4,9]}
  ];

  async function create(def,index){
    try{
      const asset=await load(def.model);const root=new pc.Entity(`Crowd_${def.name}`);app.root.addChild(root);root.setPosition(def.route[0][0],0,def.route[0][1]);
      const host=new pc.Entity(`${def.name}_Host`);root.addChild(host);const model=asset.resource.instantiateRenderEntity({castShadows:false});host.addChild(model);model.setLocalPosition(0,0,0);model.setLocalScale(1,1,1);
      if(!await normalize(model,2.45+(index%4)*.06)){root.destroy();return;}
      animation(host,asset);
      const p={...def,waitRange:[...def.wait],root,host,index:1,waitCountdown:index*.23,moving:false,yaw:index*27};people.push(p);
    }catch(e){console.warn(`Crowd member ${def.name} skipped`,e);}
  }
  Promise.allSettled([load('xbot'),load('michelle'),load('soldier')]).then(()=>routines.forEach((d,i)=>create(d,i)));

  const groupSpots=[[-17,24],[-10,-22],[11,-20],[20,20]];
  for(let i=0;i<groupSpots.length;i++){
    const [x,z]=groupSpots[i];const marker=new pc.Entity(`ConversationSpot_${i}`);marker.setPosition(x,0,z);app.root.addChild(marker);
  }

  function hour(){const t=document.getElementById('clock')?.textContent||'12:00';const m=t.match(/(\d{1,2}):(\d{2})/);return m?Number(m[1])+Number(m[2])/60:12;}
  function activeForTime(name,h){
    if(name.includes('CBD'))return h>=7&&h<20;
    if(name.includes('Workshop')||name.includes('Tech'))return h>=6.5&&h<18.5;
    if(name.includes('Sports'))return h>=15&&h<21;
    if(name.includes('Taxi'))return h>=5&&h<22;
    return h>=6&&h<21.5;
  }

  app.on('update',dt=>{
    const h=hour();const inside=Boolean(window.StreetHustleLivingWorld?.currentInterior);
    for(const p of people){
      p.root.enabled=!inside&&activeForTime(p.name,h);if(!p.root.enabled)continue;
      if(p.waitCountdown>0){p.waitCountdown-=dt;setMoving(p,false);continue;}
      const target=p.route[p.index];const pos=p.root.getPosition();const dx=target[0]-pos.x,dz=target[1]-pos.z,d=Math.hypot(dx,dz);
      if(d<.28){p.index=(p.index+1)%p.route.length;const [minWait,maxWait]=p.waitRange;p.waitCountdown=minWait+Math.random()*(maxWait-minWait);setMoving(p,false);continue;}
      const desired=Math.atan2(dx,-dz)*180/Math.PI;p.yaw=lerpAngle(p.yaw,desired,dt*5.2);p.root.setEulerAngles(0,p.yaw,0);
      const step=Math.min(d,p.speed*dt);p.root.setPosition(pos.x+dx/d*step,0,pos.z+dz/d*step);setMoving(p,true);
    }
  });

  window.StreetHustleCrowdLife={people,routines};
  console.info('Street Hustle: crowd-life layer loaded.');
}
