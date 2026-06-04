/**
 * Beginner-method last-layer cross (edge orientation).
 *
 * Assumes the first two layers are solved. The last layer is the D face
 * (yellow on the bottom), so we orient its four edges until yellow faces down.
 *
 * This uses the single classic algorithm `F R U R' U' F'`. Because the last
 * layer is on the bottom here (not the top as in the usual diagrams), we apply
 * its vertical mirror:
 *
 *   F' R' D' R D F
 *
 * The algorithm preserves the first two layers and only affects the last layer.
 * It walks the standard progression dot -> (line | L) -> cross. As a human
 * would, we apply it from the right D setup and repeat until the cross appears
 * (at most three applications); the correct setup each round is found by trying
 * the four D rotations of this one algorithm, not by searching cube states.
 */

import { stateToVisual } from "../../cube/convert/visual";
import { applyMove } from "../../cube/moves/apply";
import { CubeState3x3, cloneState } from "../../cube/model/state-3x3";
import { Move, parseMove } from "../../cube/moves/notation";
import { compress } from "./optimize";
import { isSecondLayerSolved, solveTwoLayers } from "./second-layer";

const YELLOW = "yellow";

/** The mirrored `F R U R' U' F'` for a last layer on the bottom. */
const ORIENT_EDGES = ["F'", "R'", "D'", "R", "D", "F"];

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

/** Number of last-layer edges whose yellow sticker faces down. */
function orientedEdges(state: CubeState3x3): number {
  const visual = stateToVisual(state);
  let count = 0;
  for (const cubie of visual.cubies) {
    const colors = cubie.stickerColors;
    const faces = Object.keys(colors);
    if (faces.length !== 2) continue; // edges only
    if (!("bottom" in colors)) continue; // D-layer edges only
    if (colors.bottom === YELLOW) count++;
  }
  return count;
}

/** True when all four last-layer edges show yellow on the bottom. */
export function isLastLayerCrossSolved(state: CubeState3x3): boolean {
  return isSecondLayerSolved(state) && orientedEdges(state) === 4;
}

/**
 * Orients the last-layer edges into the yellow cross, assuming the first two
 * layers are solved. Returns the moves used; the input state is not mutated.
 */
/**
 * Finds the shortest chain of `[D setup, algorithm]` rounds that reaches the
 * cross, by iterative deepening over the four D setups (max ~3 rounds needed).
 */
function findCrossChain(state: CubeState3x3, depth: number): string[] | null {
  if (orientedEdges(state) === 4) return [];
  if (depth === 0) return null;
  for (let k = 0; k < 4; k++) {
    const step = [...dTurns(k), ...ORIENT_EDGES];
    const rest = findCrossChain(applySeq(state, step), depth - 1);
    if (rest) return [...step, ...rest];
  }
  return null;
}

export function solveLastLayerCross(state: CubeState3x3): Move[] {
  const s = cloneState(state);
  for (let depth = 0; depth <= 4; depth++) {
    const chain = findCrossChain(s, depth);
    if (chain) return compress(chain.map(parseMove));
  }
  throw new Error("Last-layer cross did not converge");
}

/**
 * Solves through the last-layer cross: first two layers, then yellow edge
 * orientation. Returns the full move sequence; the input is not mutated.
 */
export function solveThroughLastLayerCross(state: CubeState3x3): Move[] {
  const twoLayers = solveTwoLayers(state);
  const afterTwo = twoLayers.reduce((acc, move) => applyMove(acc, move), cloneState(state));
  const cross = solveLastLayerCross(afterTwo);
  return compress([...twoLayers, ...cross]);
}
