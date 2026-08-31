import * as pc from 'playcanvas';

// STREET HUSTLE — PROTAGONIST CAST VISUALS
// Gives unlocked protagonists distinct prototype humanoid visuals. The original
// Sbu soldier remains the default. Zinhle and Kabelo use alternate skinned
// humanoids and follow player movement/turning through the existing Player root.

const world=window.StreetHustleWorld;
const app=world?.app;
const player=world?.player;
const playerVisual=world?.playerVisual;

if(!app||!player||!playerVisual){
  console.error('Street Hustle protagonist cast could not start: player core missing.');
}else{
  const TARGET_HEIGHT=2.75;
  const urls={
    zinhle:'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Michelle.glb',
    kabelo:'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Xbot.glb'
  };
  const hosts=new Map();
  const promises=new Map();
  let current='sbu';
  let lastPos=player.getPosition().clone();
  let sample=0;

  const nextFrame=()=>new Promise(r=>requestAnimationFrame(r));
  async function settle(n=2){for(let i=0;i<n;i++)await nextFrame();}
  function bounds(entity){
    const renders=entity.findComponents('render');
    let minY=Infinity,maxY=-Infinity,minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity,found=false;
    for(const r of renders)for(const mi of r.meshInstances??[]){const a=mi.aabb;if(!a)continue;const c=a.center,h=a.halfExtents;minY=Math.min(minY,c.y-h.y);maxY=Math.max(maxY,c.y+h.y);minX=Math.min(minX,c.x-h.x);maxX=Math.max(maxX,c.x+h.x);minZ=Math.min(minZ,c.z-h.z);maxZ=Math.max(maxZ,c.z+h.z);found=true;}
    return found?{minY,maxY,height:maxY-minY,width:maxX-minX,depth:maxZ-minZ}:null;
  }
  async function normalize(model){
    const rotations=[[0,180,0],[0,0,0],[90,180,0],[-90,180,0],[0,180,90],[0,180,-90]];
    let best=null;
    for(const [x,y,z] of rotations){model.setLocalEulerAngles(x,y,z);await settle(2);const b=bounds(model);if(!b)continue;const score=b.height/Math.max(b.width,b.depth,.001);if(!best||score>best.score)best={x,y,z,score};}
    if(!best)return false;
    model.setLocalEulerAngles(best.x,best.y,best.z);await settle(2);const b=bounds(model);if(!b||b.height<.001)return false;
    const scale=TARGET_HEIGHT/b.height;model.setLocalScale(scale,scale,scale);await settle(3);const after=bounds(model);if(after){const p=model.getLocalPosition();model.setLocalPosition(p.x,p.y-after.minY,p.z);}return true;
  }
  function findTrack(asset,names){
    for(const wanted of names){const target=wanted.toLowerCase();for(const a of asset.resource?.animations??[]){const t=a.resource??a;const labels=[a.name,t?.name].filter(Boolean).map(v=>String(v).toLowerCase());if(labels.some(v=>v.includes(target)))return t;}}
    return null;
  }
  function setupAnim(host,asset){
    const walk=findTrack(asset,['walk','walking','run']);
    const idle=findTrack(asset,['idle','standing'])??walk;
    if(!walk&&!idle)return;
    try{
      host.addComponent('anim',{activate:true});
      host.anim.loadStateGraph({layers:[{name:'cast',states:[{name:'START'},{name:'Idle'},{name:'Walk'},{name:'END'}],transitions:[{from:'START',to:'Idle',time:0}]}],parameters:{}});
      if(idle)host.anim.baseLayer.assignAnimation('Idle',idle);
      if(walk)host.anim.baseLayer.assignAnimation('Walk',walk);
    }catch(e){console.warn('Street Hustle cast animation fallback.',e);}
  }
  function load(id){
    if(promises.has(id))return promises.get(id);
    const p=new Promise((resolve,reject)=>app.assets.loadFromUrlAndFilename(urls[id],`${id}.glb`,'container',(err,asset)=>err||!asset?.resource?reject(err||new Error(id)):resolve(asset)));
    promises.set(id,p);return p;
  }
  async function ensure(id){
    if(id==='sbu'||hosts.has(id))return hosts.get(id);
    try{
      const asset=await load(id);const host=new pc.Entity(`Cast_${id}`);playerVisual.addChild(host);const model=asset.resource.instantiateRenderEntity({castShadows:false});host.addChild(model);model.setLocalPosition(0,0,0);model.setLocalScale(1,1,1);
      if(!await normalize(model))throw new Error('normalize failed');setupAnim(host,asset);host.enabled=false;hosts.set(id,host);return host;
    }catch(e){console.warn(`Street Hustle: ${id} visual unavailable.`,e);return null;}
  }
  function soldier(){return playerVisual.findByName('PrototypeHumanoid');}
  async function switchTo(id){
    id=id.toLowerCase();if(!['sbu','zinhle','kabelo'].includes(id))id='sbu';
    current=id;for(const h of hosts.values())h.enabled=false;const s=soldier();if(s)s.enabled=id==='sbu';
    if(id!=='sbu'){const h=await ensure(id);if(h){h.enabled=true;if(s)s.enabled=false;}else if(s)s.enabled=true;}
  }
  function hudCharacter(){const name=(document.getElementById('character-name')?.textContent||'SBU').trim().toLowerCase();return name.includes('zinhle')?'zinhle':name.includes('kabelo')?'kabelo':'sbu';}

  app.on('update',(dt)=>{
    const desired=hudCharacter();if(desired!==current)switchTo(desired);
    sample+=dt;if(sample<.15)return;const p=player.getPosition();const speed=Math.hypot(p.x-lastPos.x,p.z-lastPos.z)/Math.max(sample,.001);lastPos=p.clone();sample=0;
    const host=hosts.get(current);if(!host?.anim)return;
    try{const layer=host.anim.baseLayer;const target=speed>.12?'Walk':'Idle';if(layer.activeState!==target)layer.transition(target,.14);}catch{}
  });

  switchTo('sbu');
  window.StreetHustleCastVisuals={switchTo,get current(){return current;}};
}
