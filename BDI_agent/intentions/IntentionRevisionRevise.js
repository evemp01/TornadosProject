import { IntentionRevision } from "./IntentionRevision.js";
import { IntentionDeliberation } from "./IntentionDeliberation.js";
import { parcels } from "../beliefs/parcels.js";
import { me } from "../beliefs/me.js";
import { distance } from "../utils/distance.js";
import { deliveryTiles } from "../beliefs/map.js";
import { agents } from "../beliefs/agents.js";
import { isTileAvoided, isPickupBanned } from "../beliefs/constraints.js";

export class IntentionRevisionRevise extends IntentionRevision {

    constructor(planLibrary) {
        super();
        this.planLibrary = planLibrary;
    }

    utility(predicate) {
        const [action, x, y, payload] = predicate;
        const carrying = Array.from(parcels.values()).filter(p => p.carriedBy === me.id);
        const totalReward = carrying.reduce((sum, p) => sum + p.reward, 0);
        const nearestDeliveryFrom = (pos) =>
            deliveryTiles.length ? Math.min(...deliveryTiles.map(t => distance(t, pos))) : Infinity;
        const STEP_COST = 0.05;

        if (action === 'go_deliver') {
            if (carrying.length === 0) return -1; // nothing to deliver

            const steps = nearestDeliveryFrom(me);
            return totalReward - steps * STEP_COST * carrying.length;
        }

        if (action === 'go_pick_up') {
            const parcel = parcels.get(payload);
            if (!parcel || parcel.carriedBy) return -1;

            // Route: me -> parcel -> nearest delivery. One extra parcel decays too.
            const steps = distance({ x, y }, me) + nearestDeliveryFrom({ x, y });
            return totalReward + parcel.reward - steps * STEP_COST * (carrying.length + 1);
        }


        // If no parcels are spawning at the spawn tile, then the agent should try a new one after a while
        if (action === 'go_spawn') return 1;

        if (action === 'go_to_mission') {
            const reward = payload;
            return Math.max(0, reward); //direct LLM rewart or 0 if negative
        }

        return -1;
    }

    async push(predicate) {
        // Remove invalid intentions: parcel already delivered/removed, already
        // carried (by anyone, including a duplicate queued entry for the same
        // parcel that already succeeded), or its tile since avoided/banned.
        for (const i of this.intention_queue) {
            if (i.predicate[0] === 'go_pick_up') {
                const parcel = parcels.get(i.predicate[3]);
                if (!parcel || parcel.carriedBy) {
                    i.stop();
                    continue;
                }
                const [, x, y] = i.predicate;
                if (isTileAvoided(x, y) || isPickupBanned(x, y)) {
                    i.stop();
                }
            }
        }

        // Check if already queued
        if (this.intention_queue.find(i => i.predicate.join(' ') === predicate.join(' ')))
            return;

        // Add new intention
        const intention = new IntentionDeliberation(this, predicate, this.planLibrary);
        this.intention_queue.push(intention);
        // Sort by utility
        this.intention_queue.sort((a, b) => this.utility(b.predicate) - this.utility(a.predicate));

        const running = this.running;
        if (!running) return;
        if (running.committed) return;
        // If the new intention is now the best, stop the currently running one (index 1 after sort)
        const best = this.intention_queue[0];
        if (best.predicate.join(' ') !== predicate.join(' ')) return;

        const PREEMPT_THRESHOLD = 5; // utility difference threshold for preemption
        if (this.utility(best.predicate) - this.utility(running.predicate) >= PREEMPT_THRESHOLD) {
            running.stop();
        }
    }
}