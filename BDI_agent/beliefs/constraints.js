// Chat-driven constraints on the agent's own behavior — e.g. "don't go to
// (x,y)". Kept as a separate policy layer instead of mutating beliefs/map.js,
// since the map is ground truth from the server and constraints are our own
// choice on top of it.
//
// type is one of:
//   'avoid_tile'        - never navigate to or through this tile
//   'no_pickup_at'      - never pick up a parcel sitting on this tile
//   'no_deliver_at'     - never deliver at this tile
//   'prefer_deliver_at' - prefer delivering here over other delivery tiles
export const constraints = [];

let nextConstraintId = 1;

// Chat-tunable cap on how many parcels the agent picks up before it must
// deliver. Separate from `constraints` since it's a single setting, not an
// accumulating list of tile-specific rules.
let maxCarry = 5;

export function setMaxCarry(n) {
    maxCarry = n;
}

export function getMaxCarry() {
    return maxCarry;
}

export function addConstraint(type, params = {}) {
    const constraint = {
        id: nextConstraintId++,
        type,
        x: params.x ?? null,
        y: params.y ?? null,
    };
    constraints.push(constraint);

    console.log(constraints);
    return constraint;
}

export function isTileAvoided(x, y) {
    return constraints.some(c =>
        c.type === 'avoid_tile' &&
        Math.round(c.x) === Math.round(x) &&
        Math.round(c.y) === Math.round(y)
    );
}

export function isPickupBanned(x, y) {
    return constraints.some(c =>
        c.type === 'no_pickup_at' &&
        Math.round(c.x) === Math.round(x) &&
        Math.round(c.y) === Math.round(y)
    );
}

export function isDeliveryBanned(x, y) {
    return constraints.some(c =>
        c.type === 'no_deliver_at' &&
        Math.round(c.x) === Math.round(x) &&
        Math.round(c.y) === Math.round(y)
    );
}

// Only the most recently set preference is honored — setting a new one
// supersedes the last, rather than accumulating a list of preferences.
export function getPreferredDeliveryTile() {
    for (let i = constraints.length - 1; i >= 0; i--) {
        if (constraints[i].type === 'prefer_deliver_at') return constraints[i];
    }
    return null;
}