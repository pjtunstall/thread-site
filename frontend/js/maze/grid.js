export function pickRandomCell(cellCols, cellRows) {
  return {
    x: Math.floor(Math.random() * cellCols),
    y: Math.floor(Math.random() * cellRows),
  };
}

export function pickRandomFrom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function cellToGrid(cell) {
  return { x: cell.x * 2 + 1, y: cell.y * 2 + 1 };
}

export function cellKey(cell) {
  return `${cell.x},${cell.y}`;
}

export function wallBetweenCells(from, to) {
  const fromGrid = cellToGrid(from);
  return {
    x: fromGrid.x + (to.x - from.x),
    y: fromGrid.y + (to.y - from.y),
  };
}

export function getCellNeighbors(cell, cellCols, cellRows) {
  const directions = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];
  const neighbors = [];

  for (const direction of directions) {
    const nextX = cell.x + direction.dx;
    const nextY = cell.y + direction.dy;
    if (nextX < 0 || nextX >= cellCols) continue;
    if (nextY < 0 || nextY >= cellRows) continue;
    neighbors.push({ x: nextX, y: nextY });
  }

  return neighbors;
}
