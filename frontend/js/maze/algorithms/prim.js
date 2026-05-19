import { pickRandomFrom } from "../grid.js";
import { Room } from "../room.js";

/** @import { CarvePlan, Tile, Wall } from "../grid.js" */

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

  const initialRoom = Room.random(roomCols, roomRows);

  visited.add(initialRoom.toString());
  carveOrder.push(initialRoom.toTile());
  addFrontierWalls(initialRoom, roomCols, roomRows, frontier, visited);

  while (frontier.size > 0) {
    /** @type {string} */
    const wallKeyValue = pickRandomFrom(Array.from(frontier.keys()));
    const wall = frontier.get(wallKeyValue);

    frontier.delete(wallKeyValue);

    /** @type {boolean} */
    const fromVisited = visited.has(wall.from.toString());
    const toVisited = visited.has(wall.to.toString());

    if (fromVisited === toVisited) {
      continue;
    }

    const newRoom = fromVisited ? wall.to : wall.from;
    visited.add(newRoom.toString());
    carveOrder.push(wall.from.passageTo(wall.to));
    carveOrder.push(newRoom.toTile());
    addFrontierWalls(newRoom, roomCols, roomRows, frontier, visited);
  }

  return { tiles: carveOrder, iterativeStartIndex: 0 };
}

/**
 * Return `{ from, to }` with stable ordering for use as map keys.
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
 * @param {Wall} wall
 * @returns {string}
 */
function wallKey(wall) {
  return `${wall.from.toString()},${wall.to.toString()}`;
}

/**
 * @param {Room} room
 * @param {number} roomCols
 * @param {number} roomRows
 * @param {Map<string, Wall>} frontier
 * @param {Set<string>} visited
 */
function addFrontierWalls(room, roomCols, roomRows, frontier, visited) {
  const neighbors = room.neighboringRooms(roomCols, roomRows);
  for (const neighbor of neighbors) {
    if (visited.has(neighbor.toString())) {
      continue;
    }
    const wall = normalizeWall(room, neighbor);
    frontier.set(wallKey(wall), wall);
  }
}
