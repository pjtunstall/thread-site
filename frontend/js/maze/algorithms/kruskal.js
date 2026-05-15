import { cellToGrid, wallBetweenCells } from "../grid.js";

/**
 * Kruskal's algorithm: treat rooms as disjoint sets and carve walls that join sets.
 *
 * @param {{ cellCols: number, cellRows: number }} options
 * @returns {{ cells: Array<{x: number, y: number}>, iterativeStartIndex: number }}
 */
export function buildCarveCellsKruskal({ cellCols, cellRows }) {
  const carveOrder = [];
  const roomCount = cellCols * cellRows;
  const parent = Array.from({ length: roomCount }, (_, i) => i);
  const rank = Array.from({ length: roomCount }, () => 0);
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

function shuffleInPlace(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

function cellToIndex(cell, cellCols) {
  return cell.y * cellCols + cell.x;
}

function findSetRoot(parent, index) {
  if (parent[index] !== index) {
    parent[index] = findSetRoot(parent, parent[index]);
  }
  return parent[index];
}

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
