/**
 * CFOP PLL — permutes the oriented last layer (on D).
 *
 * Algorithms are stored in the textbook frame (last layer on U; see
 * `algorithms.ts`). This cube keeps the last layer on D — the vertical mirror of
 * the textbook — so each algorithm is mirrored into this frame, which for these
 * outer-move algorithms reduces to inverting every turn (the face is unchanged).
 *
 * Recognition is by simulation, so it is correct by construction:
 *
 *   1. Fast path (one look): if a single stored permutation algorithm plus AUF
 *      solves the cube, use it.
 *   2. Otherwise two looks: permute the corners with a corner 3-cycle (A-perm),
 *      then permute the edges with an edge 3-cycle (U-perm). Both phases are
 *      small bounded searches over frame-mirrored generators wrapped in
 *      last-layer setups, including bare AUF turns so any final alignment is
 *      reachable.
 *
 * The beginner last-layer routine remains only as a final safety net.
 */

import { CubeState3x3, cloneState } from "../../../cube/model/state-3x3";
import { Move, parseMove } from "../../../cube/moves/notation";
import { applySeq, applySeqExt, dTurns } from "../../common/apply-seq";
import { compress } from "../../common/optimize";
import { conjugateSearch } from "../../common/search";
import { isCubeSolved, solveCube } from "../../beginner/last-layer-corners";
import { PLL_ALGORITHMS, PLL_CASE_IDS } from "./algorithms";
import { SLICE_PLL } from "./slice-algs";

const TOKEN = /^([UDLRFB])(2|')?$/;

/** Mirrors a textbook (last-layer-on-U) token into this frame: inverts the turn. */
function mirrorToken(tok: string): string {
  const m = tok.match(TOKEN);
  if (!m) throw new Error(`Bad PLL token: ${tok}`);
  const amount = m[2] === "2" ? "2" : m[2] === "'" ? "" : "'";
  return m[1] + amount;
}

const mirror = (alg: readonly string[]) => alg.map(mirrorToken);

const FRAME_PLL: string[][] = PLL_CASE_IDS.map((id) => mirror(PLL_ALGORITHMS[id]));

/** One-look candidates: outer-move algorithms plus shorter slice variants. */
const ONE_LOOK_CANDIDATES: Move[][] = [
  ...FRAME_PLL.map((alg) => alg.map(parseMove)),
  ...SLICE_PLL,
];

/** Pure corner 3-cycles and edge 3-cycles, the two-look building blocks. */
const CORNER_CYCLES = [mirror(PLL_ALGORITHMS.Aa), mirror(PLL_ALGORITHMS.Ab)];
const EDGE_CYCLES = [mirror(PLL_ALGORITHMS.Ua), mirror(PLL_ALGORITHMS.Ub)];
const AUF: string[][] = [["D"], ["D2"], ["D'"]];

/** True when the four last-layer corners sit in their solved slots. */
function cornersPositioned(state: CubeState3x3): boolean {
  for (let i = 4; i <= 7; i++) if (state.cp[i] !== i) return false;
  return true;
}

/** One-look PLL: a single stored algorithm plus AUF that solves the cube. */
function oneLook(state: CubeState3x3): Move[] | null {
  let best: Move[] | null = null;
  for (let pre = 0; pre < 4; pre++) {
    const setup = dTurns(pre).map(parseMove);
    for (const alg of ONE_LOOK_CANDIDATES) {
      for (let post = 0; post < 4; post++) {
        const moves = [...setup, ...alg, ...dTurns(post).map(parseMove)];
        if (isCubeSolved(applySeqExt(cloneState(state), moves))) {
          if (best === null || moves.length < best.length) best = moves;
        }
      }
    }
  }
  return best;
}

/** Two-look PLL: position corners, then permute edges. */
function twoLook(state: CubeState3x3): string[] | null {
  const moves: string[] = [];
  let s = cloneState(state);

  if (!cornersPositioned(s)) {
    const corners = conjugateSearch(s, [...CORNER_CYCLES, ...AUF], cornersPositioned, 3);
    if (!corners) return null;
    moves.push(...corners);
    s = applySeq(s, corners);
  }

  if (!isCubeSolved(s)) {
    const edges = conjugateSearch(s, [...EDGE_CYCLES, ...AUF], isCubeSolved, 3, moves);
    if (!edges) return null;
    moves.push(...edges);
    s = applySeq(s, edges);
  }

  return isCubeSolved(s) ? moves : null;
}

/** Permutes the oriented last layer (21-case PLL). */
export function solvePLL(state: CubeState3x3): Move[] {
  if (isCubeSolved(state)) return [];

  const one = oneLook(state);
  if (one) return compress(one);

  const two = twoLook(state);
  if (two) return compress(two.map(parseMove));

  return solveCube(state);
}

export { isCubeSolved } from "../../beginner/last-layer-corners";
