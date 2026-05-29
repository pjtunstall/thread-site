/**
 * Animated maze background. Uses a coarse grid of {@link Room}s for generation
 * and a fine grid of {@link Tile}s for drawing; see `grid.js` and `room.js`.
 * The whole canvas starts out wall-colored (CSS `--color-ink-wall`).
 * Maze-generating algorithm functions, `buildCarvePlanBacktracker` etc. return
 * a {@link CarvePlan}: a seeded iterator of tiles to open. This class carves
 * them on the canvas (by painting them with CSS `--color-bg`), all at once when
 * the user prefers reduced motion, or step by step otherwise.
 */
import { buildCarvePlanBacktracker } from "./algorithms/backtracker.js";
import { buildCarvePlanKruskal } from "./algorithms/kruskal.js";
import { buildCarvePlanPrim } from "./algorithms/prim.js";
import { buildCarvePlanWilson } from "./algorithms/wilson.js";
import { createRngSeed, pickRandomFrom } from "./grid.js";

/** @import { BuildCarvePlanOptions, CarvePlan, Tile } from "./grid.js" */

/** @typedef {(options: BuildCarvePlanOptions) => CarvePlan} BuildCarvePlan */

export class Maze {
  #baseTileSize = 12; // pixels
  #tileSize = 12; // We'll multiply this by devicePixelRatio.
  #restartDebounceMs = 220;
  #lastDpr = 1;

  #tilesPerMs = 32 / (1000 / 60); // Animation speed: 32 per 16.67ms frame.

  // Live {@link CarvePlan} iterator: each `next()` yields a {@link Tile} to carve.
  /** @type {Iterator<Tile> | null} */
  #tileIterator = null;

  // Some algorithms (Kruskal) carve an initial batch before animation starts.
  // `iterativeStartIndex` is how many tiles to carve in that first batch.
  #iterativeStartIndex = 0;

  // How many tiles have been carved so far (including any initial batch).
  #tilesCarved = 0;

  #seed = 0;
  #roomCols = 0;
  #roomRows = 0;

  /** @type {BuildCarvePlan | null} */
  #buildCarvePlan = null;

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
    this.#beginCarve();
    this.#lastStepAt = 0;
    this.#paintWholeCanvasWallColor();

    if (this.#reduceMotionQuery.matches) {
      this.#carveTiles(this.#tileIterator, Number.POSITIVE_INFINITY, {
        advanceProgress: true,
      });
      return;
    }

    this.#carveTiles(this.#tileIterator, this.#iterativeStartIndex, {
      advanceProgress: true,
    });
    this.#frameRequest = window.requestAnimationFrame(this.#onTick);
  }

  /**
   * This internal method prevents repeated calls to restart if neither the
   * dimensions nor `window.devicePixelRatio` have changed, e.g. due to an
   * occasional resize false positive or in case I ever accidentally call
   * `this.restart` directly and (either directly or debounced) via
   * `this.#scheduleRestart` without any change in between.
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
   * document and repaints every tile carved so far. `this.#enabled` implies
   * `this.#context` is correctly defined.
   *
   * @returns {void}
   */
  repaintPartialMazeAfterThemeToggle() {
    if (
      !this.#enabled ||
      this.#tilesCarved === 0 ||
      this.#buildCarvePlan === null
    ) {
      return;
    }

    this.#paintWholeCanvasWallColor();

    const newTileIterator = this.#createTileIterator();
    const { finished } = this.#carveTiles(newTileIterator, this.#tilesCarved, {
      advanceProgress: false,
    });

    if (this.#frameRequest !== null && !finished) {
      this.#tileIterator = newTileIterator;
    } else {
      this.#tileIterator = null;
    }
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
   * and to ensure that we use the correct color for the current theme. Compare
   * `this.#getWallFillColor`.
   *
   * @returns {string}
   */
  #getBackgroundFillColor() {
    return getComputedStyle(document.documentElement)
      .getPropertyValue("--color-bg")
      .trim();
  }

  /**
   * This internal method fills the whole canvas with the wall color. It is used
   * at the start of `this.restart` and before repainting carved tiles on theme
   * change.
   */
  #paintWholeCanvasWallColor() {
    this.#context.fillStyle = this.#getWallFillColor();
    this.#context.fillRect(0, 0, this.#canvas.width, this.#canvas.height);
  }

  /**
   * This internal method picks a new seed and maze algorithm, then opens a
   * fresh tile iterator from the returned {@link CarvePlan}.
   *
   * @returns {void}
   */
  #beginCarve() {
    const cols = Math.max(7, Math.ceil(this.#canvas.width / this.#tileSize));
    const rows = Math.max(7, Math.ceil(this.#canvas.height / this.#tileSize));
    const tileCols = cols % 2 === 0 ? cols + 1 : cols;
    const tileRows = rows % 2 === 0 ? rows + 1 : rows;
    this.#roomCols = Math.floor((tileCols - 1) / 2);
    this.#roomRows = Math.floor((tileRows - 1) / 2);
    this.#seed = createRngSeed();
    this.#buildCarvePlan = this.#pickMazeGenerator();
    const carvePlan = this.#buildCarvePlan({
      roomCols: this.#roomCols,
      roomRows: this.#roomRows,
      seed: this.#seed,
    });
    this.#iterativeStartIndex = carvePlan.iterativeStartIndex;
    this.#tilesCarved = 0;
    this.#tileIterator = carvePlan.createIterator();
  }

  /**
   * This internal method builds a new iterator from the current algorithm, grid
   * size, and seed. It is used to create a new iterator with the same random
   * seed after a theme change so that tiles already carved can be repainted
   * in the new color scheme, and the animation can continue from the point it
   * reached before the theme toggle.
   *
   * @returns {Iterator<Tile>}
   */
  #createTileIterator() {
    if (this.#buildCarvePlan === null) {
      throw new Error("[maze] No carve-plan builder is set.");
    }
    return this.#buildCarvePlan({
      roomCols: this.#roomCols,
      roomRows: this.#roomRows,
      seed: this.#seed,
    }).createIterator();
  }

  /**
   * @returns {BuildCarvePlan}
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
   * This internal method pulls up to `count` tiles from `iterator`, painting
   * each one with the background color. With `advanceProgress: true`, it uses
   * `#tileIterator`, increments `#tilesCarved`, and clears `#tileIterator` when
   * the carve plan is exhausted. With `advanceProgress: false` (replay after
   * theme-toggle), it only repaints without advancing `#tilesCarved`.
   *
   * @param {Iterator<Tile> | null} iterator
   * @param {number} count
   * @param {{ advanceProgress?: boolean }} [options]
   * @returns {{ consumed: number, finished: boolean }}
   */
  #carveTiles(iterator, count, { advanceProgress = false } = {}) {
    if (count <= 0) {
      return { consumed: 0, finished: false };
    }

    const activeIterator = advanceProgress ? this.#tileIterator : iterator;
    if (activeIterator === null) {
      return { consumed: 0, finished: true };
    }

    this.#context.fillStyle = this.#getBackgroundFillColor();
    let consumed = 0;

    while (consumed < count) {
      const { value, done } = activeIterator.next();
      if (done) {
        if (advanceProgress) {
          this.#tilesCarved += consumed;
          this.#tileIterator = null;
        }
        return { consumed, finished: true };
      }
      this.#paintCarvedTile(value);
      consumed += 1;
    }

    if (advanceProgress) {
      this.#tilesCarved += consumed;
    }

    return { consumed, finished: false };
  }

  /**
   * This internal method paints one carved tile on the canvas (a single
   * background-colored square). It is called from `#carveTiles`.
   *
   * @param {Tile} tile
   */
  #paintCarvedTile(tile) {
    this.#context.fillRect(
      tile.x * this.#tileSize,
      tile.y * this.#tileSize,
      this.#tileSize,
      this.#tileSize,
    );
  }

  /**
   * This internal method is passed as a callback to
   * `window.requestAnimationFrame`, initially in `this.restart`. Each frame it
   * carves further tiles via `#carveTiles` (`advanceProgress: true`), at the
   * rate `this.#tilesPerMs`. When `#tileIterator` is exhausted, it cancels the
   * animation frame request.
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
      const { finished } = this.#carveTiles(
        this.#tileIterator,
        howManyTilesToCarveThisFrame,
        { advanceProgress: true },
      );
      if (finished) {
        window.cancelAnimationFrame(this.#frameRequest);
        this.#frameRequest = null;
      }
    }
  };
}
