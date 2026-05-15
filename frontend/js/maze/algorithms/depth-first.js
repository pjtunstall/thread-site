import {
  cellToGrid,
  getCellNeighbors,
  pickRandomCell,
  pickRandomFrom,
  wallBetweenCells,
} from "../grid.js";

/**
 * Depth-first backtracking: walk forward randomly until stuck, then backtrack.
 *
 * @param {{ cellCols: number, cellRows: number }} options
 * @returns {{ cells: Array<{x: number, y: number}>, iterativeStartIndex: number }}
 */
export function buildCarveCellsDepthFirst({ cellCols, cellRows }) {
  const visited = Array.from({ length: cellRows }, () =>
    Array.from({ length: cellCols }, () => false),
  );
  const stack = [];
  const carveOrder = [];
  const startCell = pickRandomCell(cellCols, cellRows);

  stack.push(startCell);
  visited[startCell.y][startCell.x] = true;
  carveOrder.push(cellToGrid(startCell));

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const unvisitedNeighbors = getCellNeighbors(
      current,
      cellCols,
      cellRows,
    ).filter((neighbor) => !visited[neighbor.y][neighbor.x]);

    if (unvisitedNeighbors.length === 0) {
      stack.pop();
      continue;
    }

    const nextNeighbor = pickRandomFrom(unvisitedNeighbors);
    visited[nextNeighbor.y][nextNeighbor.x] = true;

    carveOrder.push(cellToGrid(nextNeighbor));
    carveOrder.push(wallBetweenCells(current, nextNeighbor));

    stack.push({ x: nextNeighbor.x, y: nextNeighbor.y });
  }

  return { cells: carveOrder, iterativeStartIndex: 0 };
}
