export const agents = new Map();

export function initAgents(socket) {
    socket.onSensing((sensing) => {

        // update / add agents
        for (const a of sensing.agents) {
            agents.set(a.id, a);
        }

        // remove disappeared agents
        for (const a of agents.values()) {
            if (!sensing.agents.find(sa => sa.id === a.id)) {
                agents.delete(a.id);
            }
        }

    });
}