// Keep long-game training interactions aligned with the final city-density pass.
const scope=window.StreetHustleFullScope;
if(scope?.trainingLocations){
  const updates={
    media:{x:-22,z:7},
    sport:{x:-15,z:-34},
    business:{x:16,z:-34},
    electrical:{x:30,z:16},
    technology:{x:-30,z:16},
    community:{x:-30,z:-15}
  };
  for(const loc of scope.trainingLocations){
    const next=updates[loc.id];if(next){loc.x=next.x;loc.z=next.z;}
  }
}
