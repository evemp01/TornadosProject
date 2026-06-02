// Translate the belifes to pddl, so that we can use them in the planner. We will have to make a new belief for each type of object, and then update them with the sensing data.
export const crates = new Map();

export function initCrates(socket) {
    socket.onSensing((sensing) => {

        if (!sensing.crates || sensing.crates.length === 0) {
            return; // ignore bad frame
        }
        // update / add crates
        for (const c of sensing.crates) {
            crates.set(c.id, c);
        }

        // remove disappeared crates
        for (const c of crates.values()) {
            if (!sensing.crates.find(sc => sc.id === c.id)) {
                crates.delete(c.id);
            }
        }
        console.log('Crates updated:', Array.from(crates.values()));
    });
}