import { parcels } from "../beliefs/parcels.js";
import { me } from "../beliefs/me.js";
import { distance } from "../utils/distance.js";
import { deliveryTiles, spawnTiles } from "../beliefs/map.js";
import { missions } from "../beliefs/missions.js";

export function optionsGeneration(myAgent) {

    // Pusha deliver om du bär något
    const carrying = Array.from(parcels.values()).filter(p => p.carriedBy === me.id);
    if (carrying.length > 0)
        myAgent.push(['go_deliver']);

    // Pusha alla synliga paket
    for (const parcel of parcels.values())
        if (!parcel.carriedBy)
            myAgent.push(['go_pick_up', parcel.x, parcel.y, parcel.id]);

    // Pusha fallbacks
    if (spawnTiles.length > 0)
        myAgent.push(['go_spawn']);

    for (const m of missions) {
        switch (m.type) {
            case 'go_to_mission':
                myAgent.push(['go_to_mission', m.params.x, m.params.y, m.reward ]);
                break;
        }
    }
}