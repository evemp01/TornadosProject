import { parcels } from "../beliefs/parcels.js";
import { me } from "../beliefs/me.js";
import { distance } from "../utils/distance.js";

 /**
 * Options generation and filtering function
 */
export function optionsGeneration (myAgent) {

    // TODO revisit beliefset revision so to trigger option generation only in the case a new parcel is observed

    /**
     * Options generation
     * @type { Array< [string, ...any] > }
     */
    const options = []
    for (const parcel of parcels.values())
        if ( ! parcel.carriedBy )
            options.push( [ 'go_pick_up', parcel.x, parcel.y, parcel.id ] );
            // myAgent.push( [ 'go_pick_up', parcel.x, parcel.y, parcel.id ] )

    /**
     * Options filtering
     */
    let best_option;
    let nearest = Number.MAX_VALUE;
    for (const option of options) {
        if ( option[0] == 'go_pick_up' ) {
            let [go_pick_up,x,y,id] = option;
            let current_d = distance( {x, y}, me )
            if ( current_d < nearest ) {
                best_option = option
                nearest = current_d
            }
        }
    }

    /**
     * Best option is selected
     */
    if ( best_option )
        myAgent.push( best_option )

    /**
     * Delivery option
     * If agent is carrying any parcel, push go_deliver
     */
    const carrying = Array.from(parcels.values()).filter(p => p.carriedBy === me.id);
    if (carrying.length > 0)
        myAgent.push(['go_deliver']);

}
