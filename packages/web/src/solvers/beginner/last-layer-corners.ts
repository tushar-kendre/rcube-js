/**
 * Beginner-method last-layer corners — the final step of the solve.
 *
 * Assumes the first two layers are solved and the last-layer (D) cross is fully
 * solved (edges oriented and matched to centers). Only the four D corners
 * remain. They are finished in two phases, each using one known algorithm
 * applied through D conjugations so the rest of the cube is never disturbed:
 *
 *   1. Position (permute) the corners with a corner 3-cycle:
 *        P = D' R' D L D' R D L'
 *      It cycles three D corners while leaving the first two layers and every
 *      edge untouched. Because the edges are already solved, the corner
 *      permutation is even, so at most two 3-cycles place all corners.
 *
 *   2. Orient (twist) the corners with a pure two-corner twist:
 *        T = R U R' U' R U R' U' D U R U' R' U R U' R' D'
 *      It twists two adjacent D corners in opposite directions and preserves
 *      everything else (positions, edges, first two layers).
 *
 * Each algorithm is wrapped in a D setup/undo (conjugation) so it can target
 * any corner triple/pair; the right setup is found by trying the four D
 * rotations, not by searching cube states.
 */

import { applyMove } from "../../cube/moves/apply";
import { CubeState3x3, cloneState } from "../../cube/model/state-3x3";
import { Move, formatMove, invertSequence, parseMove } from "../../cube/moves/notation";
import { compress } from "./optimize";
import { isLastLayerEdgesSolved, solveThroughLastLayerEdges } from "./last-layer-edges";

/** Last-layer corner slots (DFR, DLF, DBL, DRB). */
const LL_CORNERS = [4, 5, 6, 7] as const;

/** Corner 3-cycle that preserves the first two layers and all edges. */
const POSITION = ["D'", "R'", "D", "L", "D'", "R", "D", "L'"];
/** Pure two-corner twist that preserves positions, edges, and the first two layers. */
const TWIST = "R U R' U' R U R' U' D U R U' R' U R U' R' D'".split(" ");

function inverse(seq: string[]): string[] {
  return invertSequence(seq.map(parseMove)).map(formatMove);
}

const POSITION_ALGS = [POSITION, inverse(POSITION)];
const TWIST_ALGS = [TWIST, inverse(TWIST)];

function applySeq(state: CubeState3x3, moves: string[]): CubeState3x3 {
  let s = state;
  for (const m of moves) s = applyMove(s, parseMove(m));
  return s;
}

function dTurns(k: number): string[] {
  const n = ((k % 4) + 4) % 4;
  if (n === 0) return [];
  if (n === 1) return ["D"];
  if (n === 2) return ["D2"];
  return ["D'"];
}

/** Wraps an algorithm in a D setup and its undo, so the net D rotation is zero. */
function conjugate(k: number, alg: string[]): string[] {
  return [...dTurns(k), ...alg, ...dTurns((4 - k) % 4)];
}

function cornersPositioned(state: CubeState3x3): boolean {
  return LL_CORNERS.every((i) => state.cp[i] === i);
}

function cornersOriented(state: CubeState3x3): boolean {
  return LL_CORNERS.every((i) => state.co[i] === 0);
}

/**
 * Iterative-deepening search over D-conjugated applications of the given
 * algorithms until `done` holds. Among all solutions at the shallowest solving
 * depth, returns the one whose compressed move sequence (appended to `prefix`)
 * is shortest, so redundant turns cancel at the seams. Returns null if not
 * found within `maxDepth`.
 */
function search(
  state: CubeState3x3,
  algs: string[][],
  done: (s: CubeState3x3) => boolean,
  maxDepth: number,
  prefix: string[] = [],
): string[] | null {
  const solutions: string[][] = [];
  const collect = (s: CubeState3x3, depth: number, acc: string[]): void => {
    if (done(s)) {
      solutions.push(acc);
      return;
    }
    if (depth === 0) return;
    for (let k = 0; k < 4; k++) {
      for (const alg of algs) {
        const step = conjugate(k, alg);
        collect(applySeq(s, step), depth - 1, [...acc, ...step]);
      }
    }
  };

  for (let depth = 0; depth <= maxDepth; depth++) {
    collect(state, depth, []);
    if (solutions.length > 0) {
      let best = solutions[0];
      let bestLen = compress([...prefix, ...best].map(parseMove)).length;
      for (const candidate of solutions.slice(1)) {
        const len = compress([...prefix, ...candidate].map(parseMove)).length;
        if (len < bestLen) {
          best = candidate;
          bestLen = len;
        }
      }
      return best;
    }
  }
  return null;
}

/**
 * Solves the four last-layer corners (position then orientation), assuming the
 * rest of the cube is solved. Returns the moves used; input is not mutated.
 */
export function solveLastLayerCorners(state: CubeState3x3): Move[] {
  let s = cloneState(state);
  const out: string[] = [];

  const positioning = search(s, POSITION_ALGS, cornersPositioned, 5);
  if (!positioning) throw new Error("Last-layer corners could not be positioned");
  out.push(...positioning);
  s = applySeq(s, positioning);

  const orienting = search(s, TWIST_ALGS, cornersOriented, 6, out);
  if (!orienting) throw new Error("Last-layer corners could not be oriented");
  out.push(...orienting);

  return compress(out.map(parseMove));
}

/**
 * Full beginner-method solve: first two layers, last-layer cross, edge
 * alignment, then the corners. Returns the full move sequence; input is not
 * mutated.
 */
export function solveCube(state: CubeState3x3): Move[] {
  const throughEdges = solveThroughLastLayerEdges(state);
  const afterEdges = throughEdges.reduce((acc, move) => applyMove(acc, move), cloneState(state));
  const corners = solveLastLayerCorners(afterEdges);
  return compress([...throughEdges, ...corners]);
}

/** True when the last layer is fully solved (and therefore the whole cube). */
export function isCubeSolved(state: CubeState3x3): boolean {
  return (
    isLastLayerEdgesSolved(state) && cornersPositioned(state) && cornersOriented(state)
  );
}
