import { isWalkable, getDirection } from '../beliefs/map.js';
import { agents } from '../beliefs/agents.js';
import { crates } from '../beliefs/crates.js';
import { me } from '../beliefs/me.js'; 
import { distance } from './distance.js';

export function astar(start, goal) {
  const openList = [];
  const visited = new Set();

  // Build a set of blocked positions from crates
  const cratePositions = new Set(
      Array.from(crates.values())
          .map(c => `${Math.round(c.x)},${Math.round(c.y)}`)
  );

    // Build a set of blocked positions from agents
  const agentPositions = new Set(
      Array.from(agents.values())
          .map(a => `${Math.round(a.x)},${Math.round(a.y)}`)
  );

  openList.push({ x: start.x, y: start.y, g: 0, parent: null });

  while (openList.length > 0) {
    // Pick node with lowest f = g + h
    openList.sort((a, b) => (a.g + distance(a, goal)) - (b.g + distance(b, goal)));
    const current = openList.shift();
    const key = `${current.x},${current.y}`;

    if (visited.has(key)) continue;
    visited.add(key);

    // Goal reached — reconstruct path
    if (current.x === goal.x && current.y === goal.y) {
      const path = [];
      let node = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path; // array of {x, y} steps from start to goal
    }

    // Explore neighbours (up, down, left, right)
    const neighbours = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ];

    for (const n of neighbours) {
      // If current tile is directional, only allow the specified direction
      const forcedDirection = getDirection(current.x, current.y);
      if (forcedDirection) {
          const allowed = {
              '→': current.x + 1 == n.x && current.y == n.y,
              '←':  current.x - 1 == n.x && current.y == n.y,
              '↑':    current.y + 1 == n.y && current.x == n.x,
              '↓':  current.y - 1 == n.y && current.x == n.x,
          };
          if (!allowed[forcedDirection]) continue; // skip this neighbour
      }
      if (!visited.has(`${n.x},${n.y}`) && isWalkable(n.x, n.y) && !cratePositions.has(`${n.x},${n.y}` ) && !agentPositions.has(`${n.x},${n.y}` )) {
        openList.push({ ...n, g: current.g + 1, parent: current });
      }
    }
  }

  return null; // no path found
}