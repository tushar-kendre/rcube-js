/**
 * Kociemba two-phase coordinates.
 *
 * The canonical 3x3 model already uses the standard Kociemba conventions (see
 * `cube/moves/tables-3x3.ts`): U/D never twist corners or flip edges, R/L never
 * flip edges, F/B flip edges, and the E-slice edges are identities 8..11. That
 * makes these coordinate encodings the textbook ones.
 *
 * Phase 1 reduces the cube to the subgroup G1 = <U, D, R2, L2, F2, B2> by
 * driving three coordinates to their solved values:
 *   - twist    corner orientation               (3^7 = 2187)
 *   - flip     edge orientation                 (2^11 = 2048)
 *   - udSlice  the set of E-slice edge positions (C(12,4) = 495)
 *
 * Phase 2 stays inside G1 and solves three more:
 *   - cornerPerm    permutation of the 8 corners        (8! = 40320)
 *   - udEdgePerm    permutation of the 8 U/D edges       (8! = 40320)
 *   - sliceEdgePerm permutation of the 4 E-slice edges   (4! = 24)
 *
 * Each coordinate depends on only one of the cp/co/ep/eo arrays, so a single
 * coordinate can be unranked into a representative state and advanced through a
 * real move to build transition tables (see `movetables.ts`).
 */

import { CubeState3x3 } from "../../cube/model/state-3x3";

export const N_TWIST = 2187; // 3^7
export const N_FLIP = 2048; // 2^11
export const N_UDSLICE = 495; // C(12,4)
export const N_CORNER_PERM = 40320; // 8!
export const N_UDEDGE_PERM = 40320; // 8!
export const N_SLICE_PERM = 24; // 4!

const FACT = [1, 1, 2, 6, 24, 120, 720, 5040, 40320];

/** Binomial coefficients C(n, k) for n <= 12, k <= 4 (0 when n < k). */
const BINOM: number[][] = (() => {
  const c: number[][] = [];
  for (let n = 0; n <= 12; n++) {
    c[n] = [];
    for (let k = 0; k <= 4; k++) {
      if (k === 0) c[n][k] = 1;
      else if (n < k) c[n][k] = 0;
      else c[n][k] = c[n - 1][k - 1] + (n - 1 >= k ? c[n - 1][k] : 0);
    }
  }
  return c;
})();

const choose = (n: number, k: number): number => (k < 0 || k > 4 || n < 0 ? 0 : BINOM[n][k]);

/* --------------------------- permutation ranking -------------------------- */

/** Lehmer (factorial number system) rank of a permutation of 0..n-1. */
function rankPermutation(perm: ArrayLike<number>): number {
  const n = perm.length;
  let rank = 0;
  for (let i = 0; i < n; i++) {
    let smaller = 0;
    for (let j = i + 1; j < n; j++) if (perm[j] < perm[i]) smaller++;
    rank += smaller * FACT[n - 1 - i];
  }
  return rank;
}

/** Inverse of `rankPermutation` for a permutation of 0..n-1. */
function unrankPermutation(rank: number, n: number): number[] {
  const elems: number[] = [];
  for (let i = 0; i < n; i++) elems.push(i);
  const perm: number[] = [];
  let r = rank;
  for (let i = 0; i < n; i++) {
    const f = FACT[n - 1 - i];
    const idx = Math.floor(r / f);
    r %= f;
    perm.push(elems[idx]);
    elems.splice(idx, 1);
  }
  return perm;
}

/* ------------------------------ phase 1 ----------------------------------- */

/** Corner orientation coordinate from co[0..6] (co[7] is implied). */
export function getTwist(state: CubeState3x3): number {
  let t = 0;
  for (let i = 0; i < 7; i++) t = t * 3 + state.co[i];
  return t;
}

/** Writes a twist coordinate into co (co[7] makes the sum a multiple of 3). */
export function setTwist(state: CubeState3x3, value: number): void {
  let v = value;
  let sum = 0;
  for (let i = 6; i >= 0; i--) {
    state.co[i] = v % 3;
    sum += state.co[i];
    v = Math.floor(v / 3);
  }
  state.co[7] = (3 - (sum % 3)) % 3;
}

/** Edge orientation coordinate from eo[0..10] (eo[11] is implied). */
export function getFlip(state: CubeState3x3): number {
  let f = 0;
  for (let i = 0; i < 11; i++) f = f * 2 + state.eo[i];
  return f;
}

/** Writes a flip coordinate into eo (eo[11] makes the sum even). */
export function setFlip(state: CubeState3x3, value: number): void {
  let v = value;
  let sum = 0;
  for (let i = 10; i >= 0; i--) {
    state.eo[i] = v % 2;
    sum += state.eo[i];
    v = Math.floor(v / 2);
  }
  state.eo[11] = sum % 2;
}

/**
 * The set of positions holding the 4 E-slice edges (identities >= 8), ranked in
 * the combinatorial number system. Solved (slice edges at 8..11) maps to 494.
 */
export function getUDSlice(state: CubeState3x3): number {
  let idx = 0;
  let seen = 0;
  for (let p = 0; p < 12; p++) {
    if (state.ep[p] >= 8) {
      idx += choose(p, seen + 1);
      seen++;
    }
  }
  return idx;
}

/** Writes a udSlice coordinate into ep as a valid edge permutation. */
export function setUDSlice(state: CubeState3x3, value: number): void {
  const slicePositions: number[] = [];
  let rem = value;
  for (let k = 4; k >= 1; k--) {
    let p = k - 1;
    while (choose(p + 1, k) <= rem) p++;
    slicePositions.push(p);
    rem -= choose(p, k);
  }
  const isSlice = new Array<boolean>(12).fill(false);
  for (const p of slicePositions) isSlice[p] = true;

  let sliceId = 8;
  let udId = 0;
  for (let p = 0; p < 12; p++) {
    state.ep[p] = isSlice[p] ? sliceId++ : udId++;
  }
}

/* ------------------------------ phase 2 ----------------------------------- */

/** Permutation coordinate of the 8 corners. Solved = 0. */
export function getCornerPerm(state: CubeState3x3): number {
  return rankPermutation(state.cp);
}

/** Writes a corner-permutation coordinate into cp. */
export function setCornerPerm(state: CubeState3x3, value: number): void {
  const perm = unrankPermutation(value, 8);
  for (let i = 0; i < 8; i++) state.cp[i] = perm[i];
}

/** Permutation coordinate of the 8 U/D edges (positions 0..7). Solved = 0. */
export function getUDEdgePerm(state: CubeState3x3): number {
  return rankPermutation(state.ep.subarray(0, 8));
}

/** Writes a U/D-edge-permutation coordinate; slice edges fill positions 8..11. */
export function setUDEdgePerm(state: CubeState3x3, value: number): void {
  const perm = unrankPermutation(value, 8);
  for (let i = 0; i < 8; i++) state.ep[i] = perm[i];
  for (let i = 8; i < 12; i++) state.ep[i] = i;
}

/** Permutation coordinate of the 4 E-slice edges (positions 8..11). Solved = 0. */
export function getSliceEdgePerm(state: CubeState3x3): number {
  const sub = [
    state.ep[8] - 8,
    state.ep[9] - 8,
    state.ep[10] - 8,
    state.ep[11] - 8,
  ];
  return rankPermutation(sub);
}

/** Writes a slice-edge-permutation coordinate; U/D edges fill positions 0..7. */
export function setSliceEdgePerm(state: CubeState3x3, value: number): void {
  const perm = unrankPermutation(value, 4);
  for (let i = 0; i < 8; i++) state.ep[i] = i;
  for (let i = 0; i < 4; i++) state.ep[8 + i] = perm[i] + 8;
}
