import { PlanBase } from "./PlanBase.js";
import { me } from "../beliefs/me.js";
import { parcels } from "../beliefs/parcels.js";
import { deliveryTiles } from "../beliefs/map.js";
import { distance } from "../utils/distance.js";
import { socket } from "../../main_BDI.js";
import { isTileAvoided } from "../beliefs/constraints.js";

export class GoDeliver extends PlanBase {

    static isApplicableTo(go_deliver) {
        return go_deliver === 'go_deliver';
    }

    async execute(go_deliver) {
        // Stop stale deliveries early so we dont walk across the map for nothing
        if (!Array.from(parcels.values()).some(p => p.carriedBy === me.id))
            throw ['nothing to deliver'];

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

        // Remove the parcels that are now delivered so there is now ghost deliveries
        // Done before the await so no sensing tick can push a new go_deliver on stale beliefs
        const delivered = Array.from(parcels.values()).filter(p => p.carriedBy === me.id);
        for (const p of delivered) parcels.delete(p.id);

        await socket.emitPutdown();
        console.log(`Delivered ${delivered.length} parcel(s) at tile: (${target.x},${target.y})`);

        return true;
    }
}