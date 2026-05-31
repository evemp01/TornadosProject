export const missions = [];

export function addMission(type, reward = 0, params = null) {
    missions.push({
        type,
        reward,
        params
    });
}

//possible missions:
//go_to
//go_deliver
//go_pick_up
//go_spawn
