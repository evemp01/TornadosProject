export const missions = [];

export function addMission(type, params = null, reward = 0) {
    missions.push({
        type,
        params,
        reward  
    });

    console.log(missions);
}

//possible missions:
//go_to
//go_deliver
//go_pick_up
//go_spawn
