import {
  getRoomNeighbors,
  passageBetweenRooms,
  pickRandomFrom,
  pickRandomRoom,
  roomToTile,
} from "../grid.js";

/** @import { CarvePlan, Room, Tile } from "../grid.js" */

/**
 * Depth-first backtracking: walk forward randomly until stuck, then backtrack.
 * Appearance: draws the maze in one long, winding path.
 *
 * @param {{ roomCols: number, roomRows: number }} options
 * @returns {CarvePlan}
 */
export function buildCarvePlanBacktracker({ roomCols, roomRows }) {
  /** @type {Array<Array<boolean>>} */
  const visited = Array.from({ length: roomRows }, () =>
    Array.from({ length: roomCols }, () => false),
  );

  /** @type {Array<Room>} */
  const stack = [];

  /** @type {Array<Tile>} */
  const carveOrder = [];

  /** @type {Room} */
  const startRoom = pickRandomRoom(roomCols, roomRows);

  stack.push(startRoom);
  visited[startRoom.y][startRoom.x] = true;
  carveOrder.push(roomToTile(startRoom));

  while (stack.length > 0) {
    /** @type {Room} */
    const current = stack[stack.length - 1];

    /** @type {Array<Room>} */
    const unvisitedNeighbors = getRoomNeighbors(
      current,
      roomCols,
      roomRows,
    ).filter((neighbor) => !visited[neighbor.y][neighbor.x]);

    if (unvisitedNeighbors.length === 0) {
      stack.pop();
      continue;
    }

    /** @type {Room} */
    const nextNeighbor = pickRandomFrom(unvisitedNeighbors);

    visited[nextNeighbor.y][nextNeighbor.x] = true;

    carveOrder.push(roomToTile(nextNeighbor));
    carveOrder.push(passageBetweenRooms(current, nextNeighbor));

    stack.push({ x: nextNeighbor.x, y: nextNeighbor.y });
  }

  return { tiles: carveOrder, iterativeStartIndex: 0 };
}
