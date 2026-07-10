import { PlanBase } from "./PlanBase.js";
import { me } from "../beliefs/me.js";
import { socket } from "../../main_BDI.js";
import { IntentionDeliberation } from "../intentions/IntentionDeliberation.js";
import { parcels } from "../beliefs/parcels.js";

/**
 * @implements { Plan }
 * @extends { PlanBase }
 */
export class GoPickUp extends PlanBase {

    /**
     * @type { function( string, ...any ) : boolean } 
     */
    static isApplicableTo(go_pick_up, x, y, id) {
        return go_pick_up === 'go_pick_up';
    }

    /**
     * @type { function( string, ...any ) : Promise<boolean> } 
     */
    async execute(go_pick_up, x, y) {
        await this.subIntention(['go_to', x, y]);
        await socket.emitPickup();

        const pickedUp = await socket.emitPickup();
        for (const p of pickedUp ?? []) {
            const belief = parcels.get(p.id);
            if (belief) belief.carriedBy = me.id;
        }
        console.log(`Picked up parcel ${go_pick_up} at (${x},${y})`);
        return true;
    }
}