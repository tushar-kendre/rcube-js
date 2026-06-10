/**
 * Admissible pruning tables for the two phases, built by breadth-first search
 * backward from the solved coordinates over the transition tables.
 *
 * Each table stores the exact minimum number of moves to solve a pair of
 * coordinates. A search node's lower bound is the max over its tables, which is
 * admissible because solving the whole cube must solve each pair.
 *
 *   Phase 1: (flip, udSlice) and (twist, udSlice)
 *   Phase 2: (cornerPerm, sliceEdgePerm) and (udEdgePerm, sliceEdgePerm)
 */

import { createSolvedState } from "../../cube/model/state-3x3";
import {
  N_CORNER_PERM,
  N_FLIP,
  N_SLICE_PERM,
  N_TWIST,
  N_UDEDGE_PERM,
  N_UDSLICE,
  getUDSlice,
} from "./coords";
import { PHASE1_MOVES, PHASE2_MOVES, getMoveTables } from "./movetables";

const UNVISITED = 255;

/**
 * BFS over the product of two coordinates. `goalA`/`goalB` is the solved pair.
 * Returns a flat `distance[a * sizeB + b]` table of minimal move counts.
 */
function buildPairTable(
  sizeA: number,
  sizeB: number,
  tableA: Uint16Array,
  tableB: Uint16Array,
  nMoves: number,
  goalA: number,
  goalB: number,
): Uint8Array {
  const dist = new Uint8Array(sizeA * sizeB).fill(UNVISITED);
  const start = goalA * sizeB + goalB;
  dist[start] = 0;

  let frontier: number[] = [start];
  let depth = 0;
  while (frontier.length > 0) {
    const next: number[] = [];
    for (const idx of frontier) {
      const a = (idx / sizeB) | 0;
      const b = idx - a * sizeB;
      const aBase = a * nMoves;
      const bBase = b * nMoves;
      for (let m = 0; m < nMoves; m++) {
        const ni = tableA[aBase + m] * sizeB + tableB[bBase + m];
        if (dist[ni] === UNVISITED) {
          dist[ni] = depth + 1;
          next.push(ni);
        }
      }
    }
    frontier = next;
    depth++;
  }
  return dist;
}

export interface PruneTables {
  flipSlice: Uint8Array;
  twistSlice: Uint8Array;
  cornerSlice: Uint8Array;
  udEdgeSlice: Uint8Array;
  /** Solved value of the udSlice coordinate (slice edges in the E-slice). */
  udSliceGoal: number;
}

let cached: PruneTables | null = null;

/** Lazily builds and caches both phases' pruning tables. */
export function getPruneTables(): PruneTables {
  if (cached) return cached;

  const mt = getMoveTables();
  const n1 = PHASE1_MOVES.length;
  const n2 = PHASE2_MOVES.length;
  const udSliceGoal = getUDSlice(createSolvedState());

  cached = {
    flipSlice: buildPairTable(N_FLIP, N_UDSLICE, mt.flip, mt.udSlice, n1, 0, udSliceGoal),
    twistSlice: buildPairTable(N_TWIST, N_UDSLICE, mt.twist, mt.udSlice, n1, 0, udSliceGoal),
    cornerSlice: buildPairTable(N_CORNER_PERM, N_SLICE_PERM, mt.cornerPerm, mt.sliceEdgePerm, n2, 0, 0),
    udEdgeSlice: buildPairTable(N_UDEDGE_PERM, N_SLICE_PERM, mt.udEdgePerm, mt.sliceEdgePerm, n2, 0, 0),
    udSliceGoal,
  };
  return cached;
}
