# TornadosProject — DeliverooJS BDI Agent

A BDI (Belief-Desire-Intention) agent for the [DeliverooJS](https://github.com/unitn-ASA/DeliverooJS) environment, with a second, independent LLM-driven agent that listens to the in-game chat and translates natural-language requests ("go to 5,5", "do not pick up at 9,9", "deliver exactly 3 parcels at a time"...) into live changes to the BDI agent's behavior.

## Setup

```bash
npm install
```

Create a `.env` file (never commit this — it's gitignored) with:

```
DELIVEROOJS_URL=<server url>
DELIVEROOJS_TOKEN=<your agent token>
LITELLM_BASE_URL=<LiteLLM-compatible endpoint>       # optional, has a default
LITELLM_API_KEY=<api key for the LLM endpoint>        # required
LOCAL_MODEL=<model name>                              # optional, has a default
```

Run the agent:

```bash
node main.js
```

`main.js` wires up both agents and connects to the server; `main_BDI.js` and `main_LLM.js` can also be read independently to understand each half.

## Architecture

Two loops run side by side, sharing belief state:

- **BDI loop** (`main_BDI.js`, `BDI_agent/`) — senses the world, decides what to do (deliver, pick up, spawn, run a mission), and acts by walking/picking up/delivering.
- **LLM loop** (`main_LLM.js`) — a hand-rolled ReAct-style tool-calling loop that reads chat messages and calls into the same belief/constraint state the BDI agent reads from, so a chat command takes effect on the very next BDI decision cycle.

Both are tied together by `BDI_agent/utils/eventQueue.js`, which serializes chat messages and sensing events into a single queue and re-runs `optionsGeneration` after each one.

### Beliefs (`BDI_agent/beliefs/`)

Plain modules with mutable exported state, populated from the DeliverooJS socket's sensing callbacks:

- `me.js` — the agent's own position, name, score, and config (e.g. `observationDistance`).
- `parcels.js` — all currently-visible parcels, keyed by id, refreshed every sensing tick (added/updated/removed to match the server exactly).
- `map.js` — the static grid: `spawnTiles`, `deliveryTiles`, `blackTiles`, `whiteTiles`, directional tiles, and crate tiles.
- `agents.js` — other visible agents, used by pathing to avoid walking into them.
- `crates.js` — visible crates and their initial spawn positions, used by the PDDL solver.
- `missions.js` — chat-issued "go to X,Y" errands, each tracked with a `done` flag so a mission is retried until it actually succeeds instead of being abandoned after one failure.
- `constraints.js` — a policy layer of chat-issued rules layered *on top of* the map (deliberately kept separate from `map.js`, which is server ground truth). Supports: `avoid_tile`, `no_pickup_at`, `no_deliver_at`, `prefer_deliver_at`, and a tunable `maxCarry` limit.

### Intentions (`BDI_agent/intentions/`)

- `IntentionRevision.js` — the base intention queue and its `loop()`: repeatedly takes the front intention and awaits it, dropping it once it resolves (or throws).
- `IntentionRevisionRevise.js` — the concrete queue used by the BDI agent. `push(predicate)` adds a new desire, sorts the queue by a utility function (delivery value vs. travel cost, mission reward, etc.), and preempts the currently running intention if the new one is significantly better. It also prunes stale `go_pick_up` intentions on every push — for parcels already delivered, already carried (by anyone), or whose tile has since become avoided/banned — so a queued pickup can't fire against a parcel that no longer needs picking up.
- `IntentionDeliberation.js` — given a predicate like `['go_to', x, y]`, searches the plan library for the first applicable plan and executes it, allowing sub-intentions (plans calling plans).

### Options generation (`BDI_agent/agent/optionsGeneration.js`)

Runs after every sensing/chat event and pushes the current set of desires:
- `go_deliver` whenever carrying at least one parcel.
- `go_pick_up` for visible, unclaimed parcels — skipping any that are avoided, pickup-banned, or would push the agent over the current max-carry limit (counting both what's already carried *and* what's already queued to be picked up, so a single pass can't overshoot the cap).
- If a chat command lowers the carry limit below what the agent is already holding, every queued (and the currently running) `go_pick_up` is stopped so the agent delivers what it's holding before chasing anything else.
- `go_spawn` as a fallback when nothing better is available.
- `go_to_mission` for every open chat-issued mission.

### Plans (`BDI_agent/plans/`)

- `Navigate.js` — walks an A* path (`BDI_agent/utils/astar.js`) one tile at a time, opportunistically picking up any parcel it passes over. Falls back to a PDDL-based crate-pushing solver (`BDI_agent/pddl/`) when no direct path exists, and reroutes around agents/crates that block a step, up to a bounded number of reroute attempts.
- `GoPickUp.js` — navigates to a parcel's tile and picks it up.
- `GoDeliver.js` — picks the delivery tile to walk to (honoring a chat-set `prefer_deliver_at` tile if it's still valid and unrestricted, otherwise the nearest unrestricted one) and drops everything currently carried there.
- `GoToSpawn.js` — walks to a spawn tile to wait for new parcels, preferring a farther one if the nearest has gone quiet for a while.
- `goToMission.js` — walks to a chat-issued destination, retrying the whole walk on transient failures until it actually arrives (missions are meant to be prioritized, so they don't give up after one blocked step).
- `PlanBase.js` — shared plan machinery: `stop()`/`stopped`, `commit()`/`committed` (a committed plan — e.g. mid-PDDL-sequence — can't be preempted), and `subIntention()` for composing plans.

### PDDL crate solving (`BDI_agent/pddl/`)

When A* can't find a direct path (crates blocking the way), `Navigate.js` falls back to `problemGenerator.js`, which builds a PDDL problem from the current crate/agent state and solves it via `solver.planning.domains` against `domain.pddl`, producing a sequence of moves/pushes to clear a path.

### LLM chat agent (`main_LLM.js`)

A ReAct-style loop (`Thought` → `Action`/`Action Input` → `Observation`, or `Final Answer`) against an OpenAI-compatible endpoint, bounded to a fixed number of iterations per chat message. Tools available to the model:

| Tool | Effect |
|---|---|
| `calculate` | Evaluates a math expression. |
| `get_current_time` | Current time in Rome/Roma (demo tool). |
| `get_my_position` | Returns the agent's live x, y, and score. |
| `LLM_add_mission` | Queues a `go_to_mission` errand with a reward. |
| `avoid_tile` | Never navigate to or through a tile. |
| `no_pickup_at` | Never pick up a parcel at a tile (may still pass through or deliver there). |
| `no_deliver_at` | Never deliver at a tile (may still pass through or pick up there). |
| `deliver_at` | Prefer the leftmost/rightmost known delivery tile. |
| `set_max_carry` | Sets how many parcels the agent holds before it must deliver. |
| `answere_in_chat` | Sends a reply straight to the chat sender. |

Chat messages are processed one at a time via `eventQueue.js`, so tool calls always see consistent belief state, and `optionsGeneration` re-runs immediately after each message so a command (e.g. lowering the carry limit) takes effect without waiting for the next sensing tick.

## Known limitations

- The DeliverooJS SDK's socket calls (`emitMove`, `emitPickup`, `emitPutdown`) have a hardcoded ~1s ack timeout; transient timeouts are retried (`BDI_agent/utils/socketManager.js`) but can still occasionally cause an intention to give up and get dropped.
- The local LLM occasionally drifts from the required output format under load; the parser tolerates a missing `Action Input:` line, but a model that ignores the format entirely still falls back to a "could not complete" reply after exhausting its iteration budget.
- Constraint-based capacity/tile rules only affect what gets *queued* going forward (and prune what's already queued) — they don't retroactively rewind an action that's already mid-flight when the rule is set.

