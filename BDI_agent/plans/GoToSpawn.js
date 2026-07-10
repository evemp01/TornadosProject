import { PlanBase } from "./PlanBase.js";
import { me, config } from "../beliefs/me.js";
import { spawnTiles } from "../beliefs/map.js";
import { parcels } from "../beliefs/parcels.js";
import { distance } from "../utils/distance.js";
import { isTileAvoided } from "../beliefs/constraints.js";

const SPAWN_WAIT_MS = 3000;
const POLL_MS = 200;

let relocateFar = false;

function pickSpawn(preferFar) {
    // console.log('config keys:', Object.keys(config), 'obsDist:', config.observationDistance);
    let pool = spawnTiles;

    if (preferFar) {
        const far = spawnTiles.filter(t => distance(t, me) > config.observationDistance);
        if (far.length > 0) pool = far;
    }

    let nearest = Number.MAX_VALUE;
    let target;
    for (const tile of pool) {
        const d = distance(tile, me);
        if (d < nearest) {
            nearest = d;
            target = tile;
        }
    }
    return target;
}

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
        const target = pickSpawn(relocateFar);
        relocateFar = false;

        if (!target) throw ['no spawn tile found'];

        await this.subIntention(['go_to', target.x, target.y]);

        // Wait for parcel
        const startedWaiting = Date.now();
        while (Date.now() - startedWaiting < SPAWN_WAIT_MS) {
            if (this.stopped) throw ['stopped']; // go_pick_up har preemptat oss

            const freeParcel = Array.from(parcels.values()).some(p => !p.carriedBy);
            if (freeParcel) return true; // låt optionsGeneration ta över

            await new Promise(res => setTimeout(res, POLL_MS));
        }

        // Torrt: nästa go_spawn ska leta utanför synfältet.
        relocateFar = true;
        console.log(`Spawn (${target.x},${target.y}) delivers no packages for me, trying new spawn`);
        return true;
    }
}