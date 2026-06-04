/**
 * Canonical logical representation of a 3x3x3 cube.
 *
 * This is the standard cubie model used by cubing algorithms (Kociemba, CFOP,
 * etc.). The cube is described by four arrays:
 * - `cp` / `co`: corner permutation and orientation
 * - `ep` / `eo`: edge permutation and orientation
 *
 * Permutation arrays hold, for each slot, the identity of the cubie currently
 * occupying that slot. Orientation values are taken modulo 3 for corners and
 * modulo 2 for edges.
 *
 * Slot ordering (must never be reinterpreted implicitly):
 *   Corners: URF, UFL, ULB, UBR, DFR, DLF, DBL, DRB
 *   Edges:   UR, UF, UL, UB, DR, DF, DL, DB, FR, FL, BL, BR
 */

export const N_CORNERS = 8;
export const N_EDGES = 12;

/** Corner slot indices, named for readability in tables and tests. */
export enum Corner {
  URF = 0,
  UFL = 1,
  ULB = 2,
  UBR = 3,
  DFR = 4,
  DLF = 5,
  DBL = 6,
  DRB = 7,
}

/** Edge slot indices, named for readability in tables and tests. */
export enum Edge {
  UR = 0,
  UF = 1,
  UL = 2,
  UB = 3,
  DR = 4,
  DF = 5,
  DL = 6,
  DB = 7,
  FR = 8,
  FL = 9,
  BL = 10,
  BR = 11,
}

export interface CubeState3x3 {
  /** Corner permutation: cp[slot] = corner identity at that slot. */
  cp: Uint8Array;
  /** Corner orientation (0..2) for the corner at each slot. */
  co: Uint8Array;
  /** Edge permutation: ep[slot] = edge identity at that slot. */
  ep: Uint8Array;
  /** Edge orientation (0..1) for the edge at each slot. */
  eo: Uint8Array;
}

/** Returns a fresh solved 3x3 state. */
export function createSolvedState(): CubeState3x3 {
  return {
    cp: Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7]),
    co: new Uint8Array(N_CORNERS),
    ep: Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
    eo: new Uint8Array(N_EDGES),
  };
}

/** Deep copies a state. */
export function cloneState(state: CubeState3x3): CubeState3x3 {
  return {
    cp: state.cp.slice(),
    co: state.co.slice(),
    ep: state.ep.slice(),
    eo: state.eo.slice(),
  };
}

/** Structural equality over all four arrays. */
export function statesEqual(a: CubeState3x3, b: CubeState3x3): boolean {
  return (
    arraysEqual(a.cp, b.cp) &&
    arraysEqual(a.co, b.co) &&
    arraysEqual(a.ep, b.ep) &&
    arraysEqual(a.eo, b.eo)
  );
}

function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
