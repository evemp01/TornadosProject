import { PlanBase } from "./PlanBase.js";
import { me } from "../beliefs/me.js";
import { deliveryTiles } from "../beliefs/map.js";
import { distance } from "../utils/distance.js";
import { socket } from "../../main_BDI.js";
import { isTileAvoided } from "../beliefs/constraints.js";

export class GoDeliver extends PlanBase {

    static isApplicableTo(go_deliver) {
        return go_deliver === 'go_deliver';
    }

    async execute(go_deliver) {
        // Find nearest delivery tile that isn't avoided
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

        if (!target) throw ['no delivery tile found'];

        await this.subIntention(['go_to', target.x, target.y]);
        await socket.emitPutdown();
        return true;
    }
}