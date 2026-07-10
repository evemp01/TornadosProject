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

        // Missions are prioritized over pickups/deliveries, so keep retrying the
        // whole walk on any transient failure (a stubborn block, a move timeout)
        // instead of giving up after one attempt. Only a genuine 'no_path' (the
        // destination is provably unreachable) or being preempted ends the loop.
        while (true) {
            try {
                await this.subIntention(['go_to', x, y]);
                break;
            } catch (error) {
                const wasStopped = this.stopped || (Array.isArray(error) && error[0] === 'stopped');

                if (wasStopped) {
                    // Preempted by a higher-priority intention: leave it un-done so
                    // it resumes (and keeps retrying) once it's pushed again.
                    throw error;
                }

                if (error === 'no_path') {
                    this.log(`No path exists to (${x}, ${y}) — giving up on this mission.`);
                    completeMission(missionId);
                    throw error;
                }

                this.log(`Mission to (${x}, ${y}) hit "${error}" — retrying.`);
                await new Promise(res => setTimeout(res, 200));
                if (this.stopped) throw ['stopped'];
            }
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