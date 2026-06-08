/**
 * CFOP OLL — orients the last layer (on D) so every D sticker shows yellow.
 *
 * Two-look OLL: first orient the last-layer edges (yellow cross on D), then
 * orient the corners with Sune/Antisune. Each phase is a small, bounded search
 * that composes the frame-mirrored generators with last-layer setups — both are
 * confined to the last layer and preserve the first two layers.
 *
 * The beginner orientation routine remains only as a final safety net.
 */

import { CubeState3x3, cloneState } from "../../../cube/model/state-3x3";
import { Move, parseMove } from "../../../cube/moves/notation";
import { applyMoves } from "../../../cube/moves/apply";
import { applySeq, applySeqExt, dTurns } from "../../common/apply-seq";
import { compress } from "../../common/optimize";
import { conjugateSearch } from "../../common/search";
import { solveCube } from "../../beginner/last-layer-corners";
import { solveLastLayerCross } from "../../beginner/last-layer-cross";
import { isF2LSolved } from "../f2l/detect";
import { EOLL_GENERATORS, OCLL_GENERATORS } from "./algorithms";
import { FULL_OLL } from "./full-algs";
import { isOLLSolved } from "./pattern";

/** True when all four last-layer edges are oriented (yellow on D). */
function edgesOriented(state: CubeState3x3): boolean {
  for (let i = 4; i <= 7; i++) if (state.eo[i] !== 0) return false;
  return true;
}

/**
 * One-look OLL: a single stored algorithm plus AUF that orients the last layer
 * while leaving the first two layers solved. Returns the shortest such match.
 */
function oneLook(state: CubeState3x3): Move[] | null {
  let best: Move[] | null = null;
  for (let pre = 0; pre < 4; pre++) {
    const setup = dTurns(pre).map(parseMove);
    for (const alg of FULL_OLL) {
      const moves = [...setup, ...alg];
      const result = applySeqExt(cloneState(state), moves);
      if (isF2LSolved(result) && isOLLSolved(result)) {
        if (best === null || moves.length < best.length) best = moves;
      }
    }
  }
  return best;
}

function ollFallback(state: CubeState3x3): Move[] {
  const cross = solveLastLayerCross(state);
  const s = applyMoves(cloneState(state), cross);
  if (isOLLSolved(s)) return cross;
  const rest = solveCube(s);
  return compress([...cross, ...rest]);
}

/** Orients the last layer in two looks (edges, then corners). */
export function solveOLL(state: CubeState3x3): Move[] {
  if (isOLLSolved(state)) return [];

  const one = oneLook(state);
  const oneCompressed = one ? compress(one) : null;

  let s = cloneState(state);
  const moves: string[] = [];

  if (!edgesOriented(s)) {
    const eo = conjugateSearch(s, EOLL_GENERATORS, edgesOriented, 2);
    if (eo) {
      moves.push(...eo);
      s = applySeq(s, eo);
    }
  }

  if (!isOLLSolved(s)) {
    const co = conjugateSearch(s, OCLL_GENERATORS, isOLLSolved, 3, moves);
    if (co) {
      moves.push(...co);
      s = applySeq(s, co);
    }
  }

  const twoLook = isOLLSolved(s) ? compress(moves.map(parseMove)) : null;

  // Prefer whichever of the one-look / two-look solutions is shorter.
  const candidates = [oneCompressed, twoLook].filter((c): c is Move[] => c !== null);
  if (candidates.length > 0) {
    return candidates.reduce((a, b) => (b.length < a.length ? b : a));
  }
  return ollFallback(state);
}

export { isOLLSolved } from "./pattern";
