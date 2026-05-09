export class MazeBackground {
  constructor() {
    this.cellSize = 12;
    this.stepIntervalMs = 0;
    this.cellsPerFrame = 8;
    this.resizeDebounceMs = 220;
    this.carveCells = [];
    this.iterativeStartIndex = 0;
    this.nextCarveIndex = 0;
    this.lastStepAt = 0;
    this.frameRequest = null;
    this.resizeTimer = null;
    this.reduceMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    this.handleResize = this.handleResize.bind(this);
    this.handleMotionPreferenceChange =
      this.handleMotionPreferenceChange.bind(this);
    this.tick = this.tick.bind(this);

    this.canvas = document.createElement("canvas");
    this.canvas.className = "maze-bg";
    this.canvas.setAttribute("aria-hidden", "true");
    const context = this.canvas.getContext("2d");
    if (!(context instanceof CanvasRenderingContext2D)) {
      throw new Error("[maze-bg] Could not create 2D rendering context.");
    }
    this.context = context;
  }

  start() {
    document.body.prepend(this.canvas);
    window.addEventListener("resize", this.handleResize);
    this.reduceMotionQuery.addEventListener(
      "change",
      this.handleMotionPreferenceChange,
    );
    this.restart();
  }

  restart() {
    if (this.frameRequest !== null) {
      window.cancelAnimationFrame(this.frameRequest);
      this.frameRequest = null;
    }

    this.resizeCanvas();
    const carvePlan = this.buildCarveCells();
    this.carveCells = carvePlan.cells;
    this.iterativeStartIndex = carvePlan.iterativeStartIndex;
    this.nextCarveIndex = this.iterativeStartIndex;
    this.lastStepAt = 0;
    this.paintFullWallLayer();
    this.drawInstantCarves(0, this.iterativeStartIndex);

    if (this.reduceMotionQuery.matches) {
      this.drawAllCarves();
      return;
    }

    this.frameRequest = window.requestAnimationFrame(this.tick);
  }

  handleResize() {
    if (this.resizeTimer !== null) {
      window.clearTimeout(this.resizeTimer);
    }
    this.resizeTimer = window.setTimeout(() => {
      this.resizeTimer = null;
      this.restart();
    }, this.resizeDebounceMs);
  }

  handleMotionPreferenceChange() {
    this.restart();
  }

  resizeCanvas() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  getWallFillColor() {
    return getComputedStyle(document.documentElement)
      .getPropertyValue("--color-ink-wall")
      .trim();
  }

  getBackgroundFillColor() {
    return getComputedStyle(document.documentElement)
      .getPropertyValue("--color-bg")
      .trim();
  }

  paintFullWallLayer() {
    this.context.fillStyle = this.getWallFillColor();
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  buildCarveCells() {
    const cols = Math.max(7, Math.ceil(window.innerWidth / this.cellSize));
    const rows = Math.max(7, Math.ceil(window.innerHeight / this.cellSize));
    const mazeCols = cols % 2 === 0 ? cols + 1 : cols;
    const mazeRows = rows % 2 === 0 ? rows + 1 : rows;
    const cellCols = Math.floor((mazeCols - 1) / 2);
    const cellRows = Math.floor((mazeRows - 1) / 2);
    const generator = this.pickMazeGenerator();
    return generator({ cellCols, cellRows });
  }

  pickMazeGenerator() {
    const algorithms = [
      this.buildCarveCellsDepthFirst.bind(this),
      this.buildCarveCellsWilson.bind(this),
      this.buildCarveCellsKruskal.bind(this),
      this.buildCarveCellsPrim.bind(this),
    ];
    return algorithms[Math.floor(Math.random() * algorithms.length)];
  }

  // Depth-first backtracking: walk forward randomly until stuck, then backtrack.
  buildCarveCellsDepthFirst({ cellCols, cellRows }) {
    const visited = Array.from({ length: cellRows }, () =>
      Array.from({ length: cellCols }, () => false),
    );
    const stack = [];
    const carveOrder = [];
    const startCell = this.pickRandomCell(cellCols, cellRows);

    stack.push(startCell);
    visited[startCell.y][startCell.x] = true;
    carveOrder.push(this.cellToGrid(startCell));

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const unvisitedNeighbors = this.getCellNeighbors(
        current,
        cellCols,
        cellRows,
      ).filter((neighbor) => !visited[neighbor.y][neighbor.x]);

      if (unvisitedNeighbors.length === 0) {
        stack.pop();
        continue;
      }

      const nextNeighbor = this.pickRandomFrom(unvisitedNeighbors);
      visited[nextNeighbor.y][nextNeighbor.x] = true;

      const wallBetween = this.wallBetweenCells(current, nextNeighbor);
      carveOrder.push(this.cellToGrid(nextNeighbor));
      carveOrder.push(wallBetween);

      stack.push({ x: nextNeighbor.x, y: nextNeighbor.y });
    }

    return { cells: carveOrder, iterativeStartIndex: 0 };
  }

  // Wilson's algorithm: add loop-erased random walks from unvisited cells.
  buildCarveCellsWilson({ cellCols, cellRows }) {
    const allCells = [];
    for (let y = 0; y < cellRows; y += 1) {
      for (let x = 0; x < cellCols; x += 1) {
        allCells.push({ x, y });
      }
    }

    const finalized = new Set();
    const carveOrder = [];
    const initialCell = this.pickRandomFrom(allCells);

    finalized.add(this.cellKey(initialCell));
    carveOrder.push(this.cellToGrid(initialCell));

    while (finalized.size < allCells.length) {
      const candidates = allCells.filter(
        (cell) => !finalized.has(this.cellKey(cell)),
      );
      const startOfWalk = this.pickRandomFrom(candidates);
      const walk = [startOfWalk];
      const walkPositions = new Map([[this.cellKey(startOfWalk), 0]]);
      let current = startOfWalk;

      while (!finalized.has(this.cellKey(current))) {
        const next = this.pickRandomFrom(
          this.getCellNeighbors(current, cellCols, cellRows),
        );
        const nextKey = this.cellKey(next);

        if (walkPositions.has(nextKey)) {
          const loopStart = walkPositions.get(nextKey);
          walk.splice(loopStart + 1);
          walkPositions.clear();
          for (let i = 0; i < walk.length; i += 1) {
            walkPositions.set(this.cellKey(walk[i]), i);
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
        const fromKey = this.cellKey(from);

        if (!finalized.has(fromKey)) {
          finalized.add(fromKey);
          carveOrder.push(this.cellToGrid(from));
        }
        carveOrder.push(this.wallBetweenCells(from, to));
      }
    }

    return { cells: carveOrder, iterativeStartIndex: 0 };
  }

  // Kruskal's algorithm: treat rooms as disjoint sets and carve walls that join sets.
  buildCarveCellsKruskal({ cellCols, cellRows }) {
    const carveOrder = [];
    const roomCount = cellCols * cellRows;
    const parent = Array.from({ length: roomCount }, (_, i) => i);
    const rank = Array.from({ length: roomCount }, () => 0);
    const walls = [];

    for (let y = 0; y < cellRows; y += 1) {
      for (let x = 0; x < cellCols; x += 1) {
        carveOrder.push(this.cellToGrid({ x, y }));

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

    this.shuffleInPlace(walls);

    for (const wall of walls) {
      const fromIndex = this.cellToIndex(wall.from, cellCols);
      const toIndex = this.cellToIndex(wall.to, cellCols);
      const fromRoot = this.findSetRoot(parent, fromIndex);
      const toRoot = this.findSetRoot(parent, toIndex);

      if (fromRoot === toRoot) {
        continue;
      }

      this.unionSets(parent, rank, fromRoot, toRoot);
      carveOrder.push(this.wallBetweenCells(wall.from, wall.to));
    }

    return {
      cells: carveOrder,
      iterativeStartIndex: roomCount,
    };
  }

  // Prim's algorithm: grow a tree by carving random frontier walls outward.
  buildCarveCellsPrim({ cellCols, cellRows }) {
    const carveOrder = [];
    const visited = new Set();
    const frontier = new Map();
    const initialCell = this.pickRandomCell(cellCols, cellRows);

    visited.add(this.cellKey(initialCell));
    carveOrder.push(this.cellToGrid(initialCell));
    this.addFrontierWalls(initialCell, cellCols, cellRows, frontier, visited);

    while (frontier.size > 0) {
      const wallKey = this.pickRandomFrom(Array.from(frontier.keys()));
      const wall = frontier.get(wallKey);
      frontier.delete(wallKey);

      const fromVisited = visited.has(this.cellKey(wall.from));
      const toVisited = visited.has(this.cellKey(wall.to));

      if (fromVisited === toVisited) {
        continue;
      }

      const newCell = fromVisited ? wall.to : wall.from;
      visited.add(this.cellKey(newCell));
      carveOrder.push(this.wallBetweenCells(wall.from, wall.to));
      carveOrder.push(this.cellToGrid(newCell));
      this.addFrontierWalls(newCell, cellCols, cellRows, frontier, visited);
    }

    return { cells: carveOrder, iterativeStartIndex: 0 };
  }

  pickRandomCell(cellCols, cellRows) {
    return {
      x: Math.floor(Math.random() * cellCols),
      y: Math.floor(Math.random() * cellRows),
    };
  }

  pickRandomFrom(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  shuffleInPlace(items) {
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
  }

  cellToGrid(cell) {
    return { x: cell.x * 2 + 1, y: cell.y * 2 + 1 };
  }

  cellToIndex(cell, cellCols) {
    return cell.y * cellCols + cell.x;
  }

  cellKey(cell) {
    return `${cell.x},${cell.y}`;
  }

  wallBetweenCells(from, to) {
    const fromGrid = this.cellToGrid(from);
    return {
      x: fromGrid.x + (to.x - from.x),
      y: fromGrid.y + (to.y - from.y),
    };
  }

  getCellNeighbors(cell, cellCols, cellRows) {
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

  addFrontierWalls(cell, cellCols, cellRows, frontier, visited) {
    const neighbors = this.getCellNeighbors(cell, cellCols, cellRows);
    for (const neighbor of neighbors) {
      if (visited.has(this.cellKey(neighbor))) {
        continue;
      }
      const wall = this.normalizeWall(cell, neighbor);
      frontier.set(this.wallKey(wall), wall);
    }
  }

  normalizeWall(a, b) {
    if (a.y < b.y || (a.y === b.y && a.x <= b.x)) {
      return { from: a, to: b };
    }
    return { from: b, to: a };
  }

  wallKey(wall) {
    return `${this.cellKey(wall.from)}|${this.cellKey(wall.to)}`;
  }

  findSetRoot(parent, index) {
    if (parent[index] !== index) {
      parent[index] = this.findSetRoot(parent, parent[index]);
    }
    return parent[index];
  }

  unionSets(parent, rank, a, b) {
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

  drawCarveCell(cell) {
    this.context.fillRect(
      cell.x * this.cellSize,
      cell.y * this.cellSize,
      this.cellSize,
      this.cellSize,
    );
  }

  drawInstantCarves(startIndex, endIndex) {
    if (endIndex <= startIndex) {
      return;
    }
    this.context.fillStyle = this.getBackgroundFillColor();
    for (let i = startIndex; i < endIndex; i += 1) {
      this.drawCarveCell(this.carveCells[i]);
    }
  }

  drawAllCarves() {
    this.context.fillStyle = this.getBackgroundFillColor();
    const total = this.carveCells.length;
    for (let i = 0; i < total; i += 1) {
      this.drawCarveCell(this.carveCells[i]);
    }
    this.nextCarveIndex = this.carveCells.length;
  }

  tick(timestamp) {
    if (this.lastStepAt === 0) {
      this.lastStepAt = timestamp;
    }
    if (timestamp - this.lastStepAt >= this.stepIntervalMs) {
      this.context.fillStyle = this.getBackgroundFillColor();
      const targetIndex = Math.min(
        this.nextCarveIndex + this.cellsPerFrame,
        this.carveCells.length,
      );
      while (this.nextCarveIndex < targetIndex) {
        this.drawCarveCell(this.carveCells[this.nextCarveIndex]);
        this.nextCarveIndex += 1;
      }
      this.lastStepAt = timestamp;
    }

    if (this.nextCarveIndex >= this.carveCells.length) {
      this.frameRequest = null;
      return;
    }
    this.frameRequest = window.requestAnimationFrame(this.tick);
  }
}
