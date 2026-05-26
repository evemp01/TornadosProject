// Translate the belifes to pddl, so that we can use them in the planner. We will have to make a new belief for each type of object, and then update them with the sensing data.

export const parcels = new Map();

export function initParcels(socket) {
    socket.onSensing((sensing) => {

        // update / add parcels
        for (const p of sensing.parcels) {
            parcels.set(p.id, p);
        }

        // remove disappeared parcels
        for (const p of parcels.values()) {
            if (!sensing.parcels.find(sp => sp.id === p.id)) {
                parcels.delete(p.id);
            }
        }

    });
}