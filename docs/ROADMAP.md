# Street Hustle Roadmap

## Phase 0 — Restart foundation

Technology: PlayCanvas Engine + JavaScript + GitHub + browser.

Goals:
- no large local game-engine installation
- keep all source code in GitHub
- run the game in a normal browser
- design systems so assets/data can later migrate to Unity or Unreal if the project reaches that scale

## v0.1 — Day One

Goal: prove that moving around and living inside the world is enjoyable before expanding the city.

Completed foundation:
- small 3D neighbourhood
- third-person player movement
- orbit/follow camera
- mobile touch controls
- walk/run controls
- animated prototype human character
- player home
- main road, houses and corner shop
- South African neighbourhood detail pass
- building collision
- money, reputation, heat and inventory HUD

Completed Day 1 gameplay loop:
- Ma starts the family story objective
- interactive NPCs and dialogue system
- car-wash work: R30 / +1 reputation
- shop crate work: R20 / +1 reputation
- parcel delivery: R35 / +2 reputation
- risky fictional quick-cash option: R60 / -1 reputation / +2 heat
- corner-shop bread purchase for R25
- return bread home to complete Day 1
- browser autosave for cash, reputation, heat, inventory, jobs, story flags and player position

Next for v0.1:
- replace temporary prototype NPC bodies with higher-quality characters
- improve player animation/orientation reliability
- add sound and basic ambient audio
- improve collision around fences and street props
- improve mobile performance
- polish Day 1 pacing and feedback

## v0.2 — Daily Life

- in-game smartphone
- job board
- more jobs
- NPC schedules
- friendship/trust system
- clothing and character customization
- expanded inventory
- day/night cycle
- food/needs only if they improve gameplay

## v0.3 — Vehicles and Consequences

- first drivable vehicle
- vehicle ownership
- taxi/public-transport systems
- traffic prototypes
- expand police/heat system
- arrest consequences
- housing progression
- relationships

## v0.4 — Business

- start small businesses
- customers
- employees
- expenses and income
- business reputation
- contracts
- business failure/bankruptcy

## v0.5 — Zero → Hero → Zero

- major life events
- asset loss
- prison/release states
- long-term consequences
- rebuilding after failure
- first complete rise/fall/rebuild arc

## v0.6+ — City expansion

- additional neighbourhoods
- township centre
- industrial district
- CBD
- wealthy district
- larger traffic/NPC simulation
- selected building interiors
- larger mission arcs

## Long-term

- multiple male and female protagonists
- shared city where character stories cross
- football, music, technology, employment, business and crime story routes
- character aging
- family and children
- persistent relationships and enemies
- multiple endings based on the whole life, not only money
- high-quality 3D assets, animation, sound and cinematics

## Engine strategy

PlayCanvas is the current production/prototyping engine because it works in the browser and lets the project advance without large local installations. If Street Hustle eventually reaches a scale where a native engine is necessary, the project can migrate to Unity or Unreal with its game design, data, stories, 3D assets, audio and documentation preserved. Gameplay engine code would need to be rewritten during such a migration.
