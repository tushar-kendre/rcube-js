/**
 * Move notation parsing and formatting.
 *
 * Supported notation:
 *   R, R', R2        outer face moves
 *   2R, 2R', 3R2     inner-layer moves (N x N cubes)
 *   Rw, Rw', Rw2     wide moves (outer + adjacent inner layers)
 *   r, l, u, d, f, b lowercase wide moves (equivalent to Rw, Lw, ...)
 *   3Rw, 3r          wide moves spanning the outer 3 layers (big cubes)
 *   M, E, S          slice moves (with ' and 2)
 *   x, y, z          whole-cube rotations (with ' and 2)
 *
 * Non-face moves are encoded on the same `Move` shape using a `kind` tag plus a
 * reference `face` that fixes the rotation axis and direction:
 *   rotation x/y/z   -> face R/U/F
 *   slice    M/E/S   -> face L/D/F   (M follows L, E follows D, S follows F)
 * This keeps `face`/`layer`/`amount` always present so existing callers (solvers,
 * apply tables, geometry) are unaffected; they only ever build `kind: "face"`.
 */

import { Face } from "../model/faces";

/** Discriminates the four families of moves. */
export type MoveKind = "face" | "wide" | "slice" | "rotation";

/**
 * A parsed move.
 *
 * `amount` is expressed as the number of clockwise quarter turns:
 *   1 = clockwise, 2 = half turn, 3 = counter-clockwise (prime).
 */
export interface Move {
  /** For face/wide: the turned face. For slice/rotation: the reference face. */
  face: Face;
  /** 1 = outer face, 2 = second layer in, etc. (face moves). */
  layer: number;
  /** Clockwise quarter turns: 1, 2, or 3. */
  amount: 1 | 2 | 3;
  /** Move family; defaults to "face" when omitted. */
  kind?: MoveKind;
  /** Wide moves: number of layers turned (>= 2). */
  width?: number;
}

const FACE_LETTERS: Record<string, Face> = {
  U: "U",
  D: "D",
  L: "L",
  R: "R",
  F: "F",
  B: "B",
};

/** Rotation letter <-> reference face. */
const ROTATION_TO_FACE: Record<string, Face> = { x: "R", y: "U", z: "F" };
const FACE_TO_ROTATION: Partial<Record<Face, string>> = { R: "x", U: "y", F: "z" };

/** Slice letter <-> reference face (M follows L, E follows D, S follows F). */
const SLICE_TO_FACE: Record<string, Face> = { M: "L", E: "D", S: "F" };
const FACE_TO_SLICE: Partial<Record<Face, string>> = { L: "M", D: "E", F: "S" };

const ROTATION_PATTERN = /^([xyz])(2|')?$/;
const SLICE_PATTERN = /^([MES])(2|')?$/;
const WIDE_LOWER_PATTERN = /^(\d*)([rludfb])(2|')?$/;
const WIDE_W_PATTERN = /^(\d*)([URFDLB])w(2|')?$/;
const FACE_PATTERN = /^(\d*)([UDLRFB])(2)?('|i)?$/;

/** Maps an optional `2`/`'` suffix to clockwise quarter turns. */
function amountFor(suffix?: string): 1 | 2 | 3 {
  if (suffix === "2") return 2;
  if (suffix === "'" || suffix === "i") return 3;
  return 1;
}

/** Parses a single move string. Throws on invalid notation. */
export function parseMove(notation: string): Move {
  const s = notation.trim();

  let m = s.match(ROTATION_PATTERN);
  if (m) {
    return { kind: "rotation", face: ROTATION_TO_FACE[m[1]], layer: 1, amount: amountFor(m[2]) };
  }

  m = s.match(SLICE_PATTERN);
  if (m) {
    return { kind: "slice", face: SLICE_TO_FACE[m[1]], layer: 1, amount: amountFor(m[2]) };
  }

  m = s.match(WIDE_LOWER_PATTERN);
  if (m) {
    const width = m[1] ? parseInt(m[1], 10) : 2;
    return { kind: "wide", face: m[2].toUpperCase() as Face, layer: 1, width, amount: amountFor(m[3]) };
  }

  m = s.match(WIDE_W_PATTERN);
  if (m) {
    const width = m[1] ? parseInt(m[1], 10) : 2;
    return { kind: "wide", face: FACE_LETTERS[m[2]], layer: 1, width, amount: amountFor(m[3]) };
  }

  m = s.match(FACE_PATTERN);
  if (m) {
    const [, layerStr, faceStr, doubleStr, primeStr] = m;
    return {
      kind: "face",
      face: FACE_LETTERS[faceStr],
      layer: layerStr ? parseInt(layerStr, 10) : 1,
      amount: amountFor(doubleStr ?? primeStr),
    };
  }

  throw new Error(`Invalid move notation: "${notation}"`);
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
  const suffix = move.amount === 2 ? "2" : move.amount === 3 ? "'" : "";
  switch (move.kind) {
    case "rotation":
      return `${FACE_TO_ROTATION[move.face] ?? "x"}${suffix}`;
    case "slice":
      return `${FACE_TO_SLICE[move.face] ?? "M"}${suffix}`;
    case "wide": {
      const width = move.width ?? 2;
      const prefix = width > 2 ? String(width) : "";
      return `${prefix}${move.face}w${suffix}`;
    }
    default: {
      const layerPrefix = move.layer > 1 ? String(move.layer) : "";
      return `${layerPrefix}${move.face}${suffix}`;
    }
  }
}

/** Formats a move sequence into a single space-separated string. */
export function formatSequence(moves: Move[]): string {
  return moves.map(formatMove).join(" ");
}

/** Returns the inverse of a move (same shape, opposite direction). */
export function invertMove(move: Move): Move {
  const amount = move.amount === 1 ? 3 : move.amount === 3 ? 1 : 2;
  return { ...move, amount };
}

/** Returns the inverse of a sequence (reversed and each move inverted). */
export function invertSequence(moves: Move[]): Move[] {
  return [...moves].reverse().map(invertMove);
}
