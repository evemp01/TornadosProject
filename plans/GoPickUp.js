import { PlanBase } from "./PlanBase.js";
import { me } from "../beliefs/me.js";
import { socket } from "../main.js";
import { IntentionDeliberation } from "../intentions/IntentionDeliberation.js";

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
        return true;
    }
}