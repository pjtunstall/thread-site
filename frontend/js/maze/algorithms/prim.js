import {
  cellKey,
  cellToGrid,
  getCellNeighbors,
  pickRandomCell,
  pickRandomFrom,
  wallBetweenCells,
} from "../grid.js";

/**
 * @typedef {{ x: number, y: number }} Cell
 * @typedef {{ from: Cell, to: Cell }} Wall
 * @typedef {{ x: number, y: number }} GridPoint
 *
 * @typedef {{ gridPoints: Array<GridPoint>, iterativeStartIndex: number }} CarvePlan
 */

/**
 * Prim's algorithm: grow a tree by carving random frontier walls outward.
 * Appearance: expands in all directions.
 *
 * @param {{ cellCols: number, cellRows: number }} options
 * @returns {CarvePlan}
 */
export function buildCarveCellsPrim({ cellCols, cellRows }) {
  /** @type {Array<GridPoint>} */
  const carveOrder = [];

  /** @type {Set<string>} */
  const visited = new Set();

  /** @type {Map<string, Wall>} */
  const frontier = new Map();

  const initialCell = pickRandomCell(cellCols, cellRows);

  visited.add(cellKey(initialCell));
  carveOrder.push(cellToGrid(initialCell));
  addFrontierWalls(initialCell, cellCols, cellRows, frontier, visited);

  while (frontier.size > 0) {
    /** @type {string} */
    const wallKeyValue = pickRandomFrom(Array.from(frontier.keys()));
    const wall = frontier.get(wallKeyValue);

    frontier.delete(wallKeyValue);

    /** @type {boolean} */
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

  return { gridPoints: carveOrder, iterativeStartIndex: 0 };
}

/**
 *
 * @param {Cell} a
 * @param {Cell} b
 * @returns {Wall}
 */
function normalizeWall(a, b) {
  if (a.y < b.y || (a.y === b.y && a.x <= b.x)) {
    return { from: a, to: b };
  }
  return { from: b, to: a };
}

/**
 *
 * @param {Wall} wall
 * @returns {string}
 */
function wallKey(wall) {
  return `${cellKey(wall.from)},${cellKey(wall.to)}`;
}

/**
 *
 * @param {Cell} cell
 * @param {number} cellCols
 * @param {number} cellRows
 * @param {Map<string, Wall>} frontier
 * @param {Set<string>} visited
 */
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
