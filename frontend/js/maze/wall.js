export class Wall {
  /** @type {Room} */
  from;

  /** @type {Room} */
  to;

  /**
   * Returns a `Wall` between the given pair of `Room`s, normalized so that its
   * `from` < `to` in "dictionary order".
   *
   * @param {Room} a
   * @param {Room} b
   *
   * @returns {Wall}
   */
  constructor(a, b) {
    if (a.y < b.y || (a.y === b.y && a.x <= b.x)) {
      this.from = a;
      this.to = b;
    } else {
      this.from = b;
      this.to = a;
    }
  }

  /**
   * This function stringifies a `Wall`. It can be used make a key for a `Map`
   * or `Set`. We can't use the `Wall` itself as a key because JavaScript
   * objects are really references to the underlying data. Any other object,
   * even a `Wall` with the same the same `from` and `to` values, would
   * constitute a different reference, making comparison and look-up
   * inconvenient. Strings are fine because they give value-based identity.
   *
   * @returns {string}
   */
  toString() {
    return `${this.from.toString()},${this.to.toString()}`;
  }
}
