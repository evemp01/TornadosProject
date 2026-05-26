import { isWalkable } from '../beliefs/map.js';
import { distance } from './distance.js';

export function astar(start, goal) {
  const openList = [];
  const visited = new Set();

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
      if (!visited.has(`${n.x},${n.y}`) && isWalkable(n.x, n.y)) {
        openList.push({ ...n, g: current.g + 1, parent: current });
      }
    }
  }

  return null; // no path found
}