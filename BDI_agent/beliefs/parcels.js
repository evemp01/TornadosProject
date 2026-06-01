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