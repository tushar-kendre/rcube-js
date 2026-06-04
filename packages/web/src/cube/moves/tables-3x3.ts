/**
 * Precomputed permutation/orientation tables for the six basic clockwise face
 * moves on a 3x3 cube, using the standard Kociemba slot ordering defined in
 * `state-3x3.ts`.
 *
 * Each table describes the state produced by applying that move to a solved
 * cube. Applying a move to an arbitrary state is a permutation composition
 * (see `apply.ts`). Prime and double turns are derived by repeated application
 * of the clockwise table, so only these six need to be correct.
 */

import { Face } from "../model/faces";

export interface MoveTable {
  cp: number[];
  co: number[];
  ep: number[];
  eo: number[];
}

const U: MoveTable = {
  cp: [3, 0, 1, 2, 4, 5, 6, 7],
  co: [0, 0, 0, 0, 0, 0, 0, 0],
  ep: [3, 0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11],
  eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};

const R: MoveTable = {
  cp: [4, 1, 2, 0, 7, 5, 6, 3],
  co: [2, 0, 0, 1, 1, 0, 0, 2],
  ep: [8, 1, 2, 3, 11, 5, 6, 7, 4, 9, 10, 0],
  eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};

const F: MoveTable = {
  cp: [1, 5, 2, 3, 0, 4, 6, 7],
  co: [1, 2, 0, 0, 2, 1, 0, 0],
  ep: [0, 9, 2, 3, 4, 8, 6, 7, 1, 5, 10, 11],
  eo: [0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0],
};

const D: MoveTable = {
  cp: [0, 1, 2, 3, 5, 6, 7, 4],
  co: [0, 0, 0, 0, 0, 0, 0, 0],
  ep: [0, 1, 2, 3, 5, 6, 7, 4, 8, 9, 10, 11],
  eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};

const L: MoveTable = {
  cp: [0, 2, 6, 3, 4, 1, 5, 7],
  co: [0, 1, 2, 0, 0, 2, 1, 0],
  ep: [0, 1, 10, 3, 4, 5, 9, 7, 8, 2, 6, 11],
  eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};

const B: MoveTable = {
  cp: [0, 1, 3, 7, 4, 5, 2, 6],
  co: [0, 0, 1, 2, 0, 0, 2, 1],
  ep: [0, 1, 2, 11, 4, 5, 6, 10, 8, 9, 3, 7],
  eo: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1],
};

/** Clockwise quarter-turn table for each face. */
export const BASE_MOVE_TABLES: Record<Face, MoveTable> = { U, R, F, D, L, B };
