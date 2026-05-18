/**
 * We define a coarse grid of {@link Room}s (`roomCols` × `roomRows`) and a fine
 * grid of {@link Tile}s (`tileCols` × `tileRows`, always odd).
 *
 * Algorithms visit rooms and carve out passages between them. We define a
 * {@link Wall} as a link between `Room`s.
 *
 * Rendering clears a sequence of tiles, correspondig to rooms and passages
 * between them. A tile may be a room `Tile` (always carved), a wall `Tile`
 * (which either stays as a wall or is eventually carved to become a passage),
 * or a pillar `Tile` (never carved).
 *
 * There are several maze-generating algorithms. They each return a
 * {@link CarvePlan}, consisting of the `Tile`s to be carved.
 *
 * Room `Tile` have both coordinates odd, pillar `Tile`s both even. A horizontal
 * wall `Tile` (east/west wall or passage between rooms) has `x` even and `y`
 * odd; a vertical wall `Tile` has `x` even and `y` odd.
 *
 * `Room` is implemented as a class in `room.js`. It has `x` and `y`
 * coordinates, representing its position in the coarse grid.
 *
 * @typedef {{ from: Room, to: Room }} Wall
 * @typedef {{ x: number, y: number }} Tile
 *
 * `tiles` contains the `Tile`s to be carved, `iterativeStartIndex` is the index
 * of `tiles` from which the animation will be drawn iteratively in case we want
 * some of the `Tile`s to be carved instantly at the start, e.g. for Kruskal.
 * @typedef {{ tiles: Array<Tile>, iterativeStartIndex: number }} CarvePlan
 */

/**
 * @template T
 * @param {Array<T>} items
 * @returns {T}
 */
export function pickRandomFrom(items) {
  return items[Math.floor(Math.random() * items.length)];
}
