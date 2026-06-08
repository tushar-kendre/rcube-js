/**
 * Applies moves to a canonical 3x3 state.
 *
 * A move is permutation composition: the move table describes where each slot's
 * contents come from, so the new state samples the old state through the table
 * and accumulates orientation deltas. Half and prime turns repeat the clockwise
 * table 2 or 3 times.
 */

import { CubeState3x3, N_CORNERS, N_EDGES } from "../model/state-3x3";
import { Move, parseSequence } from "./notation";
import { BASE_MOVE_TABLES, MoveTable } from "./tables-3x3";

function applyTable(state: CubeState3x3, table: MoveTable): CubeState3x3 {
  const cp = new Uint8Array(N_CORNERS);
  const co = new Uint8Array(N_CORNERS);
  const ep = new Uint8Array(N_EDGES);
  const eo = new Uint8Array(N_EDGES);

  for (let i = 0; i < N_CORNERS; i++) {
    const from = table.cp[i];
    cp[i] = state.cp[from];
    co[i] = (state.co[from] + table.co[i]) % 3;
  }
  for (let i = 0; i < N_EDGES; i++) {
    const from = table.ep[i];
    ep[i] = state.ep[from];
    eo[i] = (state.eo[from] + table.eo[i]) % 2;
  }

  return { cp, co, ep, eo };
}

/**
 * Applies a single move to a 3x3 state, returning a new state.
 * Only outer-layer moves (layer 1) are valid for the canonical 3x3 model.
 */
export function applyMove(state: CubeState3x3, move: Move): CubeState3x3 {
  if (move.kind && move.kind !== "face") {
    throw new Error(
      `applyMove handles only outer face moves; "${move.kind}" moves are resolved by the model`,
    );
  }
  if (move.layer !== 1) {
    throw new Error(
      `The canonical 3x3 model only supports outer-layer moves, got layer ${move.layer}`,
    );
  }

  const table = BASE_MOVE_TABLES[move.face];
  let next = applyTable(state, table);
  for (let turn = 1; turn < move.amount; turn++) {
    next = applyTable(next, table);
  }
  return next;
}

/** Applies a sequence of moves in order, returning a new state. */
export function applyMoves(state: CubeState3x3, moves: Move[]): CubeState3x3 {
  return moves.reduce(applyMove, state);
}

/** Convenience helper: applies a move sequence written in standard notation. */
export function applyNotation(state: CubeState3x3, notation: string): CubeState3x3 {
  return applyMoves(state, parseSequence(notation));
}
