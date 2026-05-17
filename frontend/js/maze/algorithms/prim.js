import {
  getRoomNeighbors,
  passageBetweenRooms,
  pickRandomFrom,
  pickRandomRoom,
  roomKey,
  roomToTile,
} from "../grid.js";

/** @import { CarvePlan, Room, Tile, Wall } from "../grid.js" */

/**
 * Prim's algorithm: grow a tree by carving random frontier walls outward.
 * Appearance: expands in all directions.
 *
 * @param {{ roomCols: number, roomRows: number }} options
 * @returns {CarvePlan}
 */
export function buildCarvePlanPrim({ roomCols, roomRows }) {
  /** @type {Array<Tile>} */
  const carveOrder = [];

  /** @type {Set<string>} */
  const visited = new Set();

  /** @type {Map<string, Wall>} */
  const frontier = new Map();

  const initialRoom = pickRandomRoom(roomCols, roomRows);

  visited.add(roomKey(initialRoom));
  carveOrder.push(roomToTile(initialRoom));
  addFrontierWalls(initialRoom, roomCols, roomRows, frontier, visited);

  while (frontier.size > 0) {
    /** @type {string} */
    const wallKeyValue = pickRandomFrom(Array.from(frontier.keys()));
    const wall = frontier.get(wallKeyValue);

    frontier.delete(wallKeyValue);

    /** @type {boolean} */
    const fromVisited = visited.has(roomKey(wall.from));
    const toVisited = visited.has(roomKey(wall.to));

    if (fromVisited === toVisited) {
      continue;
    }

    const newRoom = fromVisited ? wall.to : wall.from;
    visited.add(roomKey(newRoom));
    carveOrder.push(passageBetweenRooms(wall.from, wall.to));
    carveOrder.push(roomToTile(newRoom));
    addFrontierWalls(newRoom, roomCols, roomRows, frontier, visited);
  }

  return { tiles: carveOrder, iterativeStartIndex: 0 };
}

/**
 *
 * @param {Room} a
 * @param {Room} b
 * @returns {Wall}
 */
function normalizeWall(a, b) {
  if (a.y < b.y || (a.y === b.y && a.x <= b.x)) {
    return { from: a, to: b };
  }
  return { from: b, to: a };
}

/**
 *
 * @param {Wall} wall
 * @returns {string}
 */
function wallKey(wall) {
  return `${roomKey(wall.from)},${roomKey(wall.to)}`;
}

/**
 *
 * @param {Room} room
 * @param {number} roomCols
 * @param {number} roomRows
 * @param {Map<string, Wall>} frontier
 * @param {Set<string>} visited
 */
function addFrontierWalls(room, roomCols, roomRows, frontier, visited) {
  const neighbors = getRoomNeighbors(room, roomCols, roomRows);
  for (const neighbor of neighbors) {
    if (visited.has(roomKey(neighbor))) {
      continue;
    }
    const wall = normalizeWall(room, neighbor);
    frontier.set(wallKey(wall), wall);
  }
}
