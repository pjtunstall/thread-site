import { Room } from "../room.js";

/** @import { CarvePlan, Tile, Wall } from "../grid.js" */

/**
 * Kruskal's algorithm: Start with the `Rooms` already carved out, all
 * separated. Then iterate through their adjoining walls in a random order, and,
 * at each step, remove the wall if and only if the two `Rooms` that the wall
 * separates still belong to unconnected sets of `Rooms`.
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

  // We use the union-find data structure to represent collection of
  // disconnected sets. It has two operatons: union and find. See the functions
  // `setUnion` and `findSetRoot` below.

  // Each `Room` starts out as its own parent. As the connected
  // components get
  // bigger, we'll use follow the chain from parent to parent of parent and so
  // on till we come to the set "root".
  /** @type {Array<number>} */
  const parents = Array.from({ length: roomCount }, (_, i) => i);

  // Each `Room` starts with rank 0. As we join separate sets of `Room`s, we'll
  // use rank to decide which of their roots will be the parent of the other,
  // and hence the root of the union.
  /** @type {Array<number>} */
  const ranks = Array.from({ length: roomCount }, () => 0);

  /** @type {Array<Wall>} */
  const walls = [];

  // Add all the `Wall`s to the `walls` array.
  for (let y = 0; y < roomRows; y += 1) {
    for (let x = 0; x < roomCols; x += 1) {
      const room = new Room(x, y);

      // Along the way, we assign this order to carve the `Room`s. The order
      // doesn't matter; they'll all appear intially already carved.
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

  // Randomize the order of the `Wall`s.
  shuffleInPlace(walls);

  for (const wall of walls) {
    const fromIndex = wall.from.index(roomCols);
    const toIndex = wall.to.index(roomCols);

    // Find the index of the "root" (representative element) of the connected
    // componnet that the "from" `Room` belongs to; likewise the "to" `Room`.
    const fromRoot = findSetRoot(parents, fromIndex);
    const toRoot = findSetRoot(parents, toIndex);

    // If they have the same root, they belong to the same connected component.
    // In that case, continue without removing the wall.
    if (fromRoot === toRoot) {
      continue;
    }

    // Otherwise, they belong to subsets that are still disconnected. Knock down
    // the wall ...
    carveOrder.push(wall.from.passageTo(wall.to));

    // ... and replace the two separate subsets with their union.
    unionSets(parents, ranks, fromRoot, toRoot);
  }

  return {
    tiles: carveOrder,
    iterativeStartIndex: roomCount,
  };
}

/**
 * Fisher-Yates shuffle: randomize array order in place.
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
 * This function returns the root of the set containing `index`. It recursively
 * follows parent pointers until `parent[r] === r`, and path-compresses on the
 * way back to speed up the search next time.
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
 * has the greater rank becomes the parent of the other. If their ranks are
 * equal, we choose `a` (passed as `fromRoot`) to be the parent and increment
 * its rank by one.
 *
 * @param {Array<number>} parents Parent-pointer forest (mutated).
 * @param {Array<number>} rank Approximate tree depths per root (mutated).
 * @param {number} a Root index of one set.
 * @param {number} b Root index of the other set.
 * @returns {void}
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
