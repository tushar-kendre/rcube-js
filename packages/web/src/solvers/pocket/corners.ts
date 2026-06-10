/**
 * 2x2 (pocket cube) corner coordinate and projection.
 *
 * A 2x2 is corners-only. Fixing the DBL corner (slot 6, never moved by R/U/F)
 * removes whole-cube rotation redundancy, leaving 7! * 3^6 = 3,674,160 states
 * reachable with the three generators R, U, F. Each state is encoded to a single
 * integer in [0, N_POCKET) so a BFS distance table can index it directly.
 *
 * The generators' corner permutation/orientation effect is derived once from the
 * tested 3x3 `applyMove`, then applied as plain arrays for speed.
 */

import { applyMove } from "../../cube/moves/apply";
import { faceletIndexForGrid, fromFacelets, toFacelets } from "../../cube/convert/facelets";
import { CubeColor, CubeFace, Face, FACE_COLOR } from "../../cube/model/faces";
import { CubeState3x3, createSolvedState } from "../../cube/model/state-3x3";
import { GridCubeState } from "../../cube/model/state-grid";
import { Move, parseMove } from "../../cube/moves/notation";

/** Total reachable states with the DBL corner fixed. */
export const N_POCKET = 3674160; // 7! * 3^6

/** DBL corner slot; invariant under R, U, F. */
const FIXED_SLOT = 6;
/** The 7 movable slots, in ranking order (also the piece-id alphabet). */
const PERM_SLOTS = [0, 1, 2, 3, 4, 5, 7];
/** Slots whose orientation is free (the 7th, slot 7, is implied by the sum). */
const ORI_SLOTS = [0, 1, 2, 3, 4, 5];

const FACT = [1, 1, 2, 6, 24, 120, 720];

/** Inverse of the fixed color scheme: sticker color -> owning face. */
const COLOR_TO_FACE = Object.fromEntries(
  (Object.keys(FACE_COLOR) as Face[]).map((f) => [FACE_COLOR[f], f]),
) as Record<CubeColor, Face>;

export interface Generator {
  move: Move;
  perm: number[];
  ori: number[];
}

/** The 9 half-turn-metric generators (R, U, F in 1/2/3), with corner actions. */
export const GENERATORS: Generator[] = ["R", "R2", "R'", "U", "U2", "U'", "F", "F2", "F'"].map(
  (token) => {
    const move = parseMove(token);
    const after = applyMove(createSolvedState(), move);
    // On the solved state cp = identity, co = 0, so the result *is* the action:
    //   new_cp[i] = cp[perm[i]], new_co[i] = (co[perm[i]] + ori[i]) % 3.
    return { move, perm: Array.from(after.cp), ori: Array.from(after.co) };
  },
);

/** Applies a generator's corner action to cp/co, returning fresh arrays. */
export function applyGenerator(
  cp: Uint8Array,
  co: Uint8Array,
  gen: Generator,
): { cp: Uint8Array; co: Uint8Array } {
  const ncp = new Uint8Array(8);
  const nco = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    ncp[i] = cp[gen.perm[i]];
    nco[i] = (co[gen.perm[i]] + gen.ori[i]) % 3;
  }
  return { cp: ncp, co: nco };
}

function rankPerm7(idx: number[]): number {
  let rank = 0;
  for (let i = 0; i < 7; i++) {
    let smaller = 0;
    for (let j = i + 1; j < 7; j++) if (idx[j] < idx[i]) smaller++;
    rank += smaller * FACT[6 - i];
  }
  return rank;
}

// Reused scratch for the allocation-free decode used by the BFS build.
const UNRANK_ELEMS = new Int8Array([0, 1, 2, 3, 4, 5, 6]);

/** Encodes a corner state (with the DBL corner solved) to a coordinate. */
export function encodePocket(cp: Uint8Array, co: Uint8Array): number {
  const idx = PERM_SLOTS.map((slot) => PERM_SLOTS.indexOf(cp[slot]));
  const permRank = rankPerm7(idx);
  let ori = 0;
  for (let i = ORI_SLOTS.length - 1; i >= 0; i--) ori = ori * 3 + co[ORI_SLOTS[i]];
  return permRank * 729 + ori;
}

/** Decodes a coordinate into the provided cp/co buffers (allocation-free). */
export function decodePocketInto(coord: number, cp: Uint8Array, co: Uint8Array): void {
  const permRank = Math.floor(coord / 729);
  let ori = coord % 729;

  for (let i = 0; i < 7; i++) UNRANK_ELEMS[i] = i;
  let r = permRank;
  for (let i = 0; i < 7; i++) {
    const f = FACT[6 - i];
    const k = Math.floor(r / f);
    r %= f;
    cp[PERM_SLOTS[i]] = PERM_SLOTS[UNRANK_ELEMS[k]];
    for (let j = k; j < 6 - i; j++) UNRANK_ELEMS[j] = UNRANK_ELEMS[j + 1];
  }
  cp[FIXED_SLOT] = FIXED_SLOT;

  let sum = 0;
  for (let i = 0; i < ORI_SLOTS.length; i++) {
    const v = ori % 3;
    ori = Math.floor(ori / 3);
    co[ORI_SLOTS[i]] = v;
    sum += v;
  }
  co[FIXED_SLOT] = 0;
  co[7] = (3 - (sum % 3)) % 3;
}

/** Decodes a coordinate back to a corner state with the DBL corner solved. */
export function decodePocket(coord: number): { cp: Uint8Array; co: Uint8Array } {
  const cp = new Uint8Array(8);
  const co = new Uint8Array(8);
  decodePocketInto(coord, cp, co);
  return { cp, co };
}

/**
 * Reads the 8 corner cubies of a 2x2 grid into a corner state (cp/co) in the
 * fixed (white-up) color frame. The 2x2 coordinates {0,1} map onto the 3x3 grid
 * coordinates {0,2}, so the existing facelet machinery identifies the corners.
 */
export function gridToCorners(grid: GridCubeState): { cp: Uint8Array; co: Uint8Array } {
  const facelets = toFacelets(createSolvedState());
  for (const cubie of grid.cubies) {
    const [x, y, z] = cubie.position;
    for (const face of Object.keys(cubie.stickers) as CubeFace[]) {
      const idx = faceletIndexForGrid(face, x * 2, y * 2, z * 2);
      facelets[idx] = COLOR_TO_FACE[cubie.stickers[face] as CubeColor];
    }
  }
  const state: CubeState3x3 = fromFacelets(facelets);
  return { cp: state.cp, co: state.co };
}
