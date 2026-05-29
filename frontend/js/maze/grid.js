/**
 * @typedef {import('./room.js').Room} Room { x: number, y: number }
 * @typedef {import('./wall.js').Wall} Wall { from: Room, t: Room }
 * @typedef {{ x: number, y: number }} Tile
 *
 * We define a coarse grid of {@link Room}s (`roomCols` × `roomRows`) and a fine
 * grid of {@link Tile}s (`tileCols` x `tileRows`, always odd). See the
 * `#buildCarvePlan` method of `Maze` in `maze.js`.
 *
 * Algorithms visit rooms and carve out passages between them. We define a
 * {@link Wall} as a link between `Room`s.
 *
 * Rendering clears a sequence of tiles, correspondig to rooms and passages
 * between them. A tile may be a room `Tile` (always carved), a wall `Tile`
 * (which either stays as a wall or is eventually carved to become a passage),
 * or a pillar `Tile` (never carved).
 *
 * @typedef {() => Iterator<Tile>} CarveIteratorFactory
 *
 * @typedef {{
 *   createIterator: CarveIteratorFactory,
 *   iterativeStartIndex: number,
 * }} CarvePlan
 *
 * @typedef {{
 *   roomCols: number,
 *   roomRows: number,
 *   seed: number,
 * }} BuildCarvePlanOptions
 *
 * There are several maze-generating algorithms. They each return a
 * {@link CarvePlan}: a factory for an iterator of `Tile`s to carve, plus how
 * many yields to draw instantly before animation (Kruskal).
 *
 * Room `Tile` have both coordinates odd, pillar `Tile`s both even. A horizontal
 * wall `Tile` (east/west wall or passage between rooms) has `x` even and `y`
 * odd; a vertical wall `Tile` has `x` even and `y` odd.
 *
 * `Room` is implemented as a class in `room.js`. It has `x` and `y`
 * coordinates, representing its position in the coarse grid.
 *
 * `Wall`, in `wall.js` is implemented as a class with `from` and `to` fields,
 * each being a `Room`.
 *
 * `iterativeStartIndex` is how many iterator yields to carve instantly at the
 * start, e.g. for Kruskal.
 */

/**
 * @template T
 * @param {Array<T>} items
 * @param {() => number} [rng] returns a value in [0, 1) on each call; defaults to `Math.random`
 * @returns {T}
 */
export function pickRandomFrom(items, rng = Math.random) {
  if (items.length === 0) {
    throw new Error("pickRandomFrom: items must not be empty");
  }
  return items[randomIntBelow(rng, items.length)];
}

/**
 * @param {Room} room
 * @param {number} roomCols
 * @param {number} roomRows
 * @param {() => number} rng returns a value in [0, 1) on each call
 * @returns {Room}
 */
export function pickRandomNeighbor(room, roomCols, roomRows, rng) {
  return pickRandomFrom(room.neighboringRooms(roomCols, roomRows), rng);
}

/**
 * A random non-negative integer, strictly below `upperBound`.
 *
 * @param {() => number} rng returns a value in [0, 1) on each call
 * @param {number} upperBound exclusive upper bound (must be positive)
 * @returns {number}
 */
export function randomIntBelow(rng, upperBound) {
  return Math.floor(rng() * upperBound);
}

/**
 * @returns {number} 32-bit seed for {@link createRng}
 */
export function createRngSeed() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0] | 0;
}

/**
 * A factory function that returns a seedable pseudorandom number generator using
 * the mulberry32 algorithm. We need a seed so that already-drawn cells can be
 * redrawn in the new color scheme if the theme changes while the animation is
 * in progress.
 *
 * @param {number} seed
 * @returns {() => number} returns a value in [0, 1) on each call
 */
export function createRng(seed) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}
