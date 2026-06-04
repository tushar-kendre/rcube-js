/**
 * Move notation parsing and formatting.
 *
 * Supported notation:
 *   R, R', R2        outer face moves
 *   2R, 2R', 3R2     inner-layer moves (N x N cubes)
 *
 * Wide, slice, and rotation moves are intentionally not handled yet; they are
 * out of scope until the F2L/last-layer solvers require them.
 */

import { Face } from "../model/faces";

/**
 * A parsed move.
 *
 * `amount` is expressed as the number of clockwise quarter turns:
 *   1 = clockwise, 2 = half turn, 3 = counter-clockwise (prime).
 */
export interface Move {
  face: Face;
  /** 1 = outer face, 2 = second layer in, etc. */
  layer: number;
  /** Clockwise quarter turns: 1, 2, or 3. */
  amount: 1 | 2 | 3;
}

const FACE_LETTERS: Record<string, Face> = {
  U: "U",
  D: "D",
  L: "L",
  R: "R",
  F: "F",
  B: "B",
};

const MOVE_PATTERN = /^(\d*)([UDLRFB])(2)?('|i)?$/;

/** Parses a single move string. Throws on invalid notation. */
export function parseMove(notation: string): Move {
  const match = notation.trim().match(MOVE_PATTERN);
  if (!match) {
    throw new Error(`Invalid move notation: "${notation}"`);
  }

  const [, layerStr, faceStr, doubleStr, primeStr] = match;
  const face = FACE_LETTERS[faceStr];
  const layer = layerStr ? parseInt(layerStr, 10) : 1;

  let amount: 1 | 2 | 3 = 1;
  if (doubleStr) amount = 2;
  else if (primeStr) amount = 3;

  return { face, layer, amount };
}

/** Parses a whitespace-separated move sequence. */
export function parseSequence(sequence: string): Move[] {
  return sequence
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(parseMove);
}

/** Formats a move back into standard notation. */
export function formatMove(move: Move): string {
  const layerPrefix = move.layer > 1 ? String(move.layer) : "";
  const suffix = move.amount === 2 ? "2" : move.amount === 3 ? "'" : "";
  return `${layerPrefix}${move.face}${suffix}`;
}

/** Formats a move sequence into a single space-separated string. */
export function formatSequence(moves: Move[]): string {
  return moves.map(formatMove).join(" ");
}

/** Returns the inverse of a move (same face/layer, opposite direction). */
export function invertMove(move: Move): Move {
  const amount = move.amount === 1 ? 3 : move.amount === 3 ? 1 : 2;
  return { ...move, amount };
}

/** Returns the inverse of a sequence (reversed and each move inverted). */
export function invertSequence(moves: Move[]): Move[] {
  return [...moves].reverse().map(invertMove);
}
