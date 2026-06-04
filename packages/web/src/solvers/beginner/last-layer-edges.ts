/**
 * Beginner-method last-layer edge permutation ("align the cross with centers").
 *
 * Assumes the first two layers are solved and the last-layer (D) cross is
 * oriented (all four D edges show yellow on the bottom). This step spins the
 * four cross edges into the slots where their side sticker matches the adjacent
 * center.
 *
 * It uses one classic edge 3-cycle, the vertical mirror of the U-perm
 * (last layer on the bottom):
 *
 *   R' D R' D' R' D' R' D R D R2
 *
 * which cycles three D edges (DR -> DF -> DL) and leaves the corners and all
 * orientations untouched. As a human would, we apply it from the right D setup
 * and repeat until every edge matches its center. The correct setup each round
 * is found by trying the four D rotations of this one algorithm, not by
 * searching cube states.
 *
 * Half of all post-cross states have an odd edge permutation, which a 3-cycle
 * alone (an even permutation) can never fix. Including the free D quarter turn
 * (an odd 4-cycle) in the setups supplies that missing parity, so all four
 * edges can always be aligned. In those odd cases the net D turn also shifts
 * two corners — harmless here, since the corners are solved in the next step.
 */

import { stateToVisual } from "../../cube/convert/visual";
import { CUBE_FACE_TO_FACE, Face, FACE_COLOR } from "../../cube/model/faces";
import { applyMove } from "../../cube/moves/apply";
import { CubeState3x3, cloneState } from "../../cube/model/state-3x3";
import { Move, parseMove } from "../../cube/moves/notation";
import { compress } from "./optimize";
import { isLastLayerCrossSolved, solveThroughLastLayerCross } from "./last-layer-cross";

const YELLOW = "yellow";

/** The mirrored U-perm: a pure 3-cycle of three D-layer edges. */
const CYCLE_EDGES = ["R'", "D", "R'", "D'", "R'", "D'", "R'", "D", "R", "D", "R2"];

function applySeq(state: CubeState3x3, moves: string[]): CubeState3x3 {
  let s = state;
  for (const m of moves) s = applyMove(s, parseMove(m));
  return s;
}

/** Notation for `k` clockwise quarter turns of D (0..3). */
function dTurns(k: number): string[] {
  const n = ((k % 4) + 4) % 4;
  if (n === 0) return [];
  if (n === 1) return ["D"];
  if (n === 2) return ["D2"];
  return ["D'"];
}

/** Number of last-layer edges whose side sticker matches its center. */
function alignedEdges(state: CubeState3x3): number {
  const visual = stateToVisual(state);
  let count = 0;
  for (const cubie of visual.cubies) {
    const faces = Object.keys(cubie.stickerColors);
    if (faces.length !== 2) continue; // edges only
    if (!("bottom" in cubie.stickerColors)) continue; // D-layer edges only
    if (cubie.stickerColors.bottom !== YELLOW) continue; // must stay oriented
    const sideFace = faces.find((f) => f !== "bottom") as keyof typeof CUBE_FACE_TO_FACE;
    const face = CUBE_FACE_TO_FACE[sideFace] as Face;
    if (cubie.stickerColors[sideFace] === FACE_COLOR[face]) count++;
  }
  return count;
}

/** True when all four last-layer edges are oriented and matched to centers. */
export function isLastLayerEdgesSolved(state: CubeState3x3): boolean {
  return isLastLayerCrossSolved(state) && alignedEdges(state) === 4;
}

/**
 * Finds the shortest chain of `[D setup, 3-cycle]` rounds (plus a final D
 * adjustment) that aligns all four edges, by iterative deepening over the four
 * D setups.
 */
function findAlignChain(state: CubeState3x3, depth: number): string[] | null {
  for (let j = 0; j < 4; j++) {
    const auf = dTurns(j);
    if (alignedEdges(applySeq(state, auf)) === 4) return auf;
  }
  if (depth === 0) return null;
  for (let k = 0; k < 4; k++) {
    const step = [...dTurns(k), ...CYCLE_EDGES];
    const rest = findAlignChain(applySeq(state, step), depth - 1);
    if (rest) return [...step, ...rest];
  }
  return null;
}

/**
 * Aligns the four last-layer cross edges with their centers, assuming the cross
 * is already oriented. Returns the moves used; the input state is not mutated.
 */
export function solveLastLayerEdges(state: CubeState3x3): Move[] {
  const s = cloneState(state);
  for (let depth = 0; depth <= 8; depth++) {
    const chain = findAlignChain(s, depth);
    if (chain) return compress(chain.map(parseMove));
  }
  throw new Error("Last-layer edge alignment did not converge");
}

/**
 * Solves through the last-layer edges: first two layers, the yellow cross, then
 * aligns the cross edges with the centers. Returns the full move sequence; the
 * input is not mutated.
 */
export function solveThroughLastLayerEdges(state: CubeState3x3): Move[] {
  const throughCross = solveThroughLastLayerCross(state);
  const afterCross = throughCross.reduce((acc, move) => applyMove(acc, move), cloneState(state));
  const edges = solveLastLayerEdges(afterCross);
  return compress([...throughCross, ...edges]);
}
