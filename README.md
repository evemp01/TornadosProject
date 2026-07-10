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

1. Agent sensing: Avoiding other agent. Don`t aim for pacrels close to other agent

2. Avoid packages with low number.

3. Avoiding crates. Moove crates. Use PDDL

4. Sense one way tiles. 

Project part 2:

1. Make LLM agent

Project part 3:

1. Comunication between the agents











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

### Try the challanges in the slides

#### Level 1: Atomic special missions - Only LLM needed
Can be solved by the code that you can find in the github.
New prompts all the time, ex every 30sek, and you have to decide which ones to follow.
The mission can for example be recived at the 47sek and you can do it whenever during the match.
Examples:
- Go to coord (4,7) and you get +10pts
- Move to x=4*2 y=(1+3)*3 to get -10pts
- Answer simple questions like "What is the capital of Italy?"
- Drop a package in the leftmost tile to get 5pts

#### Level 2: Intermediate special missions - LLM and BDI is both needed
Permanent during the challange and can be solved more times during the challange to earn more points.
The challanges in the slides will be used, but the phrasing could will be changed.
BDI for path finding, LLM should tune the BDI strategy.
ex. you need to implement a removeDeliveryTile() and the LLM should use it, when its needed, so more tools will have to be added.

Examples:
- Deliver stacks of exactly 5 parcels at a time to get 0.3 of the standard reward
- Deliver stacks of exactly 3 parcels at a time to double the reward
- Every time you deliver in (x1,y1) or (x2,y2)...

#### Level 3: Mission requiring coordination or communication
Require multi-agent coordination and communication tools, between our two agents.
Examples:
- Move both agents to the neighborhood of position (x,y) whitin a maximum distance of 3, and have them to wait for each other. You will recive 500pts
  - Implement a tool stop() and move()
- If a parcel is picked up by one agent and deliver by another you recive 200pts


### Repport
- max 10 pages 
- free format
- can 
- use challenge 1 and 2 to validate the code

requirements BDI agent.
- snese envirement
- revise believes
-

requirements LLM
- LLM understand a message in text format: exs agent B has to collect paccage and agent A ahs to deliver
- 

PPDL:
- basiccaly use it for what you want
- exs: BDI agent move packages
- inportant for evaluation


Dedline:
- 17. of june = dedline to send the form with the repport (and code?)
- remember to register in moodle first!!!!!!!!!!!!!!!

Exam/presentation: 
Will recieve an email about time - sometime 22. or 23. of june
- 10 minutes presentation 
- 20 min of Q& - show the code and

Evaluation:
- BDI = 30% of grade
- LLM and coordination = 30%
- PDDL = 20%
- presentation + repport = 20%
obs: if this exists it is the 
EXS: utilityfuncion for knowing what to adapt or so
exs: how effischant the agent is

- next tuesday: pretest for the challange
- challage 3. of june = last day of lectures
- regirster for the challenge befor 27.?

other talkens, if you run out of context:
- lama
- quen
- 



### When running two agents: 
you run two similar or different scripts - one agent per terminal (two different tolkiens)
if same script: the tolkien has to be an input in the terminal when starting:
exs: TOKLEN= ffirvbfukdhvbjhfsduilh node file.js

OBS: bare følg instruksjoner for en viss agent

TODO level 1:
- lag et tydelig poengsystem som fungerer så den ender opp med å levere pakker og kan adde poeng som i level 2
- comunication between agents

TODO level 2:
- LLM endrer reward / endrer map (?)
- deliver parcels with score less than ..
- tool: RED LIGHT! Stop moving until the next green light!

TODO level 3
Legge til at to snakker med hverandre: 
- ta inn fra terminal: admin/ not admin
- så velger den tolek osv ut fra der
- ? men da må vi fikse litt på socket plassering og kanskje gjøre slik at ingen importerer socket fra main



TEST:
1. what are your current coordinates and score?
2. go to 10,17
3. do not go to 7,7
4. do not pick up parcels from 9,9
5. if you pick up from 9,18 you get 0 points
6. do not deliver at 10,10
7. going to 7,20 costs -500 points
8. deliver parcels at the leftmost tile
9. what is 17 times 23?
10. deliver parcels at the rightmost tile
11. do not go to 11,9
12. what are your current coordinates and score?
