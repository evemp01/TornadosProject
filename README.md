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

## Todoo
Project part 1:

1. Agent sensing: Avoiding other agent. Don`t aim for pacrels cloce to other agent

2. Avoid packages with low number.

3. Avoiding crates. Moove crates. Use PDDL

4. Sense one way tiles. 

Project part 2:

1. Make LLM agent

## Next lessons:
- 20/5 Exam presentation
- 26/5 Support for second challange
- 27/5 Last day for the form to the second challange
- 3/6  Second challange

## Second Challange - Notes
We will have 2 agents, we can choose if we want:
- Both of them to be LLM and BDI based (could be needed for the level 3 missions)
- One BDI agent just delivering and picking up parcels + One agent following the llm tasks (More for only level 1 scenarios I think)

Could be done with only the BDI agent, but the special llm missions can give a lot of more or less points.

They will send the missions from a "missionAgent", they will provide the name of it, so our agent should only take instructions from that agent, and not misleading fake missions from other agents.

Try the challanges in the slides:
### Atomic special missions - Only LLM needed
Can be solved by the code that you can find in the github.
New prompts all the time, ex every 30sek, and you have to decide which ones to follow.
The mission can for example be recived at the 47sek and you can do it whenever during the match.
Examples:
- Go to coord (4,7) and you get +10pts
- Move to x=4*2 y=(1+3)*3 to get -10pts
- Answer simple questions like "What is the capital of Italy?"
- Drop a package in the leftmost tile to get 5pts

### Intermediate special missions - LLM and BDI is both needed
Permanent during the challange and can be solved more times during the challange to earn more points.
The challanges in the slides will be used, but the phrasing could will be changed.
BDI for path finding, LLM should tune the BDI strategy.
ex. you need to implement a removeDeliveryTile() and the LLM should use it, when its needed, so more tools will have to be added.

Examples:
- Deliver stacks of exactly 5 parcels at a time to get 0.3 of the standard reward
- Deliver stacks of exactly 3 parcels at a time to double the reward
- Every time you deliver in (x1,y1) or (x2,y2)...

### Mission requiring coordination or communication
Require multi-agent coordination and communication tools, between our two agents.
Examples:
- Move both agents to the neighborhood of position (x,y) whitin a maximum distance of 3, and have them to wait for each other. You will recive 500pts
  - Implement a tool stop() and move()
- If a parcel is picked up by one agent and deliver by another you recive 200pts
