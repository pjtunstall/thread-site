/**
 * We define a coarse grid of {@link Room}s (`roomCols` × `roomRows`) and a fine
 * grid of {@link Tile}s (`tileCols` × `tileRows`, always odd).
 *
 * Algorithms visit rooms and carve out passages between them. We define a
 * {@link Wall} as a link between `Room`s.
 *
 * Rendering clears a sequence of tiles, correspondig to rooms and passages
 * between them. A tile may be a room `Tile` (always carved), a wall `Tile` (which
 * either stays as a wall or is eventually carved to become a passage), or a
 * pillar `Tile` (never carved).
 *
 * There are several maze-generating algorithms. They each return a
 * {@link CarvePlan}, consisting of the `Tile`s to be carved.
 *
 * Room `Tile` have both coordinates odd, pillar `Tile`s both even. A horizontal
 * wall `Tile` (east/west wall or passage between rooms) has `x` even and `y`
 * odd; a vertical wall `Tile` has `x` even and `y` odd.
 *
 * @typedef {{ x: number, y: number }} Room
 * @typedef {{ from: Room, to: Room }} Wall
 * @typedef {{ x: number, y: number }} Tile
 *
 * `tiles` contains the `Tile`s to be carved, `iterativeStartIndex` is the index
 * of `tiles` from which the animation will be drawn iteratively in case we want
 * some of the `Tile`s to be carved instantly at the start, e.g. for Kruskal.
 * @typedef {{ tiles: Array<Tile>, iterativeStartIndex: number }} CarvePlan
 */

/**
 *
 * @param {number} roomCols
 * @param {number} roomRows
 * @returns {Room}
 */
export function pickRandomRoom(roomCols, roomRows) {
  return {
    x: Math.floor(Math.random() * roomCols),
    y: Math.floor(Math.random() * roomRows),
  };
}

/**
 * @template T
 * @param {Array<T>} items
 * @returns {T}
 */
export function pickRandomFrom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Map a room on the coarse grid to its center tile on the fine grid.
 *
 * @param {Room} room
 * @returns {Tile}
 */
export function roomToTile(room) {
  return { x: room.x * 2 + 1, y: room.y * 2 + 1 };
}

/**
 *
 * @param {Room} room
 * @returns {string}
 */
export function roomKey(room) {
  return `${room.x},${room.y}`;
}

/**
 * Fine-grid tile for the passage between two adjacent rooms.
 *
 * @param {Room} from
 * @param {Room} to
 * @returns {Tile}
 */
export function passageBetweenRooms(from, to) {
  const fromTile = roomToTile(from);
  return {
    x: fromTile.x + (to.x - from.x),
    y: fromTile.y + (to.y - from.y),
  };
}

/**
 *
 * @param {Room} room
 * @param {number} roomCols
 * @param {number} roomRows
 * @returns {Array<Room>}
 */
export function getRoomNeighbors(room, roomCols, roomRows) {
  const directions = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];
  const neighbors = [];

  for (const direction of directions) {
    const nextX = room.x + direction.dx;
    const nextY = room.y + direction.dy;
    if (nextX < 0 || nextX >= roomCols) continue;
    if (nextY < 0 || nextY >= roomRows) continue;
    neighbors.push({ x: nextX, y: nextY });
  }

  return neighbors;
}
