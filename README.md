# TornadosProject — DeliverooJS BDI Agent

A BDI (Belief-Desire-Intention) agent for the [DeliverooJS](https://github.com/unitn-ASA/DeliverooJS) environment, with a second, independent LLM-driven agent that listens to the in-game chat and translates natural-language requests ("go to 5,5", "do not pick up at 9,9", "deliver exactly 3 parcels at a time"...) into live changes to the BDI agent's behavior.

## Setup

```bash
npm install
```

Create a `.env` file (never commit this — it's gitignored) with:

```
DELIVEROOJS_URL=<server url>
DELIVEROOJS_TOKEN=<master agent token>                # tornado10
DELIVEROOJS_TOKEN2=<slave agent token>                # tornado11, only needed to run a slave
LITELLM_BASE_URL=<LiteLLM-compatible endpoint>       # optional, has a default
LITELLM_API_KEY=<api key for the LLM endpoint>        # required
LOCAL_MODEL=<model name>                              # optional, has a default
```

Run as a single agent, or as a coordinating master/slave pair (see [Multi-agent coordination](#multi-agent-coordination)) from two terminals:

```bash
node main.js M   # master (tornado10) — takes commands from the admin
node main.js S   # slave (tornado11) — takes commands only from the master
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

## Multi-agent coordination

Two independent copies of this process can run side by side and coordinate purely through the game chat — there's no direct connection between them. The role is chosen at startup:

```bash
node main.js M   # master: connects with DELIVEROOJS_TOKEN (tornado10)
node main.js S   # slave:  connects with DELIVEROOJS_TOKEN2 (tornado11)
```

This selects which token to connect with and filters which chat sender each process listens to (`main.js`): the master only reacts to messages from the `admin` account, and the slave only reacts to messages from the master (`tornado10`, id `894484`).

The master's LLM tools (`main_LLM.js`) handle two kinds of chat commands differently:

- **Universal restrictions** (`avoid_tile`, `no_pickup_at`, `no_deliver_at`) apply to the master's own belief as usual, and are also relayed verbatim to the slave, whose own LLM independently interprets and applies the same message.
- **Exclusive one-off tasks** (`LLM_add_mission`, `deliver_at`) are only meant for one agent to do. Before executing, the master checks its own distance to the target: if it's farther away than a fixed threshold (`DELEGATION_DISTANCE_THRESHOLD`), it delegates the whole task by relaying the message to the slave instead of doing it itself; otherwise it just does the task as normal.

This relay/delegate logic is built directly into the existing tool functions rather than exposed as a separate tool the LLM has to remember to call, so it adds no extra reasoning step to the master's loop. The slave never relays further, which avoids a ping-pong loop between the two agents.

## Known limitations

- The DeliverooJS SDK's socket calls (`emitMove`, `emitPickup`, `emitPutdown`) have a hardcoded ~1s ack timeout; transient timeouts are retried (`BDI_agent/utils/socketManager.js`) but can still occasionally cause an intention to give up and get dropped.
- The local LLM occasionally drifts from the required output format under load; the parser tolerates a missing `Action Input:` line, but a model that ignores the format entirely still falls back to a "could not complete" reply after exhausting its iteration budget.
- Constraint-based capacity/tile rules only affect what gets *queued* going forward (and prune what's already queued) — they don't retroactively rewind an action that's already mid-flight when the rule is set.
- Task delegation is one-sided: the master only checks its own distance to a task, without knowing where the slave actually is, so it can delegate to a slave that's even farther away. A mutual check (master asks the slave for its position first) would be more accurate, but adds an extra LLM round trip before a task can start — since the local model is already not always fast enough to register a restriction before the BDI loop acts on the old behavior, this was left as future work rather than implemented now.
- There's no dedicated "stop" tool to halt an agent's current action outright; a running intention can only be superseded by a higher-utility one or a matching restriction, not paused directly.
