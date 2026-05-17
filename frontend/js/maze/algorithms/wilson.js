import {
  getRoomNeighbors,
  passageBetweenRooms,
  pickRandomFrom,
  roomKey,
  roomToTile,
} from "../grid.js";

/** @import { CarvePlan, Room, Tile } from "../grid.js" */

/**
 * Wilson's algorithm: add loop-erased random walks from unvisited rooms.
 * Appearance: like Backtracker, but draws many paths simultaneously.
 *
 * @param {{ roomCols: number, roomRows: number }} options
 * @returns {CarvePlan}
 */
export function buildCarvePlanWilson({ roomCols, roomRows }) {
  /** @type {Array<Room>} */
  const allRooms = [];

  for (let y = 0; y < roomRows; y += 1) {
    for (let x = 0; x < roomCols; x += 1) {
      allRooms.push({ x, y });
    }
  }

  /** @type {Set<string>} */
  const finalized = new Set();

  /** @type {Array<Tile>} */
  const carveOrder = [];

  const initialRoom = pickRandomFrom(allRooms);

  finalized.add(roomKey(initialRoom));
  carveOrder.push(roomToTile(initialRoom));

  while (finalized.size < allRooms.length) {
    /** @type {Array<Room>} */
    const candidates = allRooms.filter((room) => !finalized.has(roomKey(room)));

    /** @type {Room} */
    const startOfWalk = pickRandomFrom(candidates);

    /** @type {Array<Room>} */
    const walk = [startOfWalk];

    /** @type {Map<string, number>} */
    const walkPositions = new Map([[roomKey(startOfWalk), 0]]);

    /** @type {Room} */
    let current = startOfWalk;

    while (!finalized.has(roomKey(current))) {
      const next = pickRandomFrom(
        getRoomNeighbors(current, roomCols, roomRows),
      );
      const nextKey = roomKey(next);

      if (walkPositions.has(nextKey)) {
        /** @type {number} */
        const loopStart = walkPositions.get(nextKey);

        walk.splice(loopStart + 1);
        walkPositions.clear();
        for (let i = 0; i < walk.length; i += 1) {
          walkPositions.set(roomKey(walk[i]), i);
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
      const fromKey = roomKey(from);

      if (!finalized.has(fromKey)) {
        finalized.add(fromKey);
        carveOrder.push(roomToTile(from));
      }
      carveOrder.push(passageBetweenRooms(from, to));
    }
  }

  return { tiles: carveOrder, iterativeStartIndex: 0 };
}
