import { buildCarveCellsBacktracker } from "./algorithms/backtracker.js";
import { buildCarveCellsKruskal } from "./algorithms/kruskal.js";
import { buildCarveCellsPrim } from "./algorithms/prim.js";
import { buildCarveCellsWilson } from "./algorithms/wilson.js";

export class MazeBackground {
  #cellSize = 12;
  #stepIntervalMs = 0;
  #cellsPerFrame = 8;
  #resizeDebounceMs = 220;
  #carveCells = [];
  #iterativeStartIndex = 0;
  #nextCarveIndex = 0;
  #lastStepAt = 0;
  #frameRequest = null;
  #resizeTimer = null;
  #reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  #enabled = false;
  #context = null;
  #canvas;

  constructor() {
    this.#canvas = document.createElement("canvas");
    this.#canvas.className = "maze-bg";
    this.#canvas.setAttribute("aria-hidden", "true");
    const context = this.#canvas.getContext("2d");
    if (!(context instanceof CanvasRenderingContext2D)) {
      const e = new Error("[maze-bg] Could not create 2D rendering context.");
      console.error(e);
    } else {
      this.#context = context;
      this.#enabled = true;
    }
  }

  start() {
    if (!this.#enabled) {
      return;
    }
    document.body.prepend(this.#canvas);
    window.addEventListener("resize", this.#onResize);
    this.#reduceMotionQuery.addEventListener(
      "change",
      this.#onMotionPreferenceChange,
    );
    this.restart();
  }

  restart() {
    if (!this.#enabled) {
      return;
    }
    if (this.#frameRequest !== null) {
      window.cancelAnimationFrame(this.#frameRequest);
      this.#frameRequest = null;
    }

    this.#resizeCanvas();
    const carvePlan = this.#buildCarveCells();
    this.#carveCells = carvePlan.gridPoints;
    this.#iterativeStartIndex = carvePlan.iterativeStartIndex;
    this.#nextCarveIndex = this.#iterativeStartIndex;
    this.#lastStepAt = 0;
    this.#paintFullWallLayer();
    this.#drawInstantCarves(0, this.#iterativeStartIndex);

    if (this.#reduceMotionQuery.matches) {
      this.#drawAllCarves();
      return;
    }

    this.#frameRequest = window.requestAnimationFrame(this.#onTick);
  }

  // This function is called on theme toggle. It re-reads --color-* from the
  // document and redraw what is already carved.
  repaintCurrentState() {
    if (!this.#enabled || this.#carveCells.length === 0) {
      return;
    }

    // Repaint with opaque background color so that the partially transparent
    // --color-ink-wall does not stack on old pixels each toggle.
    this.#context.fillStyle = this.#getBackgroundFillColor();
    this.#context.fillRect(0, 0, this.#canvas.width, this.#canvas.height);

    this.#paintFullWallLayer();
    this.#drawInstantCarves(0, this.#nextCarveIndex);
  }

  #onResize = () => {
    if (this.#resizeTimer !== null) {
      window.clearTimeout(this.#resizeTimer);
    }
    this.#resizeTimer = window.setTimeout(() => {
      this.#resizeTimer = null;
      this.restart();
    }, this.#resizeDebounceMs);
  };

  #onMotionPreferenceChange = () => {
    this.restart();
  };

  #resizeCanvas() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.#canvas.width = width;
    this.#canvas.height = height;
  }

  #getWallFillColor() {
    return getComputedStyle(document.documentElement)
      .getPropertyValue("--color-ink-wall")
      .trim();
  }

  #getBackgroundFillColor() {
    return getComputedStyle(document.documentElement)
      .getPropertyValue("--color-bg")
      .trim();
  }

  #paintFullWallLayer() {
    this.#context.fillStyle = this.#getWallFillColor();
    this.#context.fillRect(0, 0, this.#canvas.width, this.#canvas.height);
  }

  #buildCarveCells() {
    const cols = Math.max(7, Math.ceil(window.innerWidth / this.#cellSize));
    const rows = Math.max(7, Math.ceil(window.innerHeight / this.#cellSize));
    const mazeCols = cols % 2 === 0 ? cols + 1 : cols;
    const mazeRows = rows % 2 === 0 ? rows + 1 : rows;
    const cellCols = Math.floor((mazeCols - 1) / 2);
    const cellRows = Math.floor((mazeRows - 1) / 2);
    const generator = this.#pickMazeGenerator();
    return generator({ cellCols, cellRows });
  }

  #pickMazeGenerator() {
    const algorithms = [
      buildCarveCellsBacktracker,
      buildCarveCellsWilson,
      buildCarveCellsKruskal,
      buildCarveCellsPrim,
    ];
    return algorithms[Math.floor(Math.random() * algorithms.length)];
  }

  #drawCarveCell(cell) {
    this.#context.fillRect(
      cell.x * this.#cellSize,
      cell.y * this.#cellSize,
      this.#cellSize,
      this.#cellSize,
    );
  }

  #drawInstantCarves(startIndex, endIndex) {
    if (endIndex <= startIndex) {
      return;
    }
    this.#context.fillStyle = this.#getBackgroundFillColor();
    for (let i = startIndex; i < endIndex; i += 1) {
      this.#drawCarveCell(this.#carveCells[i]);
    }
  }

  #drawAllCarves() {
    this.#context.fillStyle = this.#getBackgroundFillColor();
    const total = this.#carveCells.length;
    for (let i = 0; i < total; i += 1) {
      this.#drawCarveCell(this.#carveCells[i]);
    }
    this.#nextCarveIndex = this.#carveCells.length;
  }

  #onTick = (timestamp) => {
    if (this.#lastStepAt === 0) {
      this.#lastStepAt = timestamp;
    }
    if (timestamp - this.#lastStepAt >= this.#stepIntervalMs) {
      this.#context.fillStyle = this.#getBackgroundFillColor();
      const targetIndex = Math.min(
        this.#nextCarveIndex + this.#cellsPerFrame,
        this.#carveCells.length,
      );
      while (this.#nextCarveIndex < targetIndex) {
        this.#drawCarveCell(this.#carveCells[this.#nextCarveIndex]);
        this.#nextCarveIndex += 1;
      }
      this.#lastStepAt = timestamp;
    }

    if (this.#nextCarveIndex >= this.#carveCells.length) {
      this.#frameRequest = null;
      return;
    }
    this.#frameRequest = window.requestAnimationFrame(this.#onTick);
  };
}
