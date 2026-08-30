# Street Hustle Roadmap

## Foundation

Technology: PlayCanvas Engine + JavaScript + GitHub + browser.

Goals:
- no large local game-engine installation
- keep all source code in GitHub
- run the game in a normal browser
- keep story/data/assets portable enough to migrate later if needed

## Current milestone — Full Systems Alpha

The project has moved beyond the original Day 1 proof of concept. The major gameplay systems are now wired together in one small neighbourhood so the whole design can be tested before more content is produced.

Implemented:
- third-person animated player prototype
- walking/running and orbit camera
- mobile controls
- player/building collision
- South African neighbourhood detail pass
- day/night lighting and clock
- multi-day progression
- NPC conversations
- relationships/trust
- legitimate jobs and risky choices
- cash, bank, reputation, heat, energy, wellbeing and family stats
- inventory and shop
- parcel-delivery mission
- stable-work progression
- in-game phone
- banking
- business ownership, expenses and daily profit
- first drivable vehicle and vehicle ownership
- heat consequences
- browser autosave/load
- multiple-character unlock/switch framework
- first Zero → Hero → Zero → Hero progression loop

## Next — Alpha Stabilisation

Do not add a huge city yet. First test and fix the existing alpha:
- character model orientation/scale/animation bugs
- dialogue and interaction conflicts
- mobile control bugs
- save migration bugs
- vehicle handling/collision
- business economy balance
- heat consequence balance
- objective progression blockers
- performance on ordinary Android phones

## After stabilisation — Content Expansion

### World
- second neighbourhood
- township centre
- industrial/work district
- CBD
- wealthy district
- selected interiors
- taxi/public transport routes
- traffic
- pedestrians/NPC schedules

### Life systems
- clothing/customisation
- housing progression
- education/training
- deeper family system
- friendships and relationships
- health/wellbeing events
- skills and qualifications
- larger job/career trees

### Business
- customers
- employees
- suppliers
- stock
- contracts
- business reputation
- loans/funding where appropriate
- expansion and bankruptcy

### Consequences and story
- larger legal/heat system
- arrest/prison/release story phases
- business collapse
- betrayal and relationship consequences
- injury/setback events
- multiple endings based on the whole life rather than money alone

### Vehicles
- better vehicle physics
- multiple cars
- taxis
- ownership/maintenance/fuel if they improve gameplay
- traffic AI

### Presentation
- original Street Hustle characters
- original animations
- better buildings/props/textures
- ambient sound and music
- voice acting later
- cinematics later

## Long-term ambition

Street Hustle aims for GTA-style freedom and a deep life simulation in a fictional South African city, while remaining realistic about development scale. A true GTA-production level requires a funded team, large content pipeline and years of production. The current browser alpha exists to prove the game before that level of investment.

## Engine strategy

PlayCanvas is the current engine because it allows browser-first development with minimal local storage. If the game later reaches a scale where a native engine is necessary, the story design, structured data, 3D assets, audio and documentation can be migrated, while engine-specific gameplay code would need rewriting.
