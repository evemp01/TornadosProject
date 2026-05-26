/**
# APIs for Planning

`npm install @unitn-asa/pddl-client`@0.0.37

Based on https://solver.planning.domains:5001.

Checkout https://github.com/AI-Planning/planning-as-a-service to install a local instance of the planning service. */

// We have to use pddl for something
// Use the pddl to for example move objects around, use to organize the intetions when you have multiple options, to plan the order of parcels to pick up
// Probably is needed for the maps with crates, if you se a crate you activate the pddl
// To do this we have to translate the belifes to pddl, so that we can use them in the planner

export const me = { id: '', name: '', x: -1, y: -1, score: 0 };

export function initMe(socket) {
    socket.onYou(({ id, name, x, y, score }) => {
        me.id = id;
        me.name = name;
        me.x = (x !== undefined) ? x : me.x;
        me.y = (y !== undefined) ? y : me.y;
        me.score = score;
    });
}