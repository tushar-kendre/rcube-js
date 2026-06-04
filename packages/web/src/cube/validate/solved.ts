/**
 * Solved-state detection and physical-validity checks for the 3x3 model.
 */

import { CubeState3x3, N_CORNERS, N_EDGES } from "../model/state-3x3";

/** True if the state is the solved cube (identity permutation, zero orientation). */
export function isSolved(state: CubeState3x3): boolean {
  for (let i = 0; i < N_CORNERS; i++) {
    if (state.cp[i] !== i || state.co[i] !== 0) return false;
  }
  for (let i = 0; i < N_EDGES; i++) {
    if (state.ep[i] !== i || state.eo[i] !== 0) return false;
  }
  return true;
}

/**
 * Validates that a state is reachable on a real cube. Checks permutation
 * validity, orientation sums, and the combined permutation parity constraint.
 */
export function isValidState(state: CubeState3x3): boolean {
  if (!isPermutation(state.cp, N_CORNERS)) return false;
  if (!isPermutation(state.ep, N_EDGES)) return false;

  let coSum = 0;
  for (let i = 0; i < N_CORNERS; i++) {
    if (state.co[i] > 2) return false;
    coSum += state.co[i];
  }
  if (coSum % 3 !== 0) return false;

  let eoSum = 0;
  for (let i = 0; i < N_EDGES; i++) {
    if (state.eo[i] > 1) return false;
    eoSum += state.eo[i];
  }
  if (eoSum % 2 !== 0) return false;

  // Corner and edge permutation parities must match.
  if (permutationParity(state.cp) !== permutationParity(state.ep)) return false;

  return true;
}

function isPermutation(arr: Uint8Array, n: number): boolean {
  const seen = new Array<boolean>(n).fill(false);
  for (let i = 0; i < n; i++) {
    const v = arr[i];
    if (v >= n || seen[v]) return false;
    seen[v] = true;
  }
  return true;
}

/** Parity of a permutation: 0 = even, 1 = odd. */
function permutationParity(arr: Uint8Array): number {
  const n = arr.length;
  const seen = new Array<boolean>(n).fill(false);
  let parity = 0;
  for (let i = 0; i < n; i++) {
    if (seen[i]) continue;
    let cycleLen = 0;
    let j = i;
    while (!seen[j]) {
      seen[j] = true;
      j = arr[j];
      cycleLen++;
    }
    if (cycleLen % 2 === 0) parity ^= 1;
  }
  return parity;
}
