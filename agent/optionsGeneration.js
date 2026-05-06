import { parcels } from "../beliefs/parcels.js";
import { me } from "../beliefs/me.js";
import { distance } from "../utils/distance.js";
import { deliveryTiles } from "../beliefs/deliveryTiles.js";
import { spawnTiles } from "../beliefs/spawnTiles.js";

export function optionsGeneration(myAgent) {

    /**
     * If carrying, only deliver - don't pick up more
     */
    const carrying = Array.from(parcels.values()).filter(p => p.carriedBy === me.id);
    if (carrying.length > 0) {
        const deliveryVisible = deliveryTiles.length > 0;
        if (deliveryVisible)
            myAgent.push(['go_deliver']);
        else
            myAgent.push(['go_random']); // can't see delivery tile, walk around
        return;
}

    /**
     * Options generation
     */
    const options = [];
    for (const parcel of parcels.values())
        if (!parcel.carriedBy)
            options.push(['go_pick_up', parcel.x, parcel.y, parcel.id]);

    /**
     * Options filtering - find nearest parcel
     */
    let best_option;
    let nearest = Number.MAX_VALUE;
    for (const option of options) {
        if (option[0] == 'go_pick_up') {
            let [go_pick_up, x, y, id] = option;
            let current_d = distance({ x, y }, me);
            if (current_d < nearest) {
                best_option = option;
                nearest = current_d;
            }
        }
    }

    /**
     * Best option is selected
     */
    if (best_option)
        myAgent.push(best_option);
    else if (spawnTiles.length > 0)
        myAgent.push(['go_spawn']);
    else
        myAgent.push(['go_random']);
}