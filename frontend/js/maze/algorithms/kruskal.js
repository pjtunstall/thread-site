import { createRng, randomIntBelow } from "../grid.js";
import { Room } from "../room.js";

/** @import { BuildCarvePlanOptions, CarvePlan, Tile, Wall } from "../grid.js" */

/**
 * Kruskal's algorithm: start with every `Room` already carved out, all
 * separated. Then consider adjoining walls in a random order, and remove a wall
 * only when the two rooms it separates still belong to different connected
 * components.
 *
 * Appearance on screen: a grid of detached rooms appears first, then passages
 * are revealed between them.
 *
 * This function returns a {@link CarvePlan} with `iterativeStartIndex` set to
 * the room count so `maze.js` can reveal every room tile instantly before
 * animating passage tiles. `createIterator()` yields each {@link Tile} in
 * reveal order; a fresh `createRng(seed)` inside `createIterator()` allows
 * theme replay.
 *
 * @param {BuildCarvePlanOptions} options
 * @returns {CarvePlan}
 */
export function buildCarvePlanKruskal({ roomCols, roomRows, seed }) {
  const roomCount = roomCols * roomRows;
  return {
    iterativeStartIndex: roomCount,
    createIterator() {
      return createIterator({ roomCols, roomRows, rng: createRng(seed) });
    },
  };
}

/**
 * This generator function creates an iterator for Kruskal's algorithm. It
 * yields every room tile first (row by row), then passage tiles for walls that
 * join two components. Wall order is shuffled with `rng`. Replaying with the
 * same `seed` reproduces the same maze.
 *
 * @param {BuildCarvePlanOptions & { rng: () => number }} options
 */
function* createIterator({ roomCols, roomRows, rng }) {
  const roomCount = roomCols * roomRows;

  /** @type {Array<number>} */
  const parents = Array.from({ length: roomCount }, (_, i) => i);

  /** @type {Array<number>} */
  const ranks = Array.from({ length: roomCount }, () => 0);

  /** @type {Array<Wall>} */
  const walls = [];

  for (let y = 0; y < roomRows; y += 1) {
    for (let x = 0; x < roomCols; x += 1) {
      const room = new Room(x, y);
      yield room.toTile();

      if (x + 1 < roomCols) {
        walls.push({
          from: new Room(x, y),
          to: new Room(x + 1, y),
        });
      }
      if (y + 1 < roomRows) {
        walls.push({
          from: new Room(x, y),
          to: new Room(x, y + 1),
        });
      }
    }
  }

  shuffleInPlace(walls, rng);

  for (const wall of walls) {
    const fromIndex = wall.from.index(roomCols);
    const toIndex = wall.to.index(roomCols);

    const fromRoot = findSetRoot(parents, fromIndex);
    const toRoot = findSetRoot(parents, toIndex);

    if (fromRoot === toRoot) {
      continue;
    }

    yield wall.from.passageTo(wall.to);
    unionSets(parents, ranks, fromRoot, toRoot);
  }
}

/**
 * This function randomizes `items` in place using the Fisher-Yates shuffle.
 * Order depends on `rng` so that the same seed produces the same wall sequence.
 *
 * @template T
 * @param {Array<T>} items
 * @param {() => number} rng returns a value in [0, 1) on each call
 */
function shuffleInPlace(items, rng) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = randomIntBelow(rng, i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
}

/**
 * This function returns the root of the set containing `index`. It recursively
 * follows parent pointers until `parents[r] === r`, and path-compresses on the
 * way back to speed up later lookups.
 *
 * @param {Array<number>} parents Parent pointers.
 * @param {number} index `Room` index whose set root is needed.
 * @returns {number} Root index of that set.
 */
function findSetRoot(parents, index) {
  if (parents[index] !== index) {
    parents[index] = findSetRoot(parents, parents[index]);
  }
  return parents[index];
}

/**
 * This function joins the two sets whose roots are `a` and `b`. Whichever root
 * has the greater rank becomes the parent of the other. If the ranks are equal,
 * `a` becomes the parent and its rank is incremented by one.
 *
 * @param {Array<number>} parents Parent-pointer forest (mutated).
 * @param {Array<number>} rank Approximate tree depths per root (mutated).
 * @param {number} a Root index of one set.
 * @param {number} b Root index of the other set.
 */
function unionSets(parents, rank, a, b) {
  if (a === b) {
    return;
  }
  if (rank[a] < rank[b]) {
    parents[a] = b;
    return;
  }
  if (rank[a] > rank[b]) {
    parents[b] = a;
    return;
  }
  parents[b] = a;
  rank[a] += 1;
}
