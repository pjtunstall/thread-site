// Prim's algorithm: grow a tree by carving random frontier walls outward.
export function buildCarveCellsPrim({ cellCols, cellRows, helpers }) {
  const carveOrder = [];
  const visited = new Set();
  const frontier = new Map();
  const initialCell = helpers.pickRandomCell(cellCols, cellRows);

  visited.add(helpers.cellKey(initialCell));
  carveOrder.push(helpers.cellToGrid(initialCell));
  helpers.addFrontierWalls(initialCell, cellCols, cellRows, frontier, visited);

  while (frontier.size > 0) {
    const wallKey = helpers.pickRandomFrom(Array.from(frontier.keys()));
    const wall = frontier.get(wallKey);
    frontier.delete(wallKey);

    const fromVisited = visited.has(helpers.cellKey(wall.from));
    const toVisited = visited.has(helpers.cellKey(wall.to));

    if (fromVisited === toVisited) {
      continue;
    }

    const newCell = fromVisited ? wall.to : wall.from;
    visited.add(helpers.cellKey(newCell));
    carveOrder.push(helpers.wallBetweenCells(wall.from, wall.to));
    carveOrder.push(helpers.cellToGrid(newCell));
    helpers.addFrontierWalls(newCell, cellCols, cellRows, frontier, visited);
  }

  return { cells: carveOrder, iterativeStartIndex: 0 };
}
