/**
 * Compact string hashes for cube states, used as visited-set keys during
 * search. Hashing the full state is cheap (20 corner values + 24 edge values),
 * and partial hashes let solvers collapse equivalent sub-states (e.g. only the
 * cross edges matter during the cross stage).
 */

import { CubeState3x3 } from "../model/state-3x3";

/** Full state hash: every corner and edge slot's piece and orientation. */
export function hashState(state: CubeState3x3): string {
  let key = "";
  for (let i = 0; i < state.cp.length; i++) {
    key += state.cp[i].toString(16) + state.co[i];
  }
  key += "|";
  for (let i = 0; i < state.ep.length; i++) {
    key += state.ep[i].toString(16) + state.eo[i];
  }
  return key;
}

/**
 * Partial hash over a chosen subset of edge slots, recording which piece sits
 * in each watched slot and its orientation. Used by the cross solver, where the
 * rest of the cube is irrelevant.
 */
export function hashEdges(state: CubeState3x3, edgeSlots: number[]): string {
  let key = "";
  for (const slot of edgeSlots) {
    key += state.ep[slot].toString(16) + state.eo[slot] + ".";
  }
  return key;
}
