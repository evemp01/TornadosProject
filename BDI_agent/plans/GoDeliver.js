import { PlanBase } from "./PlanBase.js";
import { me } from "../beliefs/me.js";
import { parcels } from "../beliefs/parcels.js";
import { deliveryTiles } from "../beliefs/map.js";
import { distance } from "../utils/distance.js";
import { socket } from "../../main_BDI.js";
import { isTileAvoided } from "../beliefs/constraints.js";
import { putdownWithRetry } from "../utils/socketManager.js";

export class GoDeliver extends PlanBase {

    static isApplicableTo(go_deliver) {
        return go_deliver === 'go_deliver';
    }

    async execute(go_deliver) {
        console.log('[GoDeliver] execute() started');

        if (!Array.from(parcels.values()).some(p => p.carriedBy === me.id)) {
            console.log('[GoDeliver] nothing to deliver, throwing early');
            throw ['nothing to deliver'];
        }

        let nearest = Number.MAX_VALUE;
        let target;
        for (const tile of deliveryTiles) {
            if (isTileAvoided(tile.x, tile.y)) continue;
            const d = distance(tile, me);
            if (d < nearest) {
                nearest = d;
                target = tile;
            }
        }
        if (!target) {
            console.log('[GoDeliver] no delivery tile found, throwing');
            throw ['no delivery tile found'];
        }

        console.log(`[GoDeliver] walking to delivery tile (${target.x},${target.y})`);
        await this.subIntention(['go_to', target.x, target.y]);
        console.log(`[GoDeliver] arrived at (${target.x},${target.y}), attempting putdown`);

        const delivered = Array.from(parcels.values()).filter(p => p.carriedBy === me.id);
        console.log(`[GoDeliver] about to put down ${delivered.length} parcel(s):`, delivered.map(p => p.id));

        await putdownWithRetry(socket);

        for (const p of delivered) parcels.delete(p.id);

        console.log(`Delivered ${delivered.length} parcel(s) at tile: (${target.x},${target.y})`);

        return true;
    }
}