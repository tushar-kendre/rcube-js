/**
 * Safe move-sequence compression.
 *
 * Collapses redundant turns without changing the net permutation:
 *   - merges turns of the same face (`F F` -> `F2`, `F F F` -> `F'`, `F2 F2` -> drop),
 *   - cancels inverses (`R R'` -> drop),
 *   - sees through intervening turns on the same axis, since those commute
 *     (e.g. `D F D'` is left alone, but `D F2 D` -> `D2 F2`).
 *
 * Only outer-layer (layer 1) face turns are produced by the solvers, but layer
 * is respected so wide/inner moves are never merged incorrectly.
 */

import { Face } from "../../cube/model/faces";
import { Move } from "../../cube/moves/notation";

const AXIS: Record<Face, "x" | "y" | "z"> = {
  R: "x",
  L: "x",
  U: "y",
  D: "y",
  F: "z",
  B: "z",
};

const isFace = (m: Move): boolean => (m.kind ?? "face") === "face";

function sameTurn(a: Move, b: Move): boolean {
  return (
    (a.kind ?? "face") === (b.kind ?? "face") &&
    a.face === b.face &&
    a.layer === b.layer &&
    (a.width ?? 0) === (b.width ?? 0)
  );
}

/** Returns an equivalent, shorter move sequence. */
export function compress(moves: Move[]): Move[] {
  const arr = moves.map((m) => ({ ...m }));

  let changed = true;
  while (changed) {
    changed = false;

    for (let i = 0; i < arr.length; i++) {
      // Only plain face turns may merge across intervening same-axis turns
      // (they commute). Slice/wide/rotation moves merge only when adjacent to an
      // identical turn, never seeing through other moves.
      let j = i + 1;
      if (isFace(arr[i])) {
        const axis = AXIS[arr[i].face];
        while (
          j < arr.length &&
          isFace(arr[j]) &&
          AXIS[arr[j].face] === axis &&
          !sameTurn(arr[j], arr[i])
        ) {
          j++;
        }
      }
      if (j >= arr.length || !sameTurn(arr[j], arr[i])) continue;

      const total = ((arr[i].amount + arr[j].amount) % 4) as 0 | 1 | 2 | 3;
      arr.splice(j, 1);
      if (total === 0) {
        arr.splice(i, 1);
      } else {
        arr[i] = { ...arr[i], amount: total };
      }
      changed = true;
      break;
    }
  }

  return arr;
}
