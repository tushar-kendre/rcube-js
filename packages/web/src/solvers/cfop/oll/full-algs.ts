/**
 * One-look OLL algorithm set (standard, last layer on top), translated into this
 * cube's LL-on-D frame.
 *
 * These are the well-known ergonomic OLLs — many built on wide turns (`Rw`/`Fw`)
 * and the `M` slice, which is exactly what makes single-algorithm orientation
 * short. The OLL solver tries them as a one-look pass before falling back to the
 * two-look (edges then corners) routine. As with PLL, each candidate is accepted
 * only after simulation confirms it orients the last layer while leaving the
 * first two layers intact, so a mistranslated algorithm is simply skipped.
 */

import { createSolvedState } from "../../../cube/model/state-3x3";
import { Move } from "../../../cube/moves/notation";
import { toFrame } from "../last-layer/frame";
import { applySeqExt } from "../../common/apply-seq";
import { isF2LSolved } from "../f2l/detect";
import { isOLLSolved } from "./pattern";

/**
 * Textbook OLL algorithms, numbered by their standard case. Wide turns are
 * written `Rw`/`Fw`/`Lw`; the `M` slice appears in the shortest forms (28, 57).
 * Any entry that does not translate cleanly into this frame is dropped at module
 * load by `keepValid`, so the list is allowed to be generous.
 */
const STANDARD_OLL: readonly string[] = [
  "R U2 R2 F R F' U2 R' F R F'", // 1
  "F R U R' U' F' Fw R U R' U' Fw'", // 2
  "Fw R U R' U' Fw' U' F R U R' U' F'", // 3
  "Fw R U R' U' Fw' U F R U R' U' F'", // 4
  "Rw' U2 R U R' U Rw", // 5
  "Rw U2 R' U' R U' Rw'", // 6
  "Rw U R' U R U2 Rw'", // 7
  "Rw' U' R U' R' U2 Rw", // 8
  "R U R' U' R' F R2 U R' U' F'", // 9
  "R U R' U R' F R F' R U2 R'", // 10
  "Rw U R' U R' F R F' R U2 Rw'", // 11
  "F R U R' U' F' U F R U R' U' F'", // 12
  "F U R U' R2 F' R U R U' R'", // 13
  "R' F R U R' F' R F U' F'", // 14
  "Rw' U' Rw R' U' R U Rw' U Rw", // 15
  "Rw U Rw' R U R' U' Rw U' Rw'", // 16
  "F R' F' R2 Rw' U R U' R' U' M'", // 17
  "Rw U R' U R U2 Rw2 U' R U' R' U2 Rw", // 18
  "Rw' R U R U R' U' Rw R2 F R F'", // 19
  "Rw U R' U' M2 U R U' R' U' M'", // 20
  "R U2 R' U' R U R' U' R U' R'", // 21
  "R U2 R2 U' R2 U' R2 U2 R", // 22
  "R2 D' R U2 R' D R U2 R", // 23
  "Rw U R' U' Rw' F R F'", // 24
  "F' Rw U R' U' Rw' F R", // 25
  "R U2 R' U' R U' R'", // 26
  "R U R' U R U2 R'", // 27
  "Rw U R' U' Rw' R U R U' R'", // 28
  "M U R U R' U' R' F R F' M'", // 29
  "F R' F R2 U' R' U' R U R' F2", // 30
  "R' U' F U R U' R' F' R", // 31
  "R U B' U' R' U R B R'", // 32
  "R U R' U' R' F R F'", // 33
  "R U R2 U' R' F R U R U' F'", // 34
  "R U2 R2 F R F' R U2 R'", // 35
  "Lw' U' L U' L' U L U Lw", // 36
  "F R' F' R U R U' R'", // 37
  "R U R' U R U' R' U' R' F R F'", // 38
  "L F' L' U' L U F U' L'", // 39
  "R' F R U R' U' F' U R", // 40
  "R U R' U R U2 R' F R U R' U' F'", // 41
  "R' U' R U' R' U2 R F R U R' U' F'", // 42
  "Fw' L' U' L U Fw", // 43
  "Fw R U R' U' Fw'", // 44
  "F R U R' U' F'", // 45
  "R' U' R' F R F' U R", // 46
  "F' L' U' L U L' U' L U F", // 47
  "F R U R' U' R U R' U' F'", // 48
  "Rw U' Rw2 U Rw2 U Rw2 U' Rw", // 49
  "Rw' U Rw2 U' Rw2 U' Rw2 U Rw'", // 50
  "Fw R U R' U' R U R' U' Fw'", // 51
  "R U R' U R U' B U' B' R'", // 52
  "Rw' U' R U' R' U R U' R' U2 Rw", // 53
  "Rw U R' U R U' R' U R U2 Rw'", // 54
  "R U2 R2 U' R U' R' U2 F R F'", // 55
  "Rw U Rw' U R U' R' U R U' R' Rw U' Rw'", // 56
  "R U R' U' M' U R U' Rw'", // 57
];

/**
 * A translated algorithm is genuine OLL iff, applied to a solved cube, it keeps
 * the first two layers intact (it only disorients the last layer). Anything else
 * is a translation artifact and is discarded.
 */
function keepValid(alg: Move[]): boolean {
  const r = applySeqExt(createSolvedState(), alg);
  return isF2LSolved(r) && !isOLLSolved(r);
}

export const FULL_OLL: Move[][] = STANDARD_OLL.map(toFrame).filter(keepValid);
