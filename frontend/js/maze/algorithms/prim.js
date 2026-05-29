import { createRng, pickRandomFrom } from "../grid.js";
import { Room } from "../room.js";
import { Wall } from "../wall.js";

/** @import { BuildCarvePlanOptions, CarvePlan, Tile } from "../grid.js" */

/**
 * Prim's algorithm: grow a tree by carving random frontier walls outward.
 * Appearance on screen: the maze expands in all directions.
 *
 * This function returns a {@link CarvePlan}. `maze.js` calls
 * `createIterator()` to obtain a generator; each yielded {@link Tile} is the
 * next cell to reveal. A fresh `createRng(seed)` is passed into the generator so
 * the same sequence can be replayed after a theme change.
 *
 * @param {BuildCarvePlanOptions} options
 * @returns {CarvePlan}
 */
export function buildCarvePlanPrim({ roomCols, roomRows, seed }) {
  return {
    iterativeStartIndex: 0,
    createIterator() {
      return createIterator({ roomCols, roomRows, rng: createRng(seed) });
    },
  };
}

/**
 * This generator function returns an iterator for the Prim algorithm. It yields
 * passage tiles and room tiles in the order they should be revealed. Random
 * choices use `rng` so that replaying with the same `seed` reproduces the same
 * maze.
 *
 * @param {BuildCarvePlanOptions & { rng: () => number }} options
 */
function* createIterator({ roomCols, roomRows, rng }) {
  /** @type {Set<string>} */
  const visited = new Set();

  /** @type {Map<string, Wall>} */
  const frontier = new Map();

  const initialRoom = Room.random(roomCols, roomRows, rng);

  visited.add(initialRoom.toString());
  yield initialRoom.toTile();
  addFrontierWalls(initialRoom, roomCols, roomRows, frontier, visited);

  while (frontier.size > 0) {
    const wallKeyValue = pickRandomFrom(Array.from(frontier.keys()), rng);
    const wall = frontier.get(wallKeyValue);

    frontier.delete(wallKeyValue);

    const fromVisited = visited.has(wall.from.toString());
    const toVisited = visited.has(wall.to.toString());

    if (fromVisited === toVisited) {
      continue;
    }

    const newRoom = fromVisited ? wall.to : wall.from;
    visited.add(newRoom.toString());
    yield wall.from.passageTo(wall.to);
    yield newRoom.toTile();
    addFrontierWalls(newRoom, roomCols, roomRows, frontier, visited);
  }
}

/**
 * This function adds to `frontier` every wall between `room` and a neighboring
 * room that is not yet visited. The frontier is the set of walls Prim may
 * choose to remove next.
 *
 * @param {import("../room.js").Room} room
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
    const wall = new Wall(room, neighbor);
    frontier.set(wall.toString(), wall);
  }
}
