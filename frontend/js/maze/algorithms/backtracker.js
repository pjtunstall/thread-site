import { createRng, pickRandomFrom } from "../grid.js";
import { Room } from "../room.js";

/** @import { BuildCarvePlanOptions, CarvePlan, Tile } from "../grid.js" */

/**
 * Depth-first backtracking: walk forward randomly until stuck, then backtrack.
 * Appearance on screen: the maze is revealed in one long, winding path.
 *
 * This function returns a {@link CarvePlan}. `maze.js` calls
 * `createIterator()` to obtain a generator; each yielded {@link Tile} is the
 * next cell to reveal. A fresh `createRng(seed)` is passed into the generator so
 * the same sequence can be replayed after a theme change.
 *
 * @param {BuildCarvePlanOptions} options
 * @returns {CarvePlan}
 */
export function buildCarvePlanBacktracker({ roomCols, roomRows, seed }) {
  return {
    iterativeStartIndex: 0,
    createIterator() {
      return carve({ roomCols, roomRows, rng: createRng(seed) });
    },
  };
}

/**
 * This generator performs the backtracker carve. It yields room tiles and
 * passage tiles in the order they should be revealed. Random choices use
 * `rng` so that replaying with the same `seed` reproduces the same maze.
 *
 * @param {BuildCarvePlanOptions & { rng: () => number }} options
 */
function* carve({ roomCols, roomRows, rng }) {
  /** @type {Array<boolean>} */
  const visited = Array(roomCols * roomRows).fill(false);

  /** @type {Array<Room>} */
  const stack = [];

  const startRoom = Room.random(roomCols, roomRows, rng);

  stack.push(startRoom);
  visited[startRoom.y * roomCols + startRoom.x] = true;
  yield startRoom.toTile();

  while (stack.length > 0) {
    /** @type {Room} */
    const current = stack[stack.length - 1];

    /** @type {Array<Room>} */
    const unvisitedNeighbors = current
      .neighboringRooms(roomCols, roomRows)
      .filter((neighbor) => !visited[neighbor.y * roomCols + neighbor.x]);

    if (unvisitedNeighbors.length === 0) {
      stack.pop();
      continue;
    }

    const nextNeighbor = pickRandomFrom(unvisitedNeighbors, rng);

    visited[nextNeighbor.y * roomCols + nextNeighbor.x] = true;

    yield nextNeighbor.toTile();
    yield current.passageTo(nextNeighbor);

    stack.push(new Room(nextNeighbor.x, nextNeighbor.y));
  }
}
