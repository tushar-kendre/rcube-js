/**
 * Helpers for the 2D unfolded cube net editor.
 *
 * Net layout (cross form, U on top, D on bottom):
 *
 *           U
 *       L   F   R   B
 *           D
 *
 * Facelet indices follow Kociemba URFDLB order from facelets.ts.
 */

import { CENTER_INDEX, FACELET_COUNT } from "./facelets";
import { Face, FACE_COLOR, FACES, CubeColor } from "../model/faces";
import { createSolvedState } from "../model/state-3x3";
import { fromFacelets, toFacelets } from "./facelets";
import { isValidState } from "../validate/solved";
import { CubeState3x3 } from "../model/state-3x3";
import { COLOR_MAP } from "../model/faces";

export interface NetCell {
  face: Face;
  row: number;
  col: number;
  index: number;
  isCenter: boolean;
}

/** Empty slot in the CSS grid (null = no sticker). */
export type NetSlot = NetCell | null;

/** 12-column cross net; null = empty cell. Middle band is L+F+R+B (12 wide). */
export const NET_GRID: NetSlot[][] = [
  [null, null, null, cell("U", 0, 0), cell("U", 0, 1), cell("U", 0, 2), null, null, null, null, null, null],
  [null, null, null, cell("U", 1, 0), cell("U", 1, 1), cell("U", 1, 2), null, null, null, null, null, null],
  [null, null, null, cell("U", 2, 0), cell("U", 2, 1), cell("U", 2, 2), null, null, null, null, null, null],
  [
    cell("L", 0, 0), cell("L", 0, 1), cell("L", 0, 2),
    cell("F", 0, 0), cell("F", 0, 1), cell("F", 0, 2),
    cell("R", 0, 0), cell("R", 0, 1), cell("R", 0, 2),
    cell("B", 0, 0), cell("B", 0, 1), cell("B", 0, 2),
  ],
  [
    cell("L", 1, 0), cell("L", 1, 1), cell("L", 1, 2),
    cell("F", 1, 0), cell("F", 1, 1), cell("F", 1, 2),
    cell("R", 1, 0), cell("R", 1, 1), cell("R", 1, 2),
    cell("B", 1, 0), cell("B", 1, 1), cell("B", 1, 2),
  ],
  [
    cell("L", 2, 0), cell("L", 2, 1), cell("L", 2, 2),
    cell("F", 2, 0), cell("F", 2, 1), cell("F", 2, 2),
    cell("R", 2, 0), cell("R", 2, 1), cell("R", 2, 2),
    cell("B", 2, 0), cell("B", 2, 1), cell("B", 2, 2),
  ],
  [null, null, null, cell("D", 0, 0), cell("D", 0, 1), cell("D", 0, 2), null, null, null, null, null, null],
  [null, null, null, cell("D", 1, 0), cell("D", 1, 1), cell("D", 1, 2), null, null, null, null, null, null],
  [null, null, null, cell("D", 2, 0), cell("D", 2, 1), cell("D", 2, 2), null, null, null, null, null, null],
];

function faceletIndex(face: Face, row: number, col: number): number {
  const bases: Record<Face, number> = { U: 0, R: 9, F: 18, D: 27, L: 36, B: 45 };
  return bases[face] + row * 3 + col;
}

function cell(face: Face, row: number, col: number): NetCell {
  const index = faceletIndex(face, row, col);
  return {
    face,
    row,
    col,
    index,
    isCenter: index === CENTER_INDEX[face],
  };
}

/** User-friendly color cycle when clicking a sticker. */
export const COLOR_CYCLE: CubeColor[] = [
  "white",
  "yellow",
  "red",
  "orange",
  "green",
  "blue",
];

/** Face letter that owns each center color (inverse of FACE_COLOR). */
export const FACE_FOR_COLOR: Record<CubeColor, Face> = {
  white: "U",
  yellow: "D",
  red: "F",
  orange: "B",
  green: "L",
  blue: "R",
};

export const FACE_NAMES: Record<Face, string> = {
  U: "Up",
  D: "Down",
  L: "Left",
  R: "Right",
  F: "Front",
  B: "Back",
};

/** 3×3 cells for one face (row-major, row 0 = top). */
export function cellsForFace(face: Face): NetCell[][] {
  return [0, 1, 2].map((row) =>
    [0, 1, 2].map((col) => cell(face, row, col)),
  );
}

/** Solved facelet array (54 faces). */
export function solvedFacelets(): Face[] {
  return toFacelets(createSolvedState());
}

/** Cycles a sticker through colors (white→yellow→red→…). Centers are unchanged. */
export function cycleSticker(facelets: Face[], index: number): Face[] {
  const cellInfo = allCells().find((c) => c.index === index);
  if (!cellInfo || cellInfo.isCenter) return facelets;
  const stickerFace = facelets[index];
  const currentColor = FACE_COLOR[stickerFace];
  const nextColor =
    COLOR_CYCLE[(COLOR_CYCLE.indexOf(currentColor) + 1) % COLOR_CYCLE.length];
  const next = [...facelets];
  next[index] = FACE_FOR_COLOR[nextColor];
  return next;
}

/** Sticker color at a facelet index (the color painted on that square). */
export function stickerColor(facelets: Face[], index: number): CubeColor {
  return FACE_COLOR[facelets[index]];
}

export function faceToHex(face: Face): string {
  return COLOR_MAP[FACE_COLOR[face]];
}

export function faceLabel(face: Face, row: number, col: number): string {
  const color = FACE_COLOR[face];
  return `${FACE_NAMES[face]} (${face}) row ${row + 1} col ${col + 1}: ${color}`;
}

function allCells(): NetCell[] {
  return NET_GRID.flatMap((row) => row.filter((c): c is NetCell => c !== null));
}

export type ValidateResult =
  | { ok: true; state: CubeState3x3 }
  | { ok: false; message: string };

/** Validates a 54-sticker net and returns a canonical state or an error message. */
export function validateFacelets(facelets: Face[]): ValidateResult {
  if (facelets.length !== FACELET_COUNT) {
    return { ok: false, message: "Net must have exactly 54 stickers." };
  }

  const counts = new Map<Face, number>();
  for (const f of facelets) counts.set(f, (counts.get(f) ?? 0) + 1);
  for (const f of FACES) {
    if ((counts.get(f) ?? 0) !== 9) {
      return {
        ok: false,
        message: "Invalid cube — each color must appear exactly 9 times.",
      };
    }
  }

  for (const f of FACES) {
    if (facelets[CENTER_INDEX[f]] !== f) {
      return {
        ok: false,
        message: "Centers cannot be changed — they define cube orientation.",
      };
    }
  }

  try {
    const state = fromFacelets(facelets);
    if (!isValidState(state)) {
      return {
        ok: false,
        message: "This configuration is physically impossible on a real cube.",
      };
    }
    return { ok: true, state };
  } catch {
    return {
      ok: false,
      message: "Unrecognized piece arrangement — check adjacent sticker colors.",
    };
  }
}
