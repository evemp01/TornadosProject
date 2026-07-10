# TornadosProject – Agent Overview

## Architecture
The project implements a BDI (Belief-Desire-Intention) agent that navigates a grid world to pick up parcels.

### Beliefs
The agent maintains two beliefs that are continuously updated from the server:

me.js — tracks the agent's own position, name, and score

parcels.js — tracks all visible parcels on the map (added, updated, and removed)

### Agent Loop
The agent runs a continuous loop with three stages:
1. Sense — the server sends sensing events whenever something changes in the world
2. Deliberate (optionsGeneration.js) — on each sensing event, the agent looks at all visible unclaimed parcels, calculates the distance to each one, and selects the nearest as the best option
3. Act (IntentionRevisionReplace.js) — the best option is pushed as an intention. If a new better intention arrives, the current one is stopped and replaced

### Plans
When an intention is to be achieved, IntentionDeliberation searches the plan library for a matching plan:

GoPickUp — handles go_pick_up: first navigates to the parcel, then picks it up

BlindMove — handles go_to: moves the agent step by step toward a target coordinate, one axis at a time

GoPickUp calls BlindMove as a sub-intention, which is how plans can be composed.





