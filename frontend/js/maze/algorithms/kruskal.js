import { Room } from "../room.js";

/** @import { CarvePlan, Tile, Wall } from "../grid.js" */

/**
 * Kruskal's algorithm: treat rooms as disjoint sets and carve walls that join
 * sets.
 *
 * Appearance: starts with a grid of detached rooms, then carves out passages
 * between them.
 *
 * @param {{ roomCols: number, roomRows: number }} options
 * @returns {CarvePlan}
 */
export function buildCarvePlanKruskal({ roomCols, roomRows }) {
  /** @type {Array<Tile>} */
  const carveOrder = [];

  const roomCount = roomCols * roomRows;

  /** @type {Array<number>} */
  const parent = Array.from({ length: roomCount }, (_, i) => i);

  /** @type {Array<number>} */
  const rank = Array.from({ length: roomCount }, () => 0);

  /** @type {Array<Wall>} */
  const walls = [];

  for (let y = 0; y < roomRows; y += 1) {
    for (let x = 0; x < roomCols; x += 1) {
      const room = new Room(x, y);
      carveOrder.push(room.toTile());

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

  shuffleInPlace(walls);

  for (const wall of walls) {
    const fromIndex = wall.from.index(roomCols);
    const toIndex = wall.to.index(roomCols);

    /** @type {number} */
    const fromRoot = findSetRoot(parent, fromIndex);
    const toRoot = findSetRoot(parent, toIndex);

    if (fromRoot === toRoot) {
      continue;
    }

    unionSets(parent, rank, fromRoot, toRoot);
    carveOrder.push(wall.from.passageTo(wall.to));
  }

  return {
    tiles: carveOrder,
    iterativeStartIndex: roomCount,
  };
}

/**
 * Fisher–Yates shuffle: randomize array order in place.
 *
 * @template T
 * @param {Array<T>} items
 * @returns {void}
 */
function shuffleInPlace(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

/**
 * Union–find: return the root of the set containing `index`. Follows parent
 * pointers until `parent[r] === r`; path-compresses on the way back.
 *
 * @param {Array<number>} parent Parent pointers; `parent[i]` is i's parent (i
 * if i is a root).
 * @param {number} index Room index whose set root is needed.
 * @returns {number} Root index of that set.
 */
function findSetRoot(parent, index) {
  if (parent[index] !== index) {
    parent[index] = findSetRoot(parent, parent[index]);
  }
  return parent[index];
}

/**
 * Union–find: merge the two sets whose roots are `a` and `b` (union by rank).
 * Attaches one root under the other via `parent`; no-op if `a === b`.
 *
 * @param {Array<number>} parent Parent-pointer forest (mutated).
 * @param {Array<number>} rank Approximate tree depths per root (mutated).
 * @param {number} a Root index of one set.
 * @param {number} b Root index of the other set.
 * @returns {void}
 */
function unionSets(parent, rank, a, b) {
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
