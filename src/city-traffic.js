import * as pc from 'playcanvas';

// STREET HUSTLE — CITY TRAFFIC
// Lightweight lane/route traffic for the expanded prototype. Vehicles follow
// waypoint loops, slow for people and cars, pause at junctions and turn smoothly.

const world=window.StreetHustleWorld;
const app=world?.app;
if(!app){console.error('Street Hustle city traffic could not start.');}
else{
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const material=(r,g,b,metal=.08,gloss=.42)=>{const m=new pc.StandardMaterial();m.diffuse=new pc.Color(r,g,b);m.metalness=metal;m.gloss=gloss;m.update();return m;};
  const mat={
    red:material(.54,.06,.035),blue:material(.06,.21,.56),silver:material(.58,.60,.62,.18,.50),white:material(.82,.82,.79,.10,.44),
    taxi:material(.88,.72,.10,.06,.38),glass:material(.05,.14,.19,.03,.66),black:material(.025,.025,.025,0,.08),chrome:material(.42,.44,.46,.65,.56),
    head:material(.9,.88,.70,0,.45),tail:material(.55,.01,.005,0,.35)
  };
  const root=new pc.Entity('CityTraffic');app.root.addChild(root);
  function part(parent,name,type,x,y,z,sx,sy,sz,m,rx=0,ry=0,rz=0){const e=new pc.Entity(name);e.addComponent('model',{type});parent.addChild(e);e.setLocalPosition(x,y,z);e.setLocalScale(sx,sy,sz);e.setLocalEulerAngles(rx,ry,rz);e.model.material=m;return e;}
  function createCar(name,body,taxi=false){
    const e=new pc.Entity(name);root.addChild(e);
    part(e,`${name}_Body`,'box',0,.58,0,1.82,.66,3.72,body);
    part(e,`${name}_Cabin`,'box',0,1.08,-.05,1.48,.58,1.75,mat.glass);
    part(e,`${name}_BumperF`,'box',0,.39,-1.94,1.95,.20,.14,mat.black);part(e,`${name}_BumperR`,'box',0,.39,1.94,1.95,.20,.14,mat.black);
    part(e,`${name}_PlateF`,'box',0,.52,-2.02,.68,.23,.025,mat.white);part(e,`${name}_PlateR`,'box',0,.52,2.02,.68,.23,.025,mat.white);
    for(const x of [-.66,.66]){part(e,`${name}_Head_${x}`,'box',x,.67,-1.99,.38,.23,.035,mat.head);part(e,`${name}_Tail_${x}`,'box',x,.67,1.99,.38,.23,.035,mat.tail);}
    for(const [x,z] of [[-.88,-1.2],[.88,-1.2],[-.88,1.2],[.88,1.2]])part(e,`${name}_Wheel_${x}_${z}`,'cylinder',x,.34,z,.42,.22,.42,mat.black,0,0,90);
    if(taxi){part(e,`${name}_Stripe`,'box',0,.67,-1.90,1.44,.15,.055,mat.black);part(e,`${name}_Sign`,'box',0,1.49,-.05,.65,.15,.34,mat.white);}
    return e;
  }
  function angleDelta(a,b){return ((b-a+540)%360)-180;}
  function lerpAngle(a,b,t){return a+angleDelta(a,b)*Math.min(1,t);}

  // Routes are intentionally inside the current playable footprint.
  const routes={
    mainNorth:[[ -2.45,-36],[-2.45,-16],[-2.45,4],[-2.45,24],[-2.45,33]],
    mainSouth:[[ 2.45,36],[2.45,20],[2.45,4],[2.45,-16],[2.45,-36]],
    cbdEast:[[-35,32],[-18,32],[-6,32],[6,32],[20,32],[35,32]],
    cbdWest:[[35,35],[20,35],[6,35],[-6,35],[-20,35],[-35,35]],
    loopA:[[-2.45,-35],[-2.45,30],[-8,32],[-24,32],[-24,27],[-8,27],[-2.45,28]],
    loopB:[[2.45,35],[2.45,-30],[8,-30],[17,-30],[17,-26],[8,-26],[2.45,-28]]
  };

  const defs=[
    ['CitySedanRed',mat.red,'mainNorth',5.0,0,false],['CitySedanBlue',mat.blue,'mainSouth',5.4,2,false],
    ['CitySilver',mat.silver,'cbdEast',4.8,1,false],['CityWhite',mat.white,'cbdWest',5.1,3,false],
    ['CityTaxiNorth',mat.taxi,'loopA',4.25,0,true],['CityTaxiSouth',mat.taxi,'loopB',4.15,2,true]
  ];
  const cars=defs.map(([name,body,routeId,speed,start,taxi],i)=>{const e=createCar(name,body,taxi);const r=routes[routeId];const p=r[start%r.length];e.setPosition(p[0],0,p[1]);return{name,e,route:r,index:(start+1)%r.length,baseSpeed:speed,taxi,yaw:i*37,stop:0,seed:i};});

  function gameHour(){const t=document.getElementById('clock')?.textContent||'12:00';const m=t.match(/(\d{1,2}):(\d{2})/);return m?Number(m[1])+Number(m[2])/60:12;}
  function densityFactor(h){if(h<5||h>=23)return 0;if((h>=6&&h<9)||(h>=16&&h<19))return 1;return .72;}
  function nearestAhead(car){
    const pos=car.e.getPosition();let best=999;
    for(const other of cars){if(other===car||!other.e.enabled)continue;const op=other.e.getPosition();const d=Math.hypot(op.x-pos.x,op.z-pos.z);if(d<best)best=d;}
    return best;
  }

  app.on('update',dt=>{
    const h=gameHour(),density=densityFactor(h),controlled=world.getControlledPosition();
    cars.forEach((car,i)=>{
      const active=density>0&&(density>=1||i%3!==2);car.e.enabled=active;if(!active)return;
      if(car.stop>0){car.stop-=dt;return;}
      const pos=car.e.getPosition();const target=car.route[car.index];const dx=target[0]-pos.x,dz=target[1]-pos.z,d=Math.hypot(dx,dz);
      if(d<.55){
        const previous=car.route[(car.index-1+car.route.length)%car.route.length],next=car.route[(car.index+1)%car.route.length];
        const turn=Math.abs(angleDelta(Math.atan2(target[0]-previous[0],-(target[1]-previous[1]))*180/Math.PI,Math.atan2(next[0]-target[0],-(next[1]-target[1]))*180/Math.PI));
        car.index=(car.index+1)%car.route.length;
        if(turn>28)car.stop=.35+Math.random()*.45;
        if(car.taxi&&Math.random()<.18)car.stop=1.3+Math.random()*1.8;
        return;
      }
      const playerD=Math.hypot(controlled.x-pos.x,controlled.z-pos.z);const trafficD=nearestAhead(car);
      let speed=car.baseSpeed*density;
      if(playerD<5.2)speed*=clamp((playerD-1.5)/3.7,0,.8);
      if(trafficD<4.7)speed*=clamp((trafficD-1.8)/3,0,.75);
      const desired=Math.atan2(dx,-dz)*180/Math.PI;car.yaw=lerpAngle(car.yaw,desired,dt*3.4);car.e.setEulerAngles(0,car.yaw,0);
      const step=Math.min(d,speed*dt);car.e.setPosition(pos.x+dx/d*step,0,pos.z+dz/d*step);
    });
  });

  window.StreetHustleCityTraffic={cars,routes};
  console.info('Street Hustle: city traffic layer loaded.');
}
