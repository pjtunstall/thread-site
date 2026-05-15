import {
  cellKey,
  cellToGrid,
  getCellNeighbors,
  pickRandomCell,
  pickRandomFrom,
  wallBetweenCells,
} from "../grid.js";

function normalizeWall(a, b) {
  if (a.y < b.y || (a.y === b.y && a.x <= b.x)) {
    return { from: a, to: b };
  }
  return { from: b, to: a };
}

function wallKey(wall) {
  return `${cellKey(wall.from)}|${cellKey(wall.to)}`;
}

function addFrontierWalls(cell, cellCols, cellRows, frontier, visited) {
  const neighbors = getCellNeighbors(cell, cellCols, cellRows);
  for (const neighbor of neighbors) {
    if (visited.has(cellKey(neighbor))) {
      continue;
    }
    const wall = normalizeWall(cell, neighbor);
    frontier.set(wallKey(wall), wall);
  }
}

/**
 * Prim's algorithm: grow a tree by carving random frontier walls outward.
 *
 * @param {{ cellCols: number, cellRows: number }} options
 * @returns {{ cells: Array<{x: number, y: number}>, iterativeStartIndex: number }}
 */
export function buildCarveCellsPrim({ cellCols, cellRows }) {
  const carveOrder = [];
  const visited = new Set();
  const frontier = new Map();
  const initialCell = pickRandomCell(cellCols, cellRows);

  visited.add(cellKey(initialCell));
  carveOrder.push(cellToGrid(initialCell));
  addFrontierWalls(initialCell, cellCols, cellRows, frontier, visited);

  while (frontier.size > 0) {
    const wallKeyValue = pickRandomFrom(Array.from(frontier.keys()));
    const wall = frontier.get(wallKeyValue);
    frontier.delete(wallKeyValue);

    const fromVisited = visited.has(cellKey(wall.from));
    const toVisited = visited.has(cellKey(wall.to));

    if (fromVisited === toVisited) {
      continue;
    }

    const newCell = fromVisited ? wall.to : wall.from;
    visited.add(cellKey(newCell));
    carveOrder.push(wallBetweenCells(wall.from, wall.to));
    carveOrder.push(cellToGrid(newCell));
    addFrontierWalls(newCell, cellCols, cellRows, frontier, visited);
  }

  return { cells: carveOrder, iterativeStartIndex: 0 };
}
