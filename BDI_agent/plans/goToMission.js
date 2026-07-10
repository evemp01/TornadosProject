import { PlanBase } from "./PlanBase.js";
import { completeMission } from "../beliefs/missions.js";

export class GoToMission extends PlanBase {

    static isApplicableTo(action, x, y, reward, missionId) {
        return action === 'go_to_mission';
    }

    async execute(action, x, y, reward, missionId) {

        this.log(
            `Starting mission: go to (${x}, ${y}) for reward ${reward}`
        );

        try {
            // Delegate the actual walk to Navigate, same as GoPickUp/GoDeliver/
            // GoToSpawn — it already knows how to retry a blocked-by-agent step,
            // reroute around crates via PDDL, and retry a timed-out move.
            await this.subIntention(['go_to', x, y]);
        } catch (error) {
            // Preempted by a higher-priority intention: leave it un-done so it
            // can resume later, instead of giving up on the mission entirely.
            const wasStopped = this.stopped || (Array.isArray(error) && error[0] === 'stopped');
            if (!wasStopped) completeMission(missionId);
            throw error;
        }

        this.log(
            `Mission completed: reached (${x}, ${y})`
        );

        completeMission(missionId);

        return {
            success: true,
            reward
        };
    }
}