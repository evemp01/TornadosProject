import { parcels } from "../beliefs/parcels.js";
import { me } from "../beliefs/me.js";
import { distance } from "../utils/distance.js";
import { deliveryTiles, spawnTiles } from "../beliefs/map.js";
import { missions } from "../beliefs/missions.js";
import { isTileAvoided, isPickupBanned, getMaxCarry } from "../beliefs/constraints.js";

const MAX_CARRY = 5;

export function optionsGeneration(myAgent) {

    // Pusha deliver if carrying parcels
    const carrying = Array.from(parcels.values()).filter(p => p.carriedBy === me.id);
    if (carrying.length > 0)
        myAgent.push(['go_deliver']);

    // If a lowered max-carry limit leaves the agent over capacity (e.g. it was
    // already holding 5 when the limit dropped to 3), stop chasing more
    // parcels: cancel every queued go_pick_up — including the one currently
    // running, if any — so the agent delivers what it's holding before
    // picking up anything else.
    const overCapacity = carrying.length > getMaxCarry();
    if (overCapacity) {
        for (const i of myAgent.intention_queue)
            if (i.predicate[0] === 'go_pick_up') i.stop();
        if (myAgent.running && myAgent.running.predicate[0] === 'go_pick_up')
            myAgent.running.stop();
    }

    // Push go_pick_up for visible parcels not sitting on an avoided (therefore
    // unreachable) or pickup-banned tile, capped so that carrying +
    // already-queued pickups never exceeds the max-carry limit — otherwise a
    // single pass could queue every visible parcel regardless of the cap.
    const queuedPickupIds = new Set(
        myAgent.intention_queue
            .filter(i => i.predicate[0] === 'go_pick_up')
            .map(i => i.predicate[3])
    );
    let freeSlots = getMaxCarry() - carrying.length - queuedPickupIds.size;

    if (!overCapacity && freeSlots > 0)
        for (const parcel of parcels.values()) {
            if (freeSlots <= 0) break;
            if (parcel.carriedBy || queuedPickupIds.has(parcel.id)) continue;
            if (isTileAvoided(parcel.x, parcel.y) || isPickupBanned(parcel.x, parcel.y)) continue;
            myAgent.push(['go_pick_up', parcel.x, parcel.y, parcel.id]);
            freeSlots--;
        }

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