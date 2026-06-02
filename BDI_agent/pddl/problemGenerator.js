import { onlineSolver } from '@unitn-asa/pddl-client';
import { readFileSync } from 'fs';
import { me } from '../beliefs/me.js'; 
import { crates } from '../beliefs/crates.js'
import { grid, crateTiles, isWalkable } from '../beliefs/map.js'; 

// Läs in din domain-fil en gång
const domain = readFileSync('./BDI_agent/pddl/domain.pddl', 'utf8');

/**
 * Kontrollerar om vi behöver köra PDDL och returnerar en plan om det behövs.
 * @param {Object} goalPos - Målet för agenten {x, y}
 */
export async function planCrateMovement(goalPos) {

    const goalX = goalPos.x;
    const goalY = goalPos.y;

    const allWalkableTiles = [];
    for (const [key] of grid.entries()) {
        const [x, y] = key.split(',').map(Number);
        if (isWalkable(x, y)) {
            allWalkableTiles.push({ x, y });
        }
    }

    const getTileName = (x, y) => `t_${x}_${y}`;

    // 4. Generera PDDL-objekt (Tiles och Crates)
    const tileObjects = allWalkableTiles.map(t => getTileName(t.x, t.y)).join(' ');
    const crateObjects = Array.from(crates.keys()).map(id => `crate_${id}`).join(' ');

    // 5. Skapa nätverket av kopplingar (Grid)
    let connections = '';
    const directions = [
        { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
        { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
    ];
    const walkableMap = new Set(allWalkableTiles.map(t => `${t.x},${t.y}`));

    for (const tile of allWalkableTiles) {
        const currentName = getTileName(tile.x, tile.y);
        for (const dir of directions) {
            const nx = tile.x + dir.dx;
            const ny = tile.y + dir.dy;
            if (walkableMap.has(`${nx},${ny}`)) {
                connections += `        (connected ${currentName} ${getTileName(nx, ny)})\n`;
            }
        }
    }

    // 6. Hitta vilka rutor som är crateTiles
    let crateTilePredicates = '';
    for (const tile of crateTiles.values()) {
        crateTilePredicates += `        (is-crate-tile ${getTileName(tile.x, tile.y)})\n`;
    }

    // 7. Sätt ut agenten och lådorna samt räkna ut tomma rutor
    const occupiedTiles = new Set();
    occupiedTiles.add(`${me.x},${me.y}`); // Använder live-data från 'me'

    let cratePlacements = '';
    for (const crate of crates.values()) {
        const crateName = `crate_${crate.id}`;
        cratePlacements += `        (crate-at ${crateName} ${getTileName(crate.x, crate.y)})\n`;
        occupiedTiles.add(`${crate.x},${crate.y}`);
    }

    let emptyTiles = '';
    for (const tile of allWalkableTiles) {
        if (!occupiedTiles.has(`${tile.x},${tile.y}`)) {
            emptyTiles += `        (empty ${getTileName(tile.x, tile.y)})\n`;
        }
    }

    // 8. Montera ihop PDDL Problem-filen
    const problem = `(define (problem deliveroo-agent-problem)
                        (:domain deliveroo)
                        (:objects
                            ${tileObjects}
                            ${crateObjects}
                        )
                        (:init 
                        (agent-at ${getTileName(me.x, me.y)})
                            ${cratePlacements}
                            ${connections}
                            ${crateTilePredicates}
                            ${emptyTiles}
                        )
                        ; PDDL löser hur agenten ska nå målet, oavsett hur många lådor som står i vägen!
                        (:goal (agent-at ${getTileName(goalX, goalY)})) 
                    )`;

    // 9. Skicka till solver och returnera sekvensen av actions
    try {
        console.log(`[PDDL] Planning route to (${goalPos.x}, ${goalPos.y})...`);
        const plan = await onlineSolver(domain, problem);
        return plan; 
    } catch (error) {
        console.error("[PDDL] Solver failed or found no solution:", error);
        return null;
    }
}