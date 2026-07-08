import { IntentionRevision } from "./IntentionRevision.js";
import { IntentionDeliberation } from "./IntentionDeliberation.js";
import { parcels } from "../beliefs/parcels.js";
import { me } from "../beliefs/me.js";
import { distance } from "../utils/distance.js";
import { deliveryTiles } from "../beliefs/map.js";
import { agents } from "../beliefs/agents.js";

export class IntentionRevisionRevise extends IntentionRevision {

    constructor(planLibrary) {
        super();
        this.planLibrary = planLibrary;
    }

    utility(predicate) {
        const [action, x, y, payload] = predicate;

        // If she is carrying parcels worth 45 points and the nearest delivery is 5 steps away, deliver utility = 40. 
        // If a nearby parcel has reward - distance = 8 - 2 = 6, delivering wins. 
        // But if there's a parcel with reward - distance = 30 - 3 = 27, picking it up first wins instead.
        if (action === 'go_deliver') {
            const carrying = Array.from(parcels.values()).filter(p => p.carriedBy === me.id);
            if (carrying.length === 0) return -1; // nothing to deliver

            const totalReward = carrying.reduce((sum, p) => sum + p.reward, 0);
            const nearestDelivery = Math.min(...deliveryTiles.map(t => distance(t, me)));

            // Deliver score grows with reward and shrinks with distance
            return totalReward - nearestDelivery;
        }
        // Before we compared distance to parcel worth, but it doesnt correspond because then go pick up wins a lot of cases
        if (action === 'go_pick_up') {
            const parcel = parcels.get(payload);
            if (!parcel || parcel.carriedBy) return -1;

            const STEP_COST = 0.05; // 1 pt/s decay × 0.05 s/tile = 0.05 pts per tile
            return parcel.reward - distance({ x, y }, me) * STEP_COST;
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
        // console.log('Revising intention queue. Received', ...predicate);

        // Remove invalid intentions (parcels already taken)
        for (const i of this.intention_queue) {
            if (i.predicate[0] === 'go_pick_up') {
                const parcel = parcels.get(i.predicate[3]);
                if (parcel && parcel.carriedBy && parcel.carriedBy !== me.id) {
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