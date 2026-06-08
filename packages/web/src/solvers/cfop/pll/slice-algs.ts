/**
 * Slice-based PLL algorithms (standard, last layer on top), translated into this
 * cube's LL-on-D frame.
 *
 * The M-slice edge permutations are dramatically shorter than their pure
 * outer-turn equivalents (e.g. the U-perms drop from ~11 turns to 7), so the
 * one-look PLL pass prefers them whenever they apply. They are tried as extra
 * candidates alongside the outer-move algorithm set; the solver picks whichever
 * valid algorithm is shortest.
 */

import { Move } from "../../../cube/moves/notation";
import { toFrame } from "../last-layer/frame";

/** Textbook M-slice PLLs that beat their outer-turn counterparts on move count. */
const STANDARD_SLICE_PLL: readonly string[] = [
  "M2 U M U2 M' U M2", // Ua
  "M2 U' M U2 M' U' M2", // Ub
  "M2 U M2 U2 M2 U M2", // H
  "M' U M2 U M2 U M' U2 M2", // Z
  "M2 U M2 U M' U2 M2 U2 M'", // Z (mirror)
];

export const SLICE_PLL: Move[][] = STANDARD_SLICE_PLL.map(toFrame);
