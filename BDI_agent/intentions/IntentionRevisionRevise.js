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

        if (action === 'go_pick_up') {
            const id = payload; 
            const parcel = parcels.get(id);
            if (!parcel || parcel.carriedBy) return -1;
            const d = distance({ x, y }, me);
            return parcel.reward - d; // use actual reward, not flat 100
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
        console.log('Revising intention queue. Received', ...predicate);

        // Remove invalid intentions (parcels already taken)
        for (const i of this.intention_queue) {
            if (i.predicate[0] === 'go_pick_up') {
                const parcel = parcels.get(i.predicate[3]);
                if (!parcel || parcel.carriedBy) {
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

        // If the new intention is now the best, stop current one
        const best = this.intention_queue[0];
        if (best.predicate.join(' ') === predicate.join(' ')) {
            if (this.intention_queue[1])
                this.intention_queue[1].stop();
        }
    }
}