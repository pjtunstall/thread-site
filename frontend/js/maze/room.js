export class Room {
  x; // Coordinates in the coarse grid, consisting only of `Room`s.
  y;

  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * This static method returns a random `Room`, given the dimensions of the
   * (coarse) grid of `Room`s.
   *
   * @param {number} roomCols
   * @param {number} roomRows
   * @returns {Room}
   */
  static random(roomCols, roomRows) {
    const x = Math.floor(Math.random() * roomCols);
    const y = Math.floor(Math.random() * roomRows);
    return new Room(x, y);
  }

  /**
   * This method returns the `Tile` on the fine grid that corresponds to this
   * `Room` on the coarse grid.
   *
   * @returns {Tile}
   */
  toTile() {
    return { x: this.x * 2 + 1, y: this.y * 2 + 1 };
  }

  /**
   * This function stringifies a `Room`. It's used make a key for a `Map` or
   * `Set`. We don't use the `Room` itself as a key because JavaScript objects
   * are really references to the underlying data. Any other object, even a
   * `Room` with the same shape and the same `x` and `y` values, would
   * constitute a different reference, making it inconvenient to look up a value
   * in the `Map` or `Set`. Strings, on the other hand, give value-based
   * identity.
   *
   * @param {Room} room
   * @returns {string}
   */
  toString() {
    return `${this.x},${this.y}`;
  }

  /**
   * Flat room index, row-major style.
   *
   * @param {number} roomCols
   * @returns {number}
   */
  index(roomCols) {
    return this.y * roomCols + this.x;
  }

  /**
   * This method returns a fine-grid `Tile` for the passage between two adjacent
   * rooms: from this `Room` to the parameter `Room` labeled `to`.
   *
   * @param {Room} to
   * @returns {Tile}
   */
  passageTo(to) {
    if (
      (to.x - this.x) * (to.x - this.x) !== 1 &&
      (to.y - this.y) * (to.y - this.y) !== 1
    ) {
      throw new Error(
        `Can't find a passage between ${this.toString()} and ${to.toString()}`,
      );
    }

    const fromTile = this.toTile();
    return {
      x: fromTile.x + (to.x - this.x),
      y: fromTile.y + (to.y - this.y),
    };
  }

  /**
   * @param {number} roomCols
   * @param {number} roomRows
   * @returns {Array<Room>}
   */
  neighboringRooms(roomCols, roomRows) {
    const directions = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
    const neighbors = [];

    for (const direction of directions) {
      const nextX = this.x + direction.dx;
      const nextY = this.y + direction.dy;
      if (nextX < 0 || nextX >= roomCols) continue;
      if (nextY < 0 || nextY >= roomRows) continue;
      neighbors.push(new Room(nextX, nextY));
    }

    return neighbors;
  }
}
