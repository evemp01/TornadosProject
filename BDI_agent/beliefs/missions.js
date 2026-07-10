export const missions = [];

let nextMissionId = 1;

export function addMission(type, params = null, reward = 0) {
    const mission = {
        id: nextMissionId++,
        type,
        x: params?.x || null,
        y: params?.y || null,
        reward,
        done: false,
    };
    missions.push(mission);

    console.log(missions);
    return mission;
}

export function completeMission(id) {
    const mission = missions.find(m => m.id === id);
    if (mission) mission.done = true;
}

//possible missions:
//go_to
//go_deliver
//go_pick_up
//go_spawn
