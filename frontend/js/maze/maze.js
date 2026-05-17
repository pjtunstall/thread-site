/**
 * Animated maze background. Uses a coarse grid of {@link Room}s for generation
 * and a fine grid of {@link Tile}s for drawing; see `grid.js`. The whole canvas
 * starts out wall-colored (CSS `--color-ink-wall`). Maze-generating algorithm
 * functions, `buildCarvePlanBacktracker` etc. return an array of `Tile`s to be
 * switched to the background color (CSS `--color-bg`) during the animation.
 *
 * If the browser is set to the reduced motion preference, the whole maze is
 * drawn at once rather than appearing incrementally.
 */
import { buildCarvePlanBacktracker } from "./algorithms/backtracker.js";
import { buildCarvePlanKruskal } from "./algorithms/kruskal.js";
import { buildCarvePlanPrim } from "./algorithms/prim.js";
import { buildCarvePlanWilson } from "./algorithms/wilson.js";

/** @import { Tile } from "./grid.js" */

export class MazeBackground {
  #tileSize = 12; // pixels
  #resizeDebounceMs = 220;

  #tilesPerMs = 32 / (1000 / 60); // animation speed

  /** @type {Array<Tile>} */
  #tilesToCarve = []; // Supplied by the maze-generating algorithm.

  // Depending on the algorithm, some tiles may be carved instantly at the
  // start. `#iterativeStartIndex` is the index from which incremental drawing
  // begins. See, in particular, `kruskal.js`.
  #iterativeStartIndex = 0;

  // On theme change, we want the animation to continue seamlessly from where
  // it's got up to. But, since the wall and background colors have changed, we
  // need to redraw everything that's been drawn so far in one go. The
  // `nextCarveIndex` tracks the index of the next `Tile` of `tilesToCarve` that
  // remains to be carved. It's the index at which we resume iteratvely drawing.
  #nextCarveIndex = 0;
  #lastStepAt = 0;

  /** @type {number | null} */
  #frameRequest = null; // `requestAnimationFrame` request ID.

  /** @type {number | null} */
  #resizeTimer = null; // Timer ID to throttle restart animation on resize.

  #reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  #enabled = false; // Set to `true` when constructor gets canvas context.

  /** @type {CanvasRenderingContext2D | null} */
  #context = null;

  /**@type {HTMLCanvasElement} */
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
    const carvePlan = this.#buildCarvePlan();
    this.#tilesToCarve = carvePlan.tiles;
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
    if (!this.#enabled || this.#tilesToCarve.length === 0) {
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

  #buildCarvePlan() {
    const cols = Math.max(7, Math.ceil(window.innerWidth / this.#tileSize));
    const rows = Math.max(7, Math.ceil(window.innerHeight / this.#tileSize));
    const tileCols = cols % 2 === 0 ? cols + 1 : cols;
    const tileRows = rows % 2 === 0 ? rows + 1 : rows;
    const roomCols = Math.floor((tileCols - 1) / 2);
    const roomRows = Math.floor((tileRows - 1) / 2);
    const generator = this.#pickMazeGenerator();
    return generator({ roomCols, roomRows });
  }

  #pickMazeGenerator() {
    const algorithms = [
      buildCarvePlanBacktracker,
      buildCarvePlanWilson,
      buildCarvePlanKruskal,
      buildCarvePlanPrim,
    ];
    return algorithms[Math.floor(Math.random() * algorithms.length)];
  }

  #drawCarveTile(tile) {
    this.#context.fillRect(
      tile.x * this.#tileSize,
      tile.y * this.#tileSize,
      this.#tileSize,
      this.#tileSize,
    );
  }

  /**
   * This internal method is called on theme change to instantly draw the
   * partial maze that's appeared so far in the new colors.
   *
   * @param {number} startIndex
   * @param {number} endIndex
   * @returns {void}
   */
  #drawInstantCarves(startIndex, endIndex) {
    if (endIndex <= startIndex) {
      return;
    }
    this.#context.fillStyle = this.#getBackgroundFillColor();
    for (let i = startIndex; i < endIndex; i += 1) {
      this.#drawCarveTile(this.#tilesToCarve[i]);
    }
  }

  #drawAllCarves() {
    this.#context.fillStyle = this.#getBackgroundFillColor();
    const total = this.#tilesToCarve.length;
    for (let i = 0; i < total; i += 1) {
      this.#drawCarveTile(this.#tilesToCarve[i]);
    }
    this.#nextCarveIndex = this.#tilesToCarve.length;
  }

  #onTick = (timestamp) => {
    this.#frameRequest = window.requestAnimationFrame(this.#onTick);

    if (this.#lastStepAt === 0) {
      this.#lastStepAt = timestamp;
    }

    const elapsed = timestamp - this.#lastStepAt;
    const tilesToDraw = Math.floor(elapsed * this.#tilesPerMs);
    if (tilesToDraw > 0) {
      this.#lastStepAt += tilesToDraw / this.#tilesPerMs;
    }

    const targetIndex = Math.min(
      this.#nextCarveIndex + tilesToDraw,
      this.#tilesToCarve.length,
    );

    this.#context.fillStyle = this.#getBackgroundFillColor();

    while (this.#nextCarveIndex < targetIndex) {
      this.#drawCarveTile(this.#tilesToCarve[this.#nextCarveIndex]);
      this.#nextCarveIndex += 1;
    }

    if (this.#nextCarveIndex >= this.#tilesToCarve.length) {
      window.cancelAnimationFrame(this.#frameRequest);
      this.#frameRequest = null;
      return;
    }
  };
}
