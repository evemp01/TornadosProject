import { parcels } from "../beliefs/parcels.js";
import { me } from "../beliefs/me.js";
import { distance } from "../utils/distance.js";
import { deliveryTiles, spawnTiles } from "../beliefs/map.js";
import { missions } from "../beliefs/missions.js";

export function optionsGeneration(myAgent) {

    // Pusha deliver if carrying parcels
    const carrying = Array.from(parcels.values()).filter(p => p.carriedBy === me.id);
    if (carrying.length > 0)
        myAgent.push(['go_deliver']);

    // Push go_pick_up for all visible parcels
    for (const parcel of parcels.values())
        if (!parcel.carriedBy)
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