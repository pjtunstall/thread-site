// Kruskal's algorithm: treat rooms as disjoint sets and carve walls that join sets.
export function buildCarveCellsKruskal({ cellCols, cellRows, helpers }) {
  const carveOrder = [];
  const roomCount = cellCols * cellRows;
  const parent = Array.from({ length: roomCount }, (_, i) => i);
  const rank = Array.from({ length: roomCount }, () => 0);
  const walls = [];

  for (let y = 0; y < cellRows; y += 1) {
    for (let x = 0; x < cellCols; x += 1) {
      carveOrder.push(helpers.cellToGrid({ x, y }));

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

  helpers.shuffleInPlace(walls);

  for (const wall of walls) {
    const fromIndex = helpers.cellToIndex(wall.from, cellCols);
    const toIndex = helpers.cellToIndex(wall.to, cellCols);
    const fromRoot = helpers.findSetRoot(parent, fromIndex);
    const toRoot = helpers.findSetRoot(parent, toIndex);

    if (fromRoot === toRoot) {
      continue;
    }

    helpers.unionSets(parent, rank, fromRoot, toRoot);
    carveOrder.push(helpers.wallBetweenCells(wall.from, wall.to));
  }

  return {
    cells: carveOrder,
    iterativeStartIndex: roomCount,
  };
}
