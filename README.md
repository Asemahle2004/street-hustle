# Street Hustle

**Street Hustle** is a browser-first 3D life-simulation/adventure game about starting with almost nothing, chasing wealth and status, facing consequences, losing what you built, and rebuilding again.

> ZERO → HERO → ZERO → HERO

## Technology

- **3D engine:** PlayCanvas Engine
- **Language:** JavaScript
- **Development:** Browser + GitHub + ChatGPT
- **Hosting:** GitHub Pages
- **PlayCanvas:** pinned CDN import
- **No local game-engine installation required**

## Playable alpha

The repo now contains a complete **systems alpha** rather than only a Day 1 test. The city/content is intentionally small, but the major game loops are coded so they can be tested together.

Implemented:

- 3D South African-flavoured neighbourhood prototype
- animated third-person player prototype
- walking, running, orbit camera and collision
- keyboard and mobile controls
- day/night lighting and in-game clock
- multi-day progression
- NPC conversations and relationships/trust
- legitimate and risky earning opportunities
- cash, bank, reputation, heat, energy, wellbeing and family stats
- shop and inventory
- parcel-delivery flow
- stable-work unlock
- in-game phone with jobs, money, business, garage, bag, people and profile screens
- banking (deposit/withdraw)
- three business tiers with daily income/expenses
- first purchasable and drivable prototype vehicle
- heat consequences
- autosave/load in browser storage
- multiple-character framework/unlocks
- first full **Zero → Hero → Zero → Hero** progression arc

## Current controls

### Desktop
- `WASD` / arrow keys — move or drive
- `Shift` — run
- mouse drag — rotate camera
- mouse wheel — zoom
- `E` — interact / enter or exit vehicle
- `P` — open phone
- `Esc` — exit vehicle

### Mobile
Use the on-screen movement, RUN, PHONE and E buttons. Drag the 3D view to rotate the camera.

## Important alpha limitation

This is **not the finished GTA-scale game**. It is the full current gameplay architecture in a small prototype world. Final-quality characters, animations, traffic, interiors, large city districts, advanced AI, voice acting, cinematics, many missions and production-quality art still require later development and assets.

The purpose of this alpha is to let the whole game design be tested now, then fix and expand systems without rebuilding the foundation.

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the long-term plan.
