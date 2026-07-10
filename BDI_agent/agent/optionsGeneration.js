import { parcels } from "../beliefs/parcels.js";
import { me } from "../beliefs/me.js";
import { distance } from "../utils/distance.js";
import { deliveryTiles, spawnTiles } from "../beliefs/map.js";
import { missions } from "../beliefs/missions.js";
import { isTileAvoided, isPickupBanned } from "../beliefs/constraints.js";

const MAX_CARRY = 5;

export function optionsGeneration(myAgent) {

    // Pusha deliver if carrying parcels
    const carrying = Array.from(parcels.values()).filter(p => p.carriedBy === me.id);
    if (carrying.length > 0)
        myAgent.push(['go_deliver']);

    // Push go_pick_up for all visible parcels not sitting on an avoided
    // (therefore unreachable) or pickup-banned tile, unless already at max
    if (carrying.length < MAX_CARRY)
        for (const parcel of parcels.values())
            if (!parcel.carriedBy && !isTileAvoided(parcel.x, parcel.y) && !isPickupBanned(parcel.x, parcel.y))
                myAgent.push(['go_pick_up', parcel.x, parcel.y, parcel.id]);

    // Push fallbacks
    if (spawnTiles.length > 0)
        myAgent.push(['go_spawn']);

    for (const m of missions) {
        if (m.done) continue;

        switch (m.type) {
            case 'go_to_mission':
                myAgent.push(['go_to_mission', m.x, m.y, m.reward, m.id]);
                break;
        }
    }
}