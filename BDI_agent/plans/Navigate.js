import { PlanBase } from "./PlanBase.js";
import { me } from "../beliefs/me.js";
import { agents } from "../beliefs/agents.js";
import { crates } from "../beliefs/crates.js";
import { parcels } from "../beliefs/parcels.js";
import { socket } from "../../main_BDI.js";
import { astar } from "../utils/astar.js";
import { planCrateMovement } from "../pddl/problemGenerator.js";

export class Navigate extends PlanBase {

    static isApplicableTo(go_to, x, y) {
        return go_to == 'go_to';
    }

    // Executes a PDDL plan step by step.
    // Returns { success: true } or { success: false, failedX, failedY } on failure.
    // sequence the plan is atomic and must run to completion, otherwise the agent
    // is stranded between tiles. Preemption is blocked upstream via the commit flag.
    async _executePddlPlan(pddlPlan) {
        for (const nextStep of pddlPlan) {

            const targetTileName = (nextStep.action === 'MOVE' || nextStep.action === 'PUSH_MOVE')
                ? nextStep.args[1]
                : null;

            if (!targetTileName) {
                console.error('Unexpected PDDL step without target tile:', nextStep);
                continue;
            }

            // For PUSH_MOVE, verify the push destination is actually empty right now.
            // PDDL may have been planned when an out-of-range crate wasn't visible.
            if (nextStep.action === 'PUSH_MOVE') {
                const pushDestName = nextStep.args[2]; // tile the crate lands on
                if (pushDestName) {
                    const [_pd, pdx, pdy] = pushDestName.split('_').map(Number);
                    const destBlocked = Array.from(crates.values()).find(c =>
                        Math.round(c.x) === pdx && Math.round(c.y) === pdy
                    );
                    if (destBlocked) {
                        this.log(`Push destination (${pdx},${pdy}) is occupied by crate ${destBlocked.id} — aborting plan to avoid deadlock.`);
                        return { success: false, failedX: pdx, failedY: pdy };
                    }
                }
            }

            const [_, tx, ty] = targetTileName.split('_').map(Number);

            // Round the live position — mid-move me.x/me.y can be fractional,
            // which would flip a `tx > me.x` comparison and pick a wrong direction.
            const mx = Math.round(me.x);
            const my = Math.round(me.y);

            let direction;
            if (tx > mx)      direction = 'right';
            else if (tx < mx) direction = 'left';
            else if (ty > my) direction = 'up';
            else if (ty < my) direction = 'down';
            else {
                this.log('PDDL step already at target tile, skipping', targetTileName);
                continue;
            }

            this.log(`Executing PDDL step (${nextStep.action}): ${direction} towards ${targetTileName}`);

            let moved = await socket.emitMove(direction);

            // One transient retry: a momentary agent collision shouldn't blacklist
            // a walkable tile and trigger the whole replan cascade.
            if (!moved) {
                await new Promise(res => setTimeout(res, 60));
                moved = await socket.emitMove(direction);
            }

            if (!moved) {
                this.log('PDDL step failed, aborting plan.');
                return { success: false, failedX: tx, failedY: ty };
            }

            me.x = moved.x;
            me.y = moved.y;
        }
        return { success: true };
    }

    // blockedTiles: Set of "x,y" strings for tiles we know are blocked this session
    // even if they've since left our observation range.
    // Does NOT check this.stopped — the full PDDL sequence (including retries) is atomic.
    async _runPddl(x, y, retriesLeft = 2, blockedTiles = new Set()) {
        // Commit as soon as we enter the crate solver. A half-finished crate push
        // can't be safely abandoned, so from here on push() must not preempt us.
        this.commit();

        this.log('No path found to', x, y, '- Activating PDDL multi-crate solver');
        const pddlPlan = await planCrateMovement({ x, y }, blockedTiles);

        if (pddlPlan && pddlPlan.length > 0) {
            this.log(`PDDL generated a plan of ${pddlPlan.length} steps. Executing entire puzzle sequence.`);
            const result = await this._executePddlPlan(pddlPlan);
            if (result.success) return true;

            // Only add to blockedTiles if NO visible crate is already there.
            // If a crate IS visible, PDDL already knows about it via crate-at facts
            // and can plan to push it. Excluding the tile would remove it from the
            // PDDL objects entirely, making the crate invisible to the planner.
            const visibleCrateAtFail = Array.from(crates.values()).find(c =>
                Math.round(c.x) === result.failedX && Math.round(c.y) === result.failedY
            );
            if (!visibleCrateAtFail) {
                blockedTiles.add(`${result.failedX},${result.failedY}`);
                this.log(`Tile (${result.failedX},${result.failedY}) added to blocked set (invisible crate).`);
            } else {
                this.log(`Tile (${result.failedX},${result.failedY}) blocked by visible crate ${visibleCrateAtFail.id} — PDDL will handle it.`);
            }

            // Try A* first — maybe the crate has moved and there's now a clear path.
            // Does NOT check this.stopped — must complete to avoid stranding the agent.
            const retryPath = astar(
                { x: Math.round(me.x), y: Math.round(me.y) },
                { x: Math.round(x), y: Math.round(y) }
            );
            if (retryPath) {
                this.log('World changed during PDDL — A* can now find a path, switching back.');
                for (const step of retryPath.slice(1)) {
                    const mx = Math.round(me.x);
                    const my = Math.round(me.y);
                    let direction;
                    if (step.x > mx)      direction = 'right';
                    else if (step.x < mx) direction = 'left';
                    else if (step.y > my) direction = 'up';
                    else if (step.y < my) direction = 'down';
                    const moved = await socket.emitMove(direction);
                    if (!moved) break;
                    me.x = moved.x;
                    me.y = moved.y;
                }
                if (Math.round(me.x) === Math.round(x) && Math.round(me.y) === Math.round(y))
                    return true;
            }

            // A* didn't finish — replan PDDL with the updated blocked set.
            if (retriesLeft > 0) {
                this.log(`Replanning PDDL from current position (${retriesLeft} retries left)...`);
                return await this._runPddl(x, y, retriesLeft - 1, blockedTiles);
            }
        }

        this.log('PDDL could not find a way through the crates. Giving up.');
        throw 'no_path';
    }

    async execute(go_to, x, y) {

        const path = astar(
            { x: Math.round(me.x), y: Math.round(me.y) },
            { x: Math.round(x), y: Math.round(y) }
        );
        // console.log("PATH:", path);

        if (!path) {
            // Check stopped before committing to the expensive PDDL sequence.
            // After this point we don't check again — PDDL execution is atomic.
            if (this.stopped) throw ['stopped'];
            return await this._runPddl(x, y);
        }

        // Walk each step in the A* path (skip step 0, that's current position)
        for (const step of path.slice(1)) {

            if (this.stopped) throw ['stopped'];

            const mx = Math.round(me.x);
            const my = Math.round(me.y);

            let direction;
            if (step.x > mx)      direction = 'right';
            else if (step.x < mx) direction = 'left';
            else if (step.y > my) direction = 'up';
            else if (step.y < my) direction = 'down';

            const moved = await socket.emitMove(direction);

            if (!moved) {
                // Check if a crate appeared and is blocking this step
                const crateBlocking = Array.from(crates.values()).find(c =>
                    Math.round(c.x) === step.x && Math.round(c.y) === step.y
                );

                if (crateBlocking) {
                    this.log('Crate blocking path at', step, '- switching to PDDL');
                    if (this.stopped) throw ['stopped'];
                    return await this._runPddl(x, y);
                }

                // Check if an agent is blocking
                const blocker = Array.from(agents.values()).find(a =>
                    Math.round(a.x) === step.x && Math.round(a.y) === step.y
                );

                if (blocker) {
                    await new Promise(res => setTimeout(res, 50));
                    const retry = await socket.emitMove(direction);
                    if (retry) {
                        me.x = retry.x;
                        me.y = retry.y;
                        continue;
                    }
                    // Still blocked: treat the agent as an obstacle and re-route with A*.
                    // A* now excludes agent tiles, so this finds a detour if one exists.
                    if (this.stopped) throw ['stopped'];
                    this.log('Agent blocking at', step, '- replanning A* around it');
                    return await this.subIntention(['go_to', x, y]);
                }

                this.log('Move failed at', step);
                throw 'stuck';
            }

            me.x = moved.x;
            me.y = moved.y;

            // Opportunistic pickup: collect any parcel on the current tile for free.
            const onTile = Array.from(parcels.values()).find(p =>
                !p.carriedBy &&
                Math.round(p.x) === Math.round(me.x) &&
                Math.round(p.y) === Math.round(me.y)
            );
            if (onTile) {
                await socket.emitPickup();
            }
        }

        return true;
    }
}