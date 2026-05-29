import { pickRandomFrom } from "../grid.js";
import { Room } from "../room.js";

/** @import { CarvePlan, Tile } from "../grid.js" */

/**
 * Depth-first backtracking: walk forward randomly until stuck, then backtrack.
 * Appearance: draws the maze in one long, winding path.
 *
 * @param {{ roomCols: number, roomRows: number }} options
 * @returns {CarvePlan}
 */
export function buildCarvePlanBacktracker({ roomCols, roomRows }) {
  /** @type {Array<boolean>} */
  const visited = Array(roomCols * roomRows).fill(false);

  /** @type {Array<Room>} */
  const stack = [];

  /** @type {Array<Tile>} */
  const carveOrder = [];

  /** @type {Room} */
  const startRoom = Room.random(roomCols, roomRows);

  stack.push(startRoom);
  visited[startRoom.y * roomCols + startRoom.x] = true;
  carveOrder.push(startRoom.toTile());

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

    /** @type {Room} */
    const nextNeighbor = pickRandomFrom(unvisitedNeighbors);

    visited[nextNeighbor.y * roomCols + nextNeighbor.x] = true;

    carveOrder.push(nextNeighbor.toTile());
    carveOrder.push(current.passageTo(nextNeighbor));

    stack.push(new Room(nextNeighbor.x, nextNeighbor.y)); // What if we just push nextNeighbor? Would that prevent freeing of the `unvisitedNeighbors` array?
  }

  return { tiles: carveOrder, iterativeStartIndex: 0 };
}
