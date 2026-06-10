/**
 * Coordinate transition tables: `table[coord * nMoves + moveIndex] = newCoord`.
 *
 * Each table is generated once by unranking a coordinate into a representative
 * state, applying the real move through the tested `applyMove`, and re-reading
 * the coordinate. Because every coordinate depends on only one of the cp/co/ep/eo
 * arrays, the other arrays can stay solved without affecting the transition.
 *
 * Tables are built lazily and cached for the lifetime of the module.
 */

import { applyMove } from "../../cube/moves/apply";
import {
  CubeState3x3,
  cloneState,
  createSolvedState,
} from "../../cube/model/state-3x3";
import { Face } from "../../cube/model/faces";
import { Move, parseMove } from "../../cube/moves/notation";
import {
  N_CORNER_PERM,
  N_FLIP,
  N_SLICE_PERM,
  N_TWIST,
  N_UDEDGE_PERM,
  N_UDSLICE,
  getCornerPerm,
  getFlip,
  getSliceEdgePerm,
  getTwist,
  getUDEdgePerm,
  getUDSlice,
  setCornerPerm,
  setFlip,
  setSliceEdgePerm,
  setTwist,
  setUDEdgePerm,
  setUDSlice,
} from "./coords";

export interface NamedMove {
  notation: string;
  move: Move;
  face: Face;
  /** Rotation axis: 0 = U/D, 1 = R/L, 2 = F/B. Used for redundancy pruning. */
  axis: number;
  /** Position of the face within its axis (0 or 1); fixes same-axis ordering. */
  order: number;
}

/** Face order chosen so opposite faces share an axis (U/D, R/L, F/B). */
const FACE_AXIS: { face: Face; axis: number; order: number }[] = [
  { face: "U", axis: 0, order: 0 },
  { face: "D", axis: 0, order: 1 },
  { face: "R", axis: 1, order: 0 },
  { face: "L", axis: 1, order: 1 },
  { face: "F", axis: 2, order: 0 },
  { face: "B", axis: 2, order: 1 },
];

const SUFFIXES = ["", "2", "'"];

function named(face: Face, axis: number, order: number, suffix: string): NamedMove {
  const notation = `${face}${suffix}`;
  return { notation, move: parseMove(notation), face, axis, order };
}

/** All 18 half-turn-metric face moves (phase 1). */
export const PHASE1_MOVES: NamedMove[] = FACE_AXIS.flatMap(({ face, axis, order }) =>
  SUFFIXES.map((s) => named(face, axis, order, s)),
);

/** The 10 moves of G1: quarter turns on U/D, half turns on R/L/F/B (phase 2). */
export const PHASE2_MOVES: NamedMove[] = FACE_AXIS.flatMap(({ face, axis, order }) =>
  face === "U" || face === "D"
    ? SUFFIXES.map((s) => named(face, axis, order, s))
    : [named(face, axis, order, "2")],
);

export interface MoveTables {
  twist: Uint16Array;
  flip: Uint16Array;
  udSlice: Uint16Array;
  cornerPerm: Uint16Array;
  udEdgePerm: Uint16Array;
  sliceEdgePerm: Uint16Array;
}

function buildTable(
  size: number,
  moves: NamedMove[],
  set: (s: CubeState3x3, v: number) => void,
  get: (s: CubeState3x3) => number,
): Uint16Array {
  const table = new Uint16Array(size * moves.length);
  const solved = createSolvedState();
  for (let coord = 0; coord < size; coord++) {
    const s = cloneState(solved);
    set(s, coord);
    for (let m = 0; m < moves.length; m++) {
      table[coord * moves.length + m] = get(applyMove(s, moves[m].move));
    }
  }
  return table;
}

let cached: MoveTables | null = null;

/** Lazily builds and caches all coordinate transition tables. */
export function getMoveTables(): MoveTables {
  if (cached) return cached;
  cached = {
    twist: buildTable(N_TWIST, PHASE1_MOVES, setTwist, getTwist),
    flip: buildTable(N_FLIP, PHASE1_MOVES, setFlip, getFlip),
    udSlice: buildTable(N_UDSLICE, PHASE1_MOVES, setUDSlice, getUDSlice),
    cornerPerm: buildTable(N_CORNER_PERM, PHASE2_MOVES, setCornerPerm, getCornerPerm),
    udEdgePerm: buildTable(N_UDEDGE_PERM, PHASE2_MOVES, setUDEdgePerm, getUDEdgePerm),
    sliceEdgePerm: buildTable(N_SLICE_PERM, PHASE2_MOVES, setSliceEdgePerm, getSliceEdgePerm),
  };
  return cached;
}
