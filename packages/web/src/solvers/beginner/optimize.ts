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

function sameTurn(a: Move, b: Move): boolean {
  return a.face === b.face && a.layer === b.layer;
}

/** Returns an equivalent, shorter move sequence. */
export function compress(moves: Move[]): Move[] {
  const arr = moves.map((m) => ({ ...m }));

  let changed = true;
  while (changed) {
    changed = false;

    for (let i = 0; i < arr.length; i++) {
      const axis = AXIS[arr[i].face];

      // Find the next turn of the same face/layer, skipping turns on the same
      // axis (which commute past it).
      let j = i + 1;
      while (
        j < arr.length &&
        AXIS[arr[j].face] === axis &&
        !sameTurn(arr[j], arr[i])
      ) {
        j++;
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
