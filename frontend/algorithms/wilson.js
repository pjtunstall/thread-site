// Wilson's algorithm: add loop-erased random walks from unvisited cells.
export function buildCarveCellsWilson({ cellCols, cellRows, helpers }) {
  const allCells = [];
  for (let y = 0; y < cellRows; y += 1) {
    for (let x = 0; x < cellCols; x += 1) {
      allCells.push({ x, y });
    }
  }

  const finalized = new Set();
  const carveOrder = [];
  const initialCell = helpers.pickRandomFrom(allCells);

  finalized.add(helpers.cellKey(initialCell));
  carveOrder.push(helpers.cellToGrid(initialCell));

  while (finalized.size < allCells.length) {
    const candidates = allCells.filter(
      (cell) => !finalized.has(helpers.cellKey(cell)),
    );
    const startOfWalk = helpers.pickRandomFrom(candidates);
    const walk = [startOfWalk];
    const walkPositions = new Map([[helpers.cellKey(startOfWalk), 0]]);
    let current = startOfWalk;

    while (!finalized.has(helpers.cellKey(current))) {
      const next = helpers.pickRandomFrom(
        helpers.getCellNeighbors(current, cellCols, cellRows),
      );
      const nextKey = helpers.cellKey(next);

      if (walkPositions.has(nextKey)) {
        const loopStart = walkPositions.get(nextKey);
        walk.splice(loopStart + 1);
        walkPositions.clear();
        for (let i = 0; i < walk.length; i += 1) {
          walkPositions.set(helpers.cellKey(walk[i]), i);
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
      const fromKey = helpers.cellKey(from);

      if (!finalized.has(fromKey)) {
        finalized.add(fromKey);
        carveOrder.push(helpers.cellToGrid(from));
      }
      carveOrder.push(helpers.wallBetweenCells(from, to));
    }
  }

  return { cells: carveOrder, iterativeStartIndex: 0 };
}
