import { IntentionRevision } from "./IntentionRevision.js";
import { IntentionDeliberation } from "./IntentionDeliberation.js";
import { parcels } from "../beliefs/parcels.js";
import { me } from "../beliefs/me.js";
import { distance } from "../utils/distance.js";
import { deliveryTiles } from "../beliefs/map.js";

export class IntentionRevisionRevise extends IntentionRevision {

    constructor(planLibrary) {
        super();
        this.planLibrary = planLibrary;
    }

    utility(predicate) {
        const [action, x, y, id] = predicate;

        if (action === 'go_deliver') {
            const carrying = Array.from(parcels.values()).filter(p => p.carriedBy === me.id);
            if (carrying.length === 0) return -1; // nothing to deliver

            const totalReward = carrying.reduce((sum, p) => sum + p.reward, 0);
            const nearestDelivery = Math.min(...deliveryTiles.map(t => distance(t, me)));

            // Deliver score grows with reward and shrinks with distance
            return totalReward - nearestDelivery;
        }

        if (action === 'go_pick_up') {
            const parcel = parcels.get(id);
            if (!parcel || parcel.carriedBy) return -1;
            const d = distance({ x, y }, me);
            return parcel.reward - d; // use actual reward, not flat 100
        }

        if (action === 'go_spawn') return 1;
        if (action === 'go_random') return 0;

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