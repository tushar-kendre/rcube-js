import { applyMoves } from "../../cube/moves/apply";
import { applySeqExt } from "../common/apply-seq";
import { CubeState3x3, cloneState } from "../../cube/model/state-3x3";
import { Move } from "../../cube/moves/notation";
import { isSolved } from "../../cube/validate/solved";
import { compress } from "../common/optimize";
import { solveCube } from "../beginner/last-layer-corners";
import { solveWhiteCross } from "../beginner/white-cross";
import { solveF2L } from "./f2l/solve";
import { solveOLL } from "./oll/solve";
import { solvePLL } from "./pll/solve";

/** Full CFOP solve: cross → F2L → OLL → PLL. Input is not mutated. */
export function solveCubeCFOP(state: CubeState3x3): Move[] {
  const cross = solveWhiteCross(state);
  let s = applyMoves(cloneState(state), cross);

  const f2l = solveF2L(s);
  s = applySeqExt(s, f2l);

  const oll = solveOLL(s);
  s = applySeqExt(s, oll);

  const pll = solvePLL(s);
  const moves = compress([...cross, ...f2l, ...oll, ...pll]);

  const result = applySeqExt(cloneState(state), moves);
  if (!isSolved(result)) {
    return solveCube(state);
  }
  return moves;
}

export { isCubeSolved } from "../beginner/last-layer-corners";
