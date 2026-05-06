import { PlanBase } from "./PlanBase.js";
import { socket } from "../main.js";

export class RandomWalk extends PlanBase {

    static isApplicableTo(go_random) {
        return go_random === 'go_random';
    }

    async execute(go_random) {
        const directions = ['up', 'down', 'left', 'right'];
        
        while (!this.stopped) {
            const dir = directions[Math.floor(Math.random() * directions.length)];
            await socket.emitMove(dir);
            await new Promise(res => setTimeout(res, 300));
        }

        return true;
    }
}