import {
  cellKey,
  cellToGrid,
  getCellNeighbors,
  pickRandomFrom,
  wallBetweenCells,
} from "../grid.js";

/**
 * @typedef {{ x: number, y: number }} Cell
 * @typedef {{ from: Cell, to: Cell }} Wall
 * @typedef {{ x: number, y: number }} GridPoint
 */

/**
 * Wilson's algorithm: add loop-erased random walks from unvisited cells.
 *
 * @param {{ cellCols: number, cellRows: number }} options
 * @returns {{ cells: Array<GridPoint>, iterativeStartIndex: number }}
 */
export function buildCarveCellsWilson({ cellCols, cellRows }) {
  /** @type {Array<Cell>} */
  const allCells = [];

  for (let y = 0; y < cellRows; y += 1) {
    for (let x = 0; x < cellCols; x += 1) {
      allCells.push({ x, y });
    }
  }

  /** @type {Set<string>} */
  const finalized = new Set();

  /** @type {Array<GridPoint>} */
  const carveOrder = [];

  const initialCell = pickRandomFrom(allCells);

  finalized.add(cellKey(initialCell));
  carveOrder.push(cellToGrid(initialCell));

  while (finalized.size < allCells.length) {
    /** @type {Array<Cell>} */
    const candidates = allCells.filter((cell) => !finalized.has(cellKey(cell)));

    /** @type {Cell} */
    const startOfWalk = pickRandomFrom(candidates);

    /** @type {Array<Cell>} */
    const walk = [startOfWalk];

    /** @type {Map<string, number>} */
    const walkPositions = new Map([[cellKey(startOfWalk), 0]]);

    /** @type {Cell} */
    let current = startOfWalk;

    while (!finalized.has(cellKey(current))) {
      const next = pickRandomFrom(
        getCellNeighbors(current, cellCols, cellRows),
      );
      const nextKey = cellKey(next);

      if (walkPositions.has(nextKey)) {
        const loopStart = walkPositions.get(nextKey);
        walk.splice(loopStart + 1);
        walkPositions.clear();
        for (let i = 0; i < walk.length; i += 1) {
          walkPositions.set(cellKey(walk[i]), i);
        }
      } else {
        walk.push(next);
        walkPositions.set(nextKey, walk.length - 1);
      }

      current = next;
    }

    for (let i = 0; i < walk.length - 1; i += 1) {
      const from = walk[i];
      const to = walk[i + 1];
      const fromKey = cellKey(from);

      if (!finalized.has(fromKey)) {
        finalized.add(fromKey);
        carveOrder.push(cellToGrid(from));
      }
      carveOrder.push(wallBetweenCells(from, to));
    }
  }

  return { cells: carveOrder, iterativeStartIndex: 0 };
}
