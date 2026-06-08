import { applyMove } from "../../cube/moves/apply";
import { CubeState3x3 } from "../../cube/model/state-3x3";
import { Move, parseMove } from "../../cube/moves/notation";
import { IDENTITY } from "../../cube/moves/orientation";
import { applyOrientedMove } from "../../cube/moves/resolve";

/** Applies a string (outer-face) move sequence to a state. */
export function applySeq(state: CubeState3x3, moves: string[]): CubeState3x3 {
  let s = state;
  for (const m of moves) s = applyMove(s, parseMove(m));
  return s;
}

/**
 * Applies a sequence that may include wide, slice, or rotation moves. Tracks
 * orientation internally; for an orientation-neutral algorithm (every full OLL
 * or PLL) the returned canonical state is exactly the algorithm's effect.
 */
export function applySeqExt(state: CubeState3x3, moves: Move[]): CubeState3x3 {
  let os = { state, orientation: IDENTITY };
  for (const m of moves) os = applyOrientedMove(os, m);
  return os.state;
}

/** Returns D-layer setup turns for k ∈ {0,1,2,3}. */
export function dTurns(k: number): string[] {
  const n = ((k % 4) + 4) % 4;
  if (n === 0) return [];
  if (n === 1) return ["D"];
  if (n === 2) return ["D2"];
  return ["D'"];
}

/** U-layer setup turns (y rotation) for k ∈ {0,1,2,3}. */
export function uTurns(k: number): string[] {
  const n = ((k % 4) + 4) % 4;
  if (n === 0) return [];
  if (n === 1) return ["U"];
  if (n === 2) return ["U2"];
  return ["U'"];
}

/** Wraps an algorithm in D setup/undo (net D rotation zero). */
export function dConjugate(k: number, alg: string[]): string[] {
  return [...dTurns(k), ...alg, ...dTurns((4 - k) % 4)];
}

/** Wraps an algorithm in U setup/undo (net U rotation zero). */
export function uConjugate(k: number, alg: string[]): string[] {
  return [...uTurns(k), ...alg, ...uTurns((4 - k) % 4)];
}
