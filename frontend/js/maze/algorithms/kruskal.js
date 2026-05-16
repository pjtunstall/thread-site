import { cellToGrid, wallBetweenCells } from "../grid.js";

/**
 * @typedef {{ x: number, y: number }} Cell
 * @typedef {{ from: Cell, to: Cell }} Wall
 * @typedef {{ x: number, y: number }} GridPoint
 */

/**
 * Kruskal's algorithm: treat rooms as disjoint sets and carve walls that join sets.
 *
 * @param {{ cellCols: number, cellRows: number }} options
 * @returns {{ cells: Array<{x: number, y: number}>, iterativeStartIndex: number }}
 */
export function buildCarveCellsKruskal({ cellCols, cellRows }) {
  /** @type {Array<GridPoint>} */
  const carveOrder = [];

  const roomCount = cellCols * cellRows;

  /** @type {Array<number>} */
  const parent = Array.from({ length: roomCount }, (_, i) => i);

  /** @type {Array<number>} */
  const rank = Array.from({ length: roomCount }, () => 0);

  /** @type {Array<Wall>} */
  const walls = [];

  for (let y = 0; y < cellRows; y += 1) {
    for (let x = 0; x < cellCols; x += 1) {
      carveOrder.push(cellToGrid({ x, y }));

      if (x + 1 < cellCols) {
        walls.push({
          from: { x, y },
          to: { x: x + 1, y },
        });
      }
      if (y + 1 < cellRows) {
        walls.push({
          from: { x, y },
          to: { x, y: y + 1 },
        });
      }
    }
  }

  shuffleInPlace(walls);

  for (const wall of walls) {
    const fromIndex = cellToIndex(wall.from, cellCols);
    const toIndex = cellToIndex(wall.to, cellCols);
    const fromRoot = findSetRoot(parent, fromIndex);
    const toRoot = findSetRoot(parent, toIndex);

    if (fromRoot === toRoot) {
      continue;
    }

    unionSets(parent, rank, fromRoot, toRoot);
    carveOrder.push(wallBetweenCells(wall.from, wall.to));
  }

  return {
    cells: carveOrder,
    iterativeStartIndex: roomCount,
  };
}

/**
 * Fisher–Yates shuffle: randomize array order in place.
 *
 * @template T
 * @param {Array<T>} items
 * @returns {void}
 */
function shuffleInPlace(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

/**
 * Flat room index for union–find (row-major: `y * cellCols + x`).
 *
 * @param {Cell} cell
 * @param {number} cellCols
 * @returns {number}
 */
function cellToIndex(cell, cellCols) {
  return cell.y * cellCols + cell.x;
}

/**
 * Union–find: return the root of the set containing `index`. Follows parent
 * pointers until `parent[r] === r`; path-compresses on the way back.
 *
 * @param {Array<number>} parent Parent pointers; `parent[i]` is i's parent (i
 * if i is a root).
 * @param {number} index Room index whose set root is needed.
 * @returns {number} Root index of that set.
 */
function findSetRoot(parent, index) {
  if (parent[index] !== index) {
    parent[index] = findSetRoot(parent, parent[index]);
  }
  return parent[index];
}

/**
 * Union–find: merge the two sets whose roots are `a` and `b` (union by rank).
 * Attaches one root under the other via `parent`; no-op if `a === b`.
 *
 * @param {Array<number>} parent Parent-pointer forest (mutated).
 * @param {Array<number>} rank Approximate tree depths per root (mutated).
 * @param {number} a Root index of one set.
 * @param {number} b Root index of the other set.
 * @returns {void}
 */
function unionSets(parent, rank, a, b) {
  if (a === b) {
    return;
  }
  if (rank[a] < rank[b]) {
    parent[a] = b;
    return;
  }
  if (rank[a] > rank[b]) {
    parent[b] = a;
    return;
  }
  parent[b] = a;
  rank[a] += 1;
}
