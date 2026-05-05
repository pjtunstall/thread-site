export class MazeBackground {
  constructor() {
    this.cellSize = 12; // Fine-grained grid for detailed maze walls.
    this.stepIntervalMs = 28;
    this.resizeDebounceMs = 220;
    this.wallCells = [];
    this.nextWallIndex = 0;
    this.lastStepAt = 0;
    this.frameRequest = null;
    this.resizeTimer = null;
    this.reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
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
    this.wallCells = this.buildWallCells();
    this.nextWallIndex = 0;
    this.lastStepAt = 0;
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.reduceMotionQuery.matches) {
      this.drawAllWalls();
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
      .getPropertyValue("--color-ink-faint")
      .trim();
  }

  buildWallCells() {
    const cols = Math.max(7, Math.ceil(window.innerWidth / this.cellSize));
    const rows = Math.max(7, Math.ceil(window.innerHeight / this.cellSize));
    const mazeCols = cols % 2 === 0 ? cols + 1 : cols;
    const mazeRows = rows % 2 === 0 ? rows + 1 : rows;
    const cellCols = Math.floor((mazeCols - 1) / 2);
    const cellRows = Math.floor((mazeRows - 1) / 2);

    const carved = Array.from({ length: mazeRows }, () =>
      Array.from({ length: mazeCols }, () => false),
    );
    const visited = Array.from({ length: cellRows }, () =>
      Array.from({ length: cellCols }, () => false),
    );
    const stack = [];
    const traversalCells = [];
    const startCell = {
      x: Math.floor(Math.random() * cellCols),
      y: Math.floor(Math.random() * cellRows),
    };

    stack.push(startCell);
    visited[startCell.y][startCell.x] = true;
    carved[startCell.y * 2 + 1][startCell.x * 2 + 1] = true;
    traversalCells.push({ x: startCell.x * 2 + 1, y: startCell.y * 2 + 1 });

    const directions = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const unvisitedNeighbors = [];

      for (const direction of directions) {
        const nextX = current.x + direction.dx;
        const nextY = current.y + direction.dy;
        if (nextX < 0 || nextX >= cellCols) continue;
        if (nextY < 0 || nextY >= cellRows) continue;
        if (visited[nextY][nextX]) continue;
        unvisitedNeighbors.push({ x: nextX, y: nextY, direction });
      }

      if (unvisitedNeighbors.length === 0) {
        stack.pop();
        continue;
      }

      // Fully random branch selection on every run.
      const nextNeighbor =
        unvisitedNeighbors[Math.floor(Math.random() * unvisitedNeighbors.length)];
      visited[nextNeighbor.y][nextNeighbor.x] = true;

      const currentGridX = current.x * 2 + 1;
      const currentGridY = current.y * 2 + 1;
      const nextGridX = nextNeighbor.x * 2 + 1;
      const nextGridY = nextNeighbor.y * 2 + 1;
      const wallBetweenX = currentGridX + nextNeighbor.direction.dx;
      const wallBetweenY = currentGridY + nextNeighbor.direction.dy;

      carved[nextGridY][nextGridX] = true;
      carved[wallBetweenY][wallBetweenX] = true;
      traversalCells.push({ x: wallBetweenX, y: wallBetweenY });
      traversalCells.push({ x: nextGridX, y: nextGridY });
      stack.push({ x: nextNeighbor.x, y: nextNeighbor.y });
    }

    const walls = [];
    const seenWallKeys = new Set();
    const addWallIfSolid = (x, y) => {
      if (x < 0 || x >= mazeCols || y < 0 || y >= mazeRows) return;
      if (carved[y][x]) return;
      const key = `${x},${y}`;
      if (seenWallKeys.has(key)) return;
      seenWallKeys.add(key);
      walls.push({ x, y });
    };

    // Build wall paint sequence according to DFS/backtracking traversal context.
    for (const cell of traversalCells) {
      addWallIfSolid(cell.x - 1, cell.y);
      addWallIfSolid(cell.x + 1, cell.y);
      addWallIfSolid(cell.x, cell.y - 1);
      addWallIfSolid(cell.x, cell.y + 1);
    }

    // Add any remaining walls not reached by adjacency ordering.
    for (let y = 0; y < mazeRows; y += 1) {
      for (let x = 0; x < mazeCols; x += 1) {
        addWallIfSolid(x, y);
      }
    }

    return walls;
  }

  drawWallCell(cell, index, total) {
    const progress = total <= 1 ? 1 : index / (total - 1);
    const alphaMin = 0.4;
    this.context.globalAlpha = alphaMin + (1 - alphaMin) * progress;
    this.context.fillRect(
      cell.x * this.cellSize,
      cell.y * this.cellSize,
      this.cellSize,
      this.cellSize,
    );
    this.context.globalAlpha = 1;
  }

  drawAllWalls() {
    this.context.fillStyle = this.getWallFillColor();
    const total = this.wallCells.length;
    for (let i = 0; i < total; i += 1) {
      this.drawWallCell(this.wallCells[i], i, total);
    }
    this.nextWallIndex = this.wallCells.length;
  }

  tick(timestamp) {
    if (this.lastStepAt === 0) {
      this.lastStepAt = timestamp;
    }
    if (timestamp - this.lastStepAt >= this.stepIntervalMs) {
      this.context.fillStyle = this.getWallFillColor();
      if (this.nextWallIndex < this.wallCells.length) {
        this.drawWallCell(
          this.wallCells[this.nextWallIndex],
          this.nextWallIndex,
          this.wallCells.length,
        );
        this.nextWallIndex += 1;
      }
      this.lastStepAt = timestamp;
    }

    if (this.nextWallIndex >= this.wallCells.length) {
      this.frameRequest = null;
      return;
    }
    this.frameRequest = window.requestAnimationFrame(this.tick);
  }
}
