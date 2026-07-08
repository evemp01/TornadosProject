import { distance } from '../utils/distance.js';
import { me, config } from '../beliefs/me.js';
import { initialCratePositions } from '../beliefs/map.js';

// Translate the belifes to pddl, so that we can use them in the planner. We will have to make a new belief for each type of object, and then update them with the sensing data.
export const crates = new Map();

export function initCrates(socket) {

    // Seed a crate belief on every '5!' tile as soon as the map loads,
    // so the planner treats them as obstacles before we've ever seen them.
    socket.onMap(() => {
        for (const pos of initialCratePositions) {
            const id = `map_${pos.x}_${pos.y}`;
            if (!crates.has(id)) crates.set(id, { id, x: pos.x, y: pos.y });
        }
    });

    socket.onSensing((sensing) => {
        if (!sensing.crates) return; // ignore a malformed frame (no crate data at all)

        // 1. Real sightings win — add/update by real id. (Never deleted: memory.)
        for (const c of sensing.crates) {
            crates.set(c.id, c);
        }

        // 2. Once a seed's tile is close enough to observe, we now KNOW its real
        //    state (a real crate was added above, or the tile is genuinely empty),
        //    so the guess is obsolete. Only seeds ('map_*') are ever removed here.
        for (const c of crates.values()) {
            if (!String(c.id).startsWith('map_')) continue;
            if (distance({ x: c.x, y: c.y }, me) <= config.observationDistance) crates.delete(c.id);
        }
    });
}