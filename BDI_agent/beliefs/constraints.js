// Chat-driven constraints on the agent's own behavior — e.g. "don't go to
// (x,y)". Kept as a separate policy layer instead of mutating beliefs/map.js,
// since the map is ground truth from the server and constraints are our own
// choice on top of it.
//
// type is one of:
//   'avoid_tile'      - never navigate to or through this tile
// Future types (not implemented yet, kept in mind for the shape of this file):
//   'no_pickup_at'    - never pick up a parcel sitting on this tile
//   'no_deliver_at'   - never deliver at this tile
//   'prefer_deliver_at' - prefer delivering here over other delivery tiles
export const constraints = [];

let nextConstraintId = 1;

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