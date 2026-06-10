/**
 * Kociemba two-phase solver entry point.
 *
 * Produces near-optimal half-turn-metric solutions (typically ~20 moves). The
 * coordinate and pruning tables are built lazily on the first call and cached,
 * after which each solve is a fast IDA* over the tables.
 */

import { CubeState3x3, createSolvedState } from "../../cube/model/state-3x3";
import { Move } from "../../cube/moves/notation";
import { getFlip, getTwist, getUDSlice } from "./coords";
import { PHASE1_MOVES, PHASE2_MOVES } from "./movetables";
import { searchTwoPhase } from "./search";

const UD_SLICE_GOAL = getUDSlice(createSolvedState());

/** True when the cube is in the phase-1 subgroup G1 = <U, D, R2, L2, F2, B2>. */
export function inG1(state: CubeState3x3): boolean {
  return getTwist(state) === 0 && getFlip(state) === 0 && getUDSlice(state) === UD_SLICE_GOAL;
}

/** The phase-1 and phase-2 move lists, for segmented plans. */
export function solveKociembaPhases(state: CubeState3x3): { phase1: Move[]; phase2: Move[] } {
  const { phase1, phase2 } = searchTwoPhase(state);
  return {
    phase1: phase1.map((i) => PHASE1_MOVES[i].move),
    phase2: phase2.map((i) => PHASE2_MOVES[i].move),
  };
}

/** Full near-optimal solution as a flat move list. */
export function solveKociemba(state: CubeState3x3): Move[] {
  const { phase1, phase2 } = solveKociembaPhases(state);
  return [...phase1, ...phase2];
}
