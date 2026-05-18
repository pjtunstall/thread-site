import { pickRandomFrom } from "../grid.js";
import { Room } from "../room.js";

/** @import { CarvePlan, Tile } from "../grid.js" */

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
      allRooms.push(new Room(x, y));
    }
  }

  /** @type {Set<string>} */
  const finalized = new Set();

  /** @type {Array<Tile>} */
  const carveOrder = [];

  const initialRoom = Room.random(roomCols, roomRows);

  finalized.add(initialRoom.toString());
  carveOrder.push(initialRoom.toTile());

  while (finalized.size < allRooms.length) {
    /** @type {Array<Room>} */
    const candidates = allRooms.filter(
      (room) => !finalized.has(room.toString()),
    );

    /** @type {Room} */
    const startOfWalk = pickRandomFrom(candidates);

    /** @type {Array<Room>} */
    const walk = [startOfWalk];

    /** @type {Map<string, number>} */
    const walkPositions = new Map([[startOfWalk.toString(), 0]]);

    /** @type {Room} */
    let current = startOfWalk;

    while (!finalized.has(current.toString())) {
      const next = pickRandomFrom(current.neighboringRooms(roomCols, roomRows));
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
        carveOrder.push(from.toTile());
      }
      carveOrder.push(from.passageTo(to));
    }
  }

  return { tiles: carveOrder, iterativeStartIndex: 0 };
}
