/**
 * Conjugates standard last-layer-on-top algorithms into this cube's frame, where
 * the last layer is on D.
 *
 * A standard algorithm assumes the last layer is on U. Wrapping it in `x2 … x2`
 * brings the D layer up, runs the algorithm, and tilts back — a net-identity
 * reorientation. `foldRotations` then rewrites that into an equivalent sequence
 * with the rotations removed (so move counts are not inflated), conjugating each
 * turn through the reorientation. Slice and wide moves survive the rewrite, so
 * standard ergonomic algorithms can be authored once in textbook notation.
 *
 * Correctness never depends on this transform being perfect: the PLL/OLL solvers
 * accept an algorithm only after simulating it, so a mistranslated candidate is
 * simply ignored rather than producing a wrong solve.
 */

import { Move, parseSequence } from "../../../cube/moves/notation";
import { foldRotations } from "../../../cube/moves/resolve";

/** Translates a textbook (last-layer-on-U) algorithm into this LL-on-D frame. */
export function toFrame(standard: string): Move[] {
  return foldRotations(parseSequence(`x2 ${standard} x2`));
}
