import {
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
 * Depth-first backtracking: walk forward randomly until stuck, then backtrack.
 * Appearance: draws the maze in one long, winding path.
 *
 * @param {{ cellCols: number, cellRows: number }} options
 * @returns {CarvePlan}
 */
export function buildCarveCellsBacktracker({ cellCols, cellRows }) {
  /** @type {Array<Array<Cell>>} */
  const visited = Array.from({ length: cellRows }, () =>
    Array.from({ length: cellCols }, () => false),
  );

  /** @type {Array<Cell>} */
  const stack = [];

  /** @type {Array<GridPoint>} */
  const carveOrder = [];

  /** @type {Cell} */
  const startCell = pickRandomCell(cellCols, cellRows);

  stack.push(startCell);
  visited[startCell.y][startCell.x] = true;
  carveOrder.push(cellToGrid(startCell));

  while (stack.length > 0) {
    /** @type {Cell} */
    const current = stack[stack.length - 1];

    /** @type {Array<Cell>} */
    const unvisitedNeighbors = getCellNeighbors(
      current,
      cellCols,
      cellRows,
    ).filter((neighbor) => !visited[neighbor.y][neighbor.x]);

    if (unvisitedNeighbors.length === 0) {
      stack.pop();
      continue;
    }

    /** @type {Cell} */
    const nextNeighbor = pickRandomFrom(unvisitedNeighbors);

    visited[nextNeighbor.y][nextNeighbor.x] = true;

    carveOrder.push(cellToGrid(nextNeighbor));
    carveOrder.push(wallBetweenCells(current, nextNeighbor));

    stack.push({ x: nextNeighbor.x, y: nextNeighbor.y });
  }

  return { gridPoints: carveOrder, iterativeStartIndex: 0 };
}
