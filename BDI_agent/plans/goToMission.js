import { PlanBase } from "./PlanBase.js";
import { me } from "../beliefs/me.js";
import { socket } from "../../main_BDI.js";
import { astar } from "../utils/astar.js";

export class GoToMission extends PlanBase {

    static isApplicableTo(action, params, reward) {
        return action === 'go_to_mission';
    }

    async execute(action, params, reward) {

        const { x, y } = params;

        this.log(
            `Starting mission: go to (${x}, ${y}) for reward ${reward}`
        );

        const path = astar({ x: me.x, y: me.y },{ x, y });

        if (!path) {
            this.log('No path found to', x, y);
            throw 'no_path';
        }

        for (const step of path.slice(1)) {
            if (this.stopped)throw ['stopped'];

            let direction;

            if (step.x > me.x)direction = 'right';
            else if (step.x < me.x)direction = 'left';
            else if (step.y > me.y)direction = 'up';
            else if (step.y < me.y)direction = 'down';

            const moved = await socket.emitMove(direction);

            if (!moved) {
                this.log('Move failed at', step);
                throw 'stuck';
            }

            me.x = moved.x;
            me.y = moved.y;
        }

        this.log(
            `Mission completed: reached (${x}, ${y})`
        );

        return {
            success: true,
            reward
        };
    }
}