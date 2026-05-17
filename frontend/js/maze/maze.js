/**
 * Animated maze background. Uses a coarse grid of {@link Room}s for generation
 * and a fine grid of {@link Tile}s for drawing; see `grid.js`. The whole canvas
 * starts out wall-colored (CSS `--color-ink-wall`). Maze-generating algorithm
 * functions, `buildCarvePlanBacktracker` etc. return a {@link CarvePlan}, which
 * includes an array of `Tile`s to be switched to the
 * background color (CSS `--color-bg`) during the animation.
 *
 * If the browser is set to the reduced motion preference, the whole maze is
 * drawn at once rather than appearing incrementally.
 */
import { buildCarvePlanBacktracker } from "./algorithms/backtracker.js";
import { buildCarvePlanKruskal } from "./algorithms/kruskal.js";
import { buildCarvePlanPrim } from "./algorithms/prim.js";
import { buildCarvePlanWilson } from "./algorithms/wilson.js";

/** @import { Tile, CarvePlan } from "./grid.js" */

export class Maze {
  #tileSize = 12; // pixels
  #resizeDebounceMs = 220;

  #tilesPerMs = 32 / (1000 / 60); // Animation speed: 32 per 16.67ms frame.

  /** @type {Array<Tile>} */
  #tilesToCarve = []; // Supplied by the maze-generating algorithm.

  // Depending on the algorithm, some tiles may be carved instantly at the
  // start. `this.#iterativeStartIndex` is the index from which incremental
  // drawing begins. See, in particular, `kruskal.js`.
  #iterativeStartIndex = 0;

  // On theme change, we want the animation to continue seamlessly from where
  // it's got up to. But, since the wall and background colors have changed, we
  // need to redraw everything that's been drawn so far in one go. The
  // `nextCarveIndex` tracks the index of the next `Tile` of
  // `this.#tilesToCarve` that remains to be carved. It's the index at which we
  // resume iteratively drawing.
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

  /** @type {HTMLCanvasElement} */
  #canvas;

  constructor() {
    this.#canvas = document.createElement("canvas");
    this.#canvas.className = "maze";
    this.#canvas.setAttribute("aria-hidden", "true");
    const context = this.#canvas.getContext("2d");
    if (context instanceof CanvasRenderingContext2D) {
      this.#context = context;
      this.#enabled = true;
    } else {
      const e = new Error("[maze] Could not create 2D rendering context.");
      console.error(e);
    }
  }

  /**
   * Called when the page is initialized.
   *
   * @returns {void}
   */
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

  /**
   * Called:
   *   - on initialization by `this.start`,
   *   - when the user clicks to request a new maze,
   *   - when the window is resized,
   *   - and when when there's a change in motion preference.
   *
   * @returns {void}
   */
  restart() {
    if (!this.#enabled) {
      // No canvas context of the correct type exists.
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
    this.#paintWholeCanvasWallColor();

    if (this.#reduceMotionQuery.matches) {
      this.#drawInstantCarves(0, this.#tilesToCarve.length);
      return;
    }

    this.#drawInstantCarves(0, this.#iterativeStartIndex);
    this.#frameRequest = window.requestAnimationFrame(this.#onTick);
  }

  /**
   * This method is called on theme toggle. It re-reads --color-* from the
   * document and redraws what's already carved. `this.#enabled` implies
   * `this.#context` is correctly defined.
   *
   * @returns {void}
   */
  repaintCurrentPartialState() {
    if (!this.#enabled || this.#tilesToCarve.length === 0) {
      return;
    }

    // Repaint with opaque background color so that the partially transparent
    // --color-ink-wall does not stack on old pixels each toggle.
    this.#context.fillStyle = this.#getBackgroundFillColor();
    this.#context.fillRect(0, 0, this.#canvas.width, this.#canvas.height);

    this.#paintWholeCanvasWallColor();
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

  /**
   * This internal method returns the width of the maze in pixels. The addition
   * of twice the tile size is so that we can hide the boundary walls offscreen.
   * The top edge of the canvas is positioned one tile above the top edge of the
   * window, and the left edge of the canvas one tile to the left of the window
   * edge. See the ruleset for `.maze` in `01-foundation.css`.
   *
   * @returns {number}
   */
  #width() {
    return window.innerWidth + 2 * this.#tileSize;
  }

  /**
   * This internal method returns the height of the maze in pixels. See the
   * comment on `this.#width` regarding `+ 2 * this.#tileSize`.
   *
   * @returns {number}
   */
  #height() {
    return window.innerHeight + 2 * this.#tileSize;
  }

  #resizeCanvas() {
    this.#canvas.width = this.#width();
    this.#canvas.height = this.#height();
  }

  /**
   * This internal method gets the wall color directly from the DOM. It does
   * this so that the CSS can be our single source of truth for the color, and
   * to ensure that we use the correct color for the current theme. Compare
   * `this.#getBackgroundFillColor`.
   *
   * @returns {string}
   */
  #getWallFillColor() {
    return getComputedStyle(document.documentElement)
      .getPropertyValue("--color-ink-wall")
      .trim();
  }

  /**
   * This internal method gets the background color directly from the DOM. It
   * does this so that the CSS can be our single source of truth for the color,
   * and to ensure that we use the correct color for the current theme. Compare `this.##getWallFillColor`.
   *
   * @returns {string}
   */
  #getBackgroundFillColor() {
    return getComputedStyle(document.documentElement)
      .getPropertyValue("--color-bg")
      .trim();
  }

  #paintWholeCanvasWallColor() {
    this.#context.fillStyle = this.#getWallFillColor();
    this.#context.fillRect(0, 0, this.#canvas.width, this.#canvas.height);
  }

  /**
   * @returns {CarvePlan}
   */
  #buildCarvePlan() {
    const cols = Math.max(7, Math.ceil(this.#width() / this.#tileSize));
    const rows = Math.max(7, Math.ceil(this.#height() / this.#tileSize));
    const tileCols = cols % 2 === 0 ? cols + 1 : cols;
    const tileRows = rows % 2 === 0 ? rows + 1 : rows;
    const roomCols = Math.floor((tileCols - 1) / 2);
    const roomRows = Math.floor((tileRows - 1) / 2);
    const generator = this.#pickMazeGenerator();
    return generator({ roomCols, roomRows });
  }

  /**
   * @returns {(options: { roomCols: number, roomRows: number }) => CarvePlan}
   */
  #pickMazeGenerator() {
    const algorithms = [
      buildCarvePlanBacktracker,
      buildCarvePlanWilson,
      buildCarvePlanKruskal,
      buildCarvePlanPrim,
    ];
    return algorithms[Math.floor(Math.random() * algorithms.length)];
  }

  /**
   * This internal method draws an individual tile. It's used both by
   * `this.#drawInstantCarves` (to draw the maze instantly) and in
   * `this.#onTick` to draw it incrementally.
   *
   * @param {Tile} tile
   */
  #drawCarveTile(tile) {
    this.#context.fillRect(
      tile.x * this.#tileSize,
      tile.y * this.#tileSize,
      this.#tileSize,
      this.#tileSize,
    );
  }

  /**
   * This internal method is called on theme change to instantly carve out the
   * partial maze that's appeared so far, using the new background color. It's
   * also used to instantly draw a set of initially-carved tiles if the
   * algorithm requires it (Kruskal). Alternatively, it's used to draw the whole
   * maze instantly if browser settings indicate that the user prefers reduced
   * motion, bypassing the animation.
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

  /**
   * This internal method is passed as a callback to
   * `window.requestAnimationFrame`, initially in `this.restart`. It draws tiles
   * at the rate `this.#tilesPerMs`.
   *
   * @param {number} timestamp milliseconds
   * @returns {void}
   * */

  #onTick = (timestamp) => {
    this.#frameRequest = window.requestAnimationFrame(this.#onTick);

    if (this.#lastStepAt === 0) {
      this.#lastStepAt = timestamp;
    }

    const elapsed = timestamp - this.#lastStepAt;
    const howManyTilesToCarveThisFrame = Math.floor(elapsed * this.#tilesPerMs);
    if (howManyTilesToCarveThisFrame > 0) {
      this.#lastStepAt += howManyTilesToCarveThisFrame / this.#tilesPerMs;

      const targetIndex = Math.min(
        this.#nextCarveIndex + howManyTilesToCarveThisFrame,
        this.#tilesToCarve.length,
      );

      this.#context.fillStyle = this.#getBackgroundFillColor();

      while (this.#nextCarveIndex < targetIndex) {
        this.#drawCarveTile(this.#tilesToCarve[this.#nextCarveIndex]);
        this.#nextCarveIndex += 1;
      }
    }

    if (this.#nextCarveIndex >= this.#tilesToCarve.length) {
      window.cancelAnimationFrame(this.#frameRequest);
      this.#frameRequest = null;
      return;
    }
  };
}
