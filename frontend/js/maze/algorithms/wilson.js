import { createRng, pickRandomFrom, pickRandomNeighbor } from "../grid.js";
import { Room } from "../room.js";

/** @import { BuildCarvePlanOptions, CarvePlan, Tile } from "../grid.js" */

/**
 * Wilson's algorithm: add loop-erased random walks from unvisited rooms.
 * Appearance on screen: like Backtracker, but many paths appear at once.
 *
 * This function returns a {@link CarvePlan}. `maze.js` calls
 * `createIterator()` to obtain a generator; each yielded {@link Tile} is the
 * next cell to reveal. A fresh `createRng(seed)` is passed into the generator so
 * the same sequence can be replayed after a theme change.
 *
 * @param {BuildCarvePlanOptions} options
 * @returns {CarvePlan}
 */
export function buildCarvePlanWilson({ roomCols, roomRows, seed }) {
  return {
    iterativeStartIndex: 0,
    createIterator() {
      return carve({ roomCols, roomRows, rng: createRng(seed) });
    },
  };
}

/**
 * This generator performs the Wilson carve. It yields room tiles and passage
 * tiles in the order they should be revealed. Random choices use `rng` so that
 * replaying with the same `seed` reproduces the same maze.
 *
 * @param {BuildCarvePlanOptions & { rng: () => number }} options
 */
function* carve({ roomCols, roomRows, rng }) {
  /** @type {Array<Room>} */
  const allRooms = [];

  for (let y = 0; y < roomRows; y += 1) {
    for (let x = 0; x < roomCols; x += 1) {
      allRooms.push(new Room(x, y));
    }
  }

  /** @type {Set<string>} */
  const finalized = new Set();
  const initialRoom = Room.random(roomCols, roomRows, rng);
  finalized.add(initialRoom.toString());

  yield initialRoom.toTile();

  while (finalized.size < allRooms.length) {
    /** @type {Array<Room>} */
    const candidates = allRooms.filter(
      (room) => !finalized.has(room.toString()),
    );

    const startOfWalk = pickRandomFrom(candidates, rng);

    /** @type {Array<Room>} */
    const walk = [startOfWalk];

    /** @type {Map<string, number>} */
    const walkPositions = new Map([[startOfWalk.toString(), 0]]);

    /** @type {Room} */
    let current = startOfWalk;

    while (!finalized.has(current.toString())) {
      const next = pickRandomNeighbor(current, roomCols, roomRows, rng);
      const nextKey = next.toString();

      if (walkPositions.has(nextKey)) {
        /** @type {number} */
        const loopStart = walkPositions.get(nextKey);

        walk.splice(loopStart + 1);
        walkPositions.clear();
        for (let i = 0; i < walk.length; i += 1) {
          walkPositions.set(walk[i].toString(), i);
        }
      } else {
        walk.push(next);
        walkPositions.set(nextKey, walk.length - 1);
      }

      current = next;
    }

    for (let i = 0; i < walk.length - 1; i += 1) {
      const from = walk[i];
      const to = walk[i + 1];
      const fromKey = from.toString();

      if (!finalized.has(fromKey)) {
        finalized.add(fromKey);
        yield from.toTile();
      }
      yield from.passageTo(to);
    }
  }
}
