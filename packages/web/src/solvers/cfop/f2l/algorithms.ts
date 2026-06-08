/**
 * Standard CFOP F2L case algorithms, written in the textbook frame:
 *   - white cross on the BOTTOM (D), pair inserted from the free TOP (U) layer,
 *   - the reference slot is front-right (corner DFR, edge FR),
 *   - every algorithm uses only the slot's two side faces (R, F) and the free
 *     layer (U).
 *
 * This codebase keeps the white cross on U with the free layer on D — the
 * vertical mirror of the textbook. `solve.ts` mirrors each algorithm into that
 * frame (U<->D, every turn inverted) and substitutes the slot's faces, so the
 * one reference list below drives all four slots deterministically.
 *
 * The pair is solved by trying every case (with the four free-layer setups) and
 * picking, by simulation, the shortest one that finishes the slot — no tree
 * search. The list is intentionally broad: extra or imperfect entries only cost
 * a slightly longer solution for a case, never correctness.
 */
export const STANDARD_F2L: readonly (readonly string[])[] = [
  // Connected pair already aligned — insert directly.
  ["R", "U", "R'"],
  ["R", "U'", "R'"],
  ["R", "U2", "R'"],
  ["F'", "U'", "F"],
  ["F'", "U", "F"],
  ["F'", "U2", "F"],

  // Corner in the free layer, edge in the free layer — basic separated cases.
  ["U", "R", "U'", "R'"],
  ["U'", "R", "U", "R'"],
  ["U2", "R", "U", "R'"],
  ["U2", "R", "U'", "R'"],
  ["U'", "F'", "U", "F"],
  ["U", "F'", "U'", "F"],
  ["U2", "F'", "U'", "F"],
  ["U2", "F'", "U", "F"],
  ["U", "R", "U2", "R'"],
  ["U'", "R", "U2", "R'"],
  ["U", "F'", "U2", "F"],
  ["U'", "F'", "U2", "F"],

  // Rebuild / re-pair (corner correct twist, edge needs to swing around).
  ["R", "U'", "R'", "U", "R", "U'", "R'"],
  ["R", "U", "R'", "U'", "R", "U", "R'"],
  ["R", "U2", "R'", "U'", "R", "U", "R'"],
  ["R", "U'", "R'", "U2", "R", "U'", "R'"],
  ["R", "U", "R'", "U2", "R", "U", "R'"],
  ["R", "U2", "R'", "U", "R", "U'", "R'"],
  ["R", "U'", "R'", "U", "R", "U2", "R'"],
  ["R", "U'", "R'", "U'", "R", "U", "R'"],
  ["F'", "U", "F", "U'", "F'", "U'", "F"],
  ["F'", "U'", "F", "U", "F'", "U'", "F"],
  ["F'", "U2", "F", "U'", "F'", "U'", "F"],
  ["F'", "U", "F", "U2", "F'", "U", "F"],
  ["F'", "U'", "F", "U2", "F'", "U'", "F"],

  // Split pairs that mix both side faces.
  ["R", "U'", "R'", "F'", "U'", "F"],
  ["F'", "U", "F", "R", "U", "R'"],
  ["R", "U", "R'", "U'", "F'", "U'", "F"],
  ["F'", "U'", "F", "U", "R", "U", "R'"],
  ["R", "U'", "R'", "U'", "F'", "U'", "F"],
  ["F'", "U", "F", "U", "R", "U", "R'"],
  ["R", "U", "R'", "U", "F'", "U'", "F"],
  ["U'", "R", "U'", "R'", "U", "R", "U", "R'"],
  ["U", "F'", "U", "F", "U'", "F'", "U'", "F"],
  ["U'", "R", "U", "R'", "U", "R", "U'", "R'"],
  ["U", "F'", "U'", "F", "U'", "F'", "U", "F"],

  // Pieces stuck in the slot (wrong corner twist and/or flipped edge).
  ["R", "U'", "R'", "U", "R", "U2", "R'", "U", "R", "U'", "R'"],
  ["R", "U'", "R'", "U'", "R", "U", "R'", "U'", "R", "U2", "R'"],
  ["R", "U", "R'", "U'", "R", "U", "R'", "U'", "R", "U", "R'"],
  ["R", "U'", "R'", "U'", "R", "U'", "R'", "U", "R", "U", "R'"],
  ["F'", "U", "F", "U", "F'", "U'", "F"],
  ["R", "U", "R'", "U2", "R", "U'", "R'", "U", "R", "U'", "R'"],
];
