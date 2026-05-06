import { PlanBase } from "./PlanBase.js";
import { me } from "../beliefs/me.js";
import { deliveryTiles } from "../beliefs/deliveryTiles.js";
import { distance } from "../utils/distance.js";
import { socket } from "../main.js";

export class GoDeliver extends PlanBase {

    static isApplicableTo(go_deliver) {
        return go_deliver === 'go_deliver';
    }

    async execute(go_deliver) {
        // Find nearest delivery tile
        let nearest = Number.MAX_VALUE;
        let target;
        for (const tile of deliveryTiles) {
            const d = distance(tile, me);
            if (d < nearest) {
                nearest = d;
                target = tile;
            }
        }

        if (!target) throw ['no delivery tile found'];

        await this.subIntention(['go_to', target.x, target.y]);
        await socket.emitPutdown();
        return true;
    }
}