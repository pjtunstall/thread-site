// Depth-first backtracking: walk forward randomly until stuck, then backtrack.
export function buildCarveCellsDepthFirst({ cellCols, cellRows, helpers }) {
  const visited = Array.from({ length: cellRows }, () =>
    Array.from({ length: cellCols }, () => false),
  );
  const stack = [];
  const carveOrder = [];
  const startCell = helpers.pickRandomCell(cellCols, cellRows);

  stack.push(startCell);
  visited[startCell.y][startCell.x] = true;
  carveOrder.push(helpers.cellToGrid(startCell));

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const unvisitedNeighbors = helpers
      .getCellNeighbors(current, cellCols, cellRows)
      .filter((neighbor) => !visited[neighbor.y][neighbor.x]);

    if (unvisitedNeighbors.length === 0) {
      stack.pop();
      continue;
    }

    const nextNeighbor = helpers.pickRandomFrom(unvisitedNeighbors);
    visited[nextNeighbor.y][nextNeighbor.x] = true;

    const wallBetween = helpers.wallBetweenCells(current, nextNeighbor);
    carveOrder.push(helpers.cellToGrid(nextNeighbor));
    carveOrder.push(wallBetween);

    stack.push({ x: nextNeighbor.x, y: nextNeighbor.y });
  }

  return { cells: carveOrder, iterativeStartIndex: 0 };
}
