/**
 * Animated maze background. Uses a coarse grid of {@link Room}s for generation
 * and a fine grid of {@link Tile}s for drawing; see `grid.js` and `room.js`.
 * The whole canvas starts out wall-colored (CSS `--color-ink-wall`).
 * Maze-generating algorithm functions, `buildCarvePlanBacktracker` etc. return
 * a {@link CarvePlan}, which includes an array of `Tile`s to be switched to the
 * background color (CSS `--color-bg`) during the animation.
 *
 * If the browser is set to the reduced motion preference, the whole maze is
 * drawn at once rather than appearing incrementally.
 */
import { buildCarvePlanBacktracker } from "./algorithms/backtracker.js";
import { buildCarvePlanKruskal } from "./algorithms/kruskal.js";
import { buildCarvePlanPrim } from "./algorithms/prim.js";
import { buildCarvePlanWilson } from "./algorithms/wilson.js";
import { pickRandomFrom } from "./grid.js";

/** @import { Tile, CarvePlan } from "./grid.js" */

export class Maze {
  #baseTileSize = 12; // pixels
  #tileSize = 12; // We'll multiply this by devicePixelRatio.
  #restartDebounceMs = 220;
  #lastDpr = 1;

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
  #restartTimer = null; // Timer ID to throttle restart animation on resize, etc.

  #reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  #enabled = false; // Set to `true` when constructor gets canvas context.

  /** @type {CanvasRenderingContext2D | null} */
  #context = null;

  /** @type {HTMLCanvasElement} */
  #canvas;

  /** @type {MediaQueryList} */
  #mediaQueryList;

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
   * This method is called when the page is initialized.
   */
  start() {
    if (!this.#enabled) {
      return;
    }
    document.body.prepend(this.#canvas);

    // Redraw maze if the window changes width or height. "resize" events
    // include zoom on desktop (Brave, Ubuntu)--the number of CSS pixels
    // changes, which is interpreted as a change of size--but not mobile
    // (Brave, Android). To make mobile behavior match desktop, we could use
    // `VisualViewport.scale`, but I think it looks alright, and it might be
    // better not to interfere with the user's expectation of what zoom does by
    // default there.
    window.addEventListener("resize", this.#onResize);

    this.#reduceMotionQuery.addEventListener(
      "change",
      this.#onMotionPreferenceChange,
    );

    this.#armDprListener();
    this.restart();
  }

  /**
   * This method is called:
   *   - on initialization by `this.start` via `this.#onDprChange`;
   *   - when the user clicks to request a new maze;
   *   - when the window is resized;
   *   - and when when there's a change in motion preference.
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
   * This internal method prevents repeated calls to restart if neither the
   * dimensions nor `window.devicePixelRatio` have changed, e.g. due to an
   * occasional resize false positive or in case I ever accidentally call
   * `this.restart` directly and
   * either-directly-or-debounced-via-`this.#scheduleRestart` without any change
   * in between.
   *
   * @returns {void}
   */
  #restartIfLayoutChanged() {
    const dpr = window.devicePixelRatio;
    const width = this.#width(dpr);
    const height = this.#height(dpr);
    if (
      width === this.#canvas.width &&
      height === this.#canvas.height &&
      dpr === this.#lastDpr
    ) {
      return;
    }
    this.#lastDpr = dpr;
    this.restart();
  }

  /**
   * This internal method gets a fresh `MediaQueryList` so that we can handle a
   * change of `window.devicePixelRatio`, as might happen if the window is
   * dragged onto a different screen.
   *
   * @returns {void}
   */
  #armDprListener = () => {
    this.#mediaQueryList = window.matchMedia(
      `(resolution: ${window.devicePixelRatio}dppx)`,
    );
    this.#mediaQueryList.addEventListener("change", this.#onDprChange, {
      once: true,
    });
  };

  /**
   * Set up a fresh devicePixelRatio change listener, then schedule `restart`
   * via the debouncing path.
   *
   * @returns {void}
   */
  #onDprChange = () => {
    this.#armDprListener();
    this.#scheduleRestart();
  };

  /**
   * This internal method wraps `restart` to debounce it.
   *
   * @returns {void}
   */
  #scheduleRestart() {
    if (this.#restartTimer !== null) {
      window.clearTimeout(this.#restartTimer);
    }
    this.#restartTimer = window.setTimeout(() => {
      this.#restartTimer = null;
      this.#restartIfLayoutChanged();
    }, this.#restartDebounceMs);
  }

  #onResize = () => {
    this.#scheduleRestart();
  };

  #onMotionPreferenceChange = () => {
    this.restart();
  };

  #resizeCanvas() {
    const dpr = window.devicePixelRatio;
    this.#tileSize = this.#baseTileSize * dpr;
    this.#canvas.width = this.#width(dpr);
    this.#canvas.height = this.#height(dpr);
  }

  /**
   * This internal method returns the width of the maze in physical pixels.
   * (Note that dpr has already be factored into `this.#tileSize`.) The addition
   * of twice the tile size is so that we can hide the boundary walls offscreen.
   * The top edge of the canvas is positioned one tile above the top edge of the
   * window, and the left edge of the canvas one tile to the left of the window
   * edge. See the ruleset for `.maze` in `01-foundation.css`.
   *
   * @param {number} dpr window.devicePixelRatio
   * @returns {number}
   */
  #width(dpr) {
    return dpr * window.innerWidth + 2 * this.#tileSize;
  }

  /**
   * This internal method returns the height of the maze in physical pixels. See the
   * comment on `this.#width` (above) regarding `+ 2 * this.#tileSize`.
   *
   * @param {number} dpr window.devicePixelRatio
   * @returns {number}
   */
  #height(dpr) {
    return dpr * window.innerHeight + 2 * this.#tileSize;
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

    this.#paintWholeCanvasWallColor();
    this.#drawInstantCarves(0, this.#nextCarveIndex);
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
   * and to ensure that we use the correct color for the current theme. Compare `this.#getWallFillColor`.
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
    const cols = Math.max(7, Math.ceil(this.#canvas.width / this.#tileSize));
    const rows = Math.max(7, Math.ceil(this.#canvas.height / this.#tileSize));
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
    return pickRandomFrom(algorithms);
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
   */
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
