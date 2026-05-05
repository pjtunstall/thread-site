export class MazeBackground {
  constructor() {
    this.cellSize = 12;
    this.stepIntervalMs = 0;
    this.resizeDebounceMs = 220;
    this.carveCells = [];
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
    this.carveCells = this.buildCarveCells();
    this.nextCarveIndex = 0;
    this.lastStepAt = 0;
    this.paintFullWallLayer();

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

    const carved = Array.from({ length: mazeRows }, () =>
      Array.from({ length: mazeCols }, () => false),
    );
    const visited = Array.from({ length: cellRows }, () =>
      Array.from({ length: cellCols }, () => false),
    );
    const stack = [];
    const carveOrder = [];
    const startCell = {
      x: Math.floor(Math.random() * cellCols),
      y: Math.floor(Math.random() * cellRows),
    };

    stack.push(startCell);
    visited[startCell.y][startCell.x] = true;
    const startGridCell = { x: startCell.x * 2 + 1, y: startCell.y * 2 + 1 };
    carved[startGridCell.y][startGridCell.x] = true;
    carveOrder.push(startGridCell);

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

      const nextNeighbor =
        unvisitedNeighbors[
          Math.floor(Math.random() * unvisitedNeighbors.length)
        ];
      visited[nextNeighbor.y][nextNeighbor.x] = true;

      const currentGridX = current.x * 2 + 1;
      const currentGridY = current.y * 2 + 1;
      const nextGridX = nextNeighbor.x * 2 + 1;
      const nextGridY = nextNeighbor.y * 2 + 1;
      const wallBetweenX = currentGridX + nextNeighbor.direction.dx;
      const wallBetweenY = currentGridY + nextNeighbor.direction.dy;

      carved[nextGridY][nextGridX] = true;
      carveOrder.push({ x: nextGridX, y: nextGridY });

      carved[wallBetweenY][wallBetweenX] = true;
      carveOrder.push({ x: wallBetweenX, y: wallBetweenY });

      stack.push({ x: nextNeighbor.x, y: nextNeighbor.y });
    }

    return carveOrder;
  }

  drawCarveCell(cell) {
    this.context.fillRect(
      cell.x * this.cellSize,
      cell.y * this.cellSize,
      this.cellSize,
      this.cellSize,
    );
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
      if (this.nextCarveIndex < this.carveCells.length) {
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
