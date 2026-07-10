import { PlanBase } from "./PlanBase.js";
import { me } from "../beliefs/me.js";
import { spawnTiles } from "../beliefs/map.js";
import { distance } from "../utils/distance.js";
import { isTileAvoided } from "../beliefs/constraints.js";

export class GoToSpawn extends PlanBase {

    static isApplicableTo(go_spawn) {
        return go_spawn === 'go_spawn';
    }

    async execute(go_spawn) {
        // Find nearest spawn tile that isn't avoided
        let nearest = Number.MAX_VALUE;
        let target;
        for (const tile of spawnTiles) {
            if (isTileAvoided(tile.x, tile.y)) continue;
            const d = distance(tile, me);
            if (d < nearest) {
                nearest = d;
                target = tile;
            }
        }

        if (!target) throw ['no spawn tile found'];

        await this.subIntention(['go_to', target.x, target.y]);
        return true;
    }
}