import { PlanBase } from "./PlanBase.js";
import { me } from "../beliefs/me.js";
import { agents } from "../beliefs/agents.js";
import { socket } from "../../main_BDI.js";
import { astar } from "../utils/astar.js";
import { planCrateMovement } from "../pddl/problemGenerator.js";

export class Navigate extends PlanBase {
    
    static isApplicableTo(go_to, x, y) {
        return go_to == 'go_to';
    }

    async execute(go_to, x, y) {

        // Compute the full path from current position to target
        const path = astar(
            { x: Math.round(me.x), y: Math.round(me.y) },
            { x: Math.round(x), y: Math.round(y) }
        );
        //console.log("PATH:", path);
        // FALLBACK: If A* fails, activate the PDDL solver!
        if (!path) {
            this.log('No path found to', x, y, '- Activating PDDL multi-crate solver');

            const pddlPlan = await planCrateMovement({ x, y });

            if (pddlPlan && pddlPlan.length > 0) {
                this.log(`PDDL generated a plan of ${pddlPlan.length} steps. Executing entire puzzle sequence.`);
                // Loop through the entire PDDL plan so A* doesn't interrupt halfway through!
                for (const nextStep of pddlPlan) {
                    
                    if (this.stopped) throw ['stopped'];

                    let targetTileName = (nextStep.action === 'MOVE' || nextStep.action === 'PUSH_MOVE') 
                        ? nextStep.args[1] 
                        : null;

                    if (!targetTileName) {
                        console.error('Unexpected PDDL step without target tile:', nextStep);
                        continue;
                    }

                    const [_, tx, ty] = targetTileName.split('_').map(Number);
                    
                    // KEEPING YOUR EXACT ORIGINAL DIRECTIONS THAT WORKED FOR A*
                    let direction;
                    if (tx > me.x)      direction = 'right';
                    else if (tx < me.x) direction = 'left';
                    else if (ty > me.y) direction = 'up';   
                    else if (ty < me.y) direction = 'down'; 

                    this.log(`Executing PDDL step (${nextStep.name}): ${direction} towards ${targetTileName}`);
                    
                    const moved = await socket.emitMove(direction);
                    if (!moved) {
                        this.log('Move failed, replanning step...');

                        return false;
                    }

                    // Update your local beliefs immediately so next loop step knows where you are
                    me.x = moved.x;
                    me.y = moved.y;
                }

                // Return true when the entire puzzle is solved and agent reached the goal (or cleared the path)
                return true; 
            }

            this.log('PDDL could not find a way through the crates. Giving up.');
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

            // I Navigate.execute(), i A*-loopen:
            const moved = await socket.emitMove(direction);

            if (!moved) {
                // Kolla om en agent blockerar just den här rutan
                const blocker = Array.from(agents.values()).find(a => 
                    Math.round(a.x) === step.x && Math.round(a.y) === step.y
                );
                
                if (blocker) {
                    // Vänta en tick och försök igen — agenten kanske rör sig
                    await new Promise(res => setTimeout(res, 50));
                    const retry = await socket.emitMove(direction);
                    if (retry) {
                        me.x = retry.x;
                        me.y = retry.y;
                        continue;
                    }
                    // Agenten fortfarande där — kasta stuck så Navigate kan replanna
                    throw 'stuck';
                }
                
                this.log('Move failed at', step);
                throw 'stuck';
            }

            me.x = moved.x;
            me.y = moved.y;
        }

        return true;
    }
}