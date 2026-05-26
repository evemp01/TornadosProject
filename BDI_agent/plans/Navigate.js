import { PlanBase } from "./PlanBase.js";
import { me } from "../beliefs/me.js";
import { socket } from "../../main_BDI.js";
import { astar } from "../utils/astar.js";

export class Navigate extends PlanBase {

    static isApplicableTo(go_to, x, y) {
        return go_to == 'go_to';
    }

    async execute(go_to, x, y) {

        // Compute the full path from current position to target
        const path = astar(
            { x: me.x, y: me.y },
            { x, y }
        );

        if (!path) {
            this.log('No path found to', x, y);
            throw 'no_path';
        }

        // Walk each step in the path (skip step 0, that's where we already are)
        for (const step of path.slice(1)) {

            if (this.stopped) throw ['stopped'];

            // Figure out which direction to move
            let direction;
            if (step.x > me.x)      direction = 'right';
            else if (step.x < me.x) direction = 'left';
            else if (step.y > me.y) direction = 'up';
            else if (step.y < me.y) direction = 'down';

            const moved = await socket.emitMove(direction);

            if (!moved) {
                this.log('Move failed at', step);
                throw 'stuck';
            }

            me.x = moved.x;
            me.y = moved.y;
        }

        return true;
    }
}