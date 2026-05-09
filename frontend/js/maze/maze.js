import { buildCarveCellsDepthFirst } from "./algorithms/depth-first.js";
import { buildCarveCellsKruskal } from "./algorithms/kruskal.js";
import { buildCarveCellsPrim } from "./algorithms/prim.js";
import { buildCarveCellsWilson } from "./algorithms/wilson.js";

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

  // Same layout: re-read --color-* from the document and redraw what is already carved.
  repaintCurrentState() {
    if (this.carveCells.length === 0) {
      return;
    }
    // Opaque base so translucent --color-ink-wall does not stack on old pixels each toggle.
    this.context.fillStyle = this.getBackgroundFillColor();
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.paintFullWallLayer();
    this.drawInstantCarves(0, this.nextCarveIndex);
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
    return generator({
      cellCols,
      cellRows,
      helpers: this.getGeneratorHelpers(),
    });
  }

  pickMazeGenerator() {
    const algorithms = [
      buildCarveCellsDepthFirst,
      buildCarveCellsWilson,
      buildCarveCellsKruskal,
      buildCarveCellsPrim,
    ];
    return algorithms[Math.floor(Math.random() * algorithms.length)];
  }

  getGeneratorHelpers() {
    return {
      pickRandomCell: this.pickRandomCell.bind(this),
      pickRandomFrom: this.pickRandomFrom.bind(this),
      shuffleInPlace: this.shuffleInPlace.bind(this),
      cellToGrid: this.cellToGrid.bind(this),
      cellToIndex: this.cellToIndex.bind(this),
      cellKey: this.cellKey.bind(this),
      wallBetweenCells: this.wallBetweenCells.bind(this),
      getCellNeighbors: this.getCellNeighbors.bind(this),
      addFrontierWalls: this.addFrontierWalls.bind(this),
      findSetRoot: this.findSetRoot.bind(this),
      unionSets: this.unionSets.bind(this),
    };
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
