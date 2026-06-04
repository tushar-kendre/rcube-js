/**
 * Conversion between the canonical 3x3 state and a 54-facelet representation.
 *
 * Facelets are indexed in the order U, R, F, D, L, B, each face numbered
 * row-major from 0..8 (so global index = faceBase + row * 3 + col). This is the
 * standard Kociemba facelet layout, which makes the tables below directly
 * reusable and easy to cross-check against published references.
 */

import { CubeState3x3, Corner, Edge, createSolvedState } from "../model/state-3x3";
import { Face } from "../model/faces";

export const FACELET_COUNT = 54;

/** Global facelet index of each face center. */
export const CENTER_INDEX: Record<Face, number> = {
  U: 4,
  R: 13,
  F: 22,
  D: 31,
  L: 40,
  B: 49,
};

/** Global facelet indices for the three stickers of each corner slot. */
const CORNER_FACELET: number[][] = [
  [8, 9, 20], // URF
  [6, 18, 38], // UFL
  [0, 36, 47], // ULB
  [2, 45, 11], // UBR
  [29, 26, 15], // DFR
  [27, 44, 24], // DLF
  [33, 53, 42], // DBL
  [35, 17, 51], // DRB
];

/** The face (color) of each corner's stickers, in facelet order. */
const CORNER_FACE: Face[][] = [
  ["U", "R", "F"], // URF
  ["U", "F", "L"], // UFL
  ["U", "L", "B"], // ULB
  ["U", "B", "R"], // UBR
  ["D", "F", "R"], // DFR
  ["D", "L", "F"], // DLF
  ["D", "B", "L"], // DBL
  ["D", "R", "B"], // DRB
];

/** Global facelet indices for the two stickers of each edge slot. */
const EDGE_FACELET: number[][] = [
  [5, 10], // UR
  [7, 19], // UF
  [3, 37], // UL
  [1, 46], // UB
  [32, 16], // DR
  [28, 25], // DF
  [30, 43], // DL
  [34, 52], // DB
  [23, 12], // FR
  [21, 41], // FL
  [50, 39], // BL
  [48, 14], // BR
];

/** The face (color) of each edge's stickers, in facelet order. */
const EDGE_FACE: Face[][] = [
  ["U", "R"], // UR
  ["U", "F"], // UF
  ["U", "L"], // UL
  ["U", "B"], // UB
  ["D", "R"], // DR
  ["D", "F"], // DF
  ["D", "L"], // DL
  ["D", "B"], // DB
  ["F", "R"], // FR
  ["F", "L"], // FL
  ["B", "L"], // BL
  ["B", "R"], // BR
];

/**
 * Produces the 54 facelet faces (colors expressed as their owning face) for a
 * state. Index ordering matches U, R, F, D, L, B.
 */
export function toFacelets(state: CubeState3x3): Face[] {
  const facelets = new Array<Face>(FACELET_COUNT);

  // Centers are fixed.
  (Object.keys(CENTER_INDEX) as Face[]).forEach((face) => {
    facelets[CENTER_INDEX[face]] = face;
  });

  for (let slot = 0; slot < 8; slot++) {
    const piece = state.cp[slot];
    const ori = state.co[slot];
    for (let k = 0; k < 3; k++) {
      facelets[CORNER_FACELET[slot][(k + ori) % 3]] = CORNER_FACE[piece][k];
    }
  }

  for (let slot = 0; slot < 12; slot++) {
    const piece = state.ep[slot];
    const ori = state.eo[slot];
    for (let k = 0; k < 2; k++) {
      facelets[EDGE_FACELET[slot][(k + ori) % 2]] = EDGE_FACE[piece][k];
    }
  }

  return facelets;
}

/** Serializes a state to the 54-character facelet string (URFDLB order). */
export function toFaceletString(state: CubeState3x3): string {
  return toFacelets(state).join("");
}

/**
 * Reconstructs a canonical state from 54 facelet faces. Throws if a piece's
 * sticker set does not match any known corner/edge.
 */
export function fromFacelets(facelets: Face[]): CubeState3x3 {
  const state = createSolvedState();

  for (let slot = 0; slot < 8; slot++) {
    const stickers = CORNER_FACELET[slot].map((idx) => facelets[idx]);
    const { piece, orientation } = identifyCorner(stickers);
    state.cp[slot] = piece;
    state.co[slot] = orientation;
  }

  for (let slot = 0; slot < 12; slot++) {
    const stickers = EDGE_FACELET[slot].map((idx) => facelets[idx]);
    const { piece, orientation } = identifyEdge(stickers);
    state.ep[slot] = piece;
    state.eo[slot] = orientation;
  }

  return state;
}

function identifyCorner(stickers: Face[]): { piece: Corner; orientation: number } {
  // Forward mapping placed ref[k] at sticker slot (k + ori) % 3, so the inverse
  // looks for the orientation where stickers[(k + ori) % 3] === ref[k].
  for (let piece = 0; piece < 8; piece++) {
    const ref = CORNER_FACE[piece];
    for (let ori = 0; ori < 3; ori++) {
      if (
        stickers[(0 + ori) % 3] === ref[0] &&
        stickers[(1 + ori) % 3] === ref[1] &&
        stickers[(2 + ori) % 3] === ref[2]
      ) {
        return { piece, orientation: ori };
      }
    }
  }
  throw new Error(`Unrecognized corner stickers: ${stickers.join("")}`);
}

function identifyEdge(stickers: Face[]): { piece: Edge; orientation: number } {
  for (let piece = 0; piece < 12; piece++) {
    const ref = EDGE_FACE[piece];
    if (stickers[0] === ref[0] && stickers[1] === ref[1]) {
      return { piece, orientation: 0 };
    }
    if (stickers[0] === ref[1] && stickers[1] === ref[0]) {
      return { piece, orientation: 1 };
    }
  }
  throw new Error(`Unrecognized edge stickers: ${stickers.join("")}`);
}

/**
 * Maps a 3x3 render-grid coordinate and visible face to a global facelet index.
 *
 * Grid coordinates use x: 0=left..2=right, y: 0=bottom..2=top,
 * z: 0=back..2=front, matching the renderer.
 */
export function faceletIndexForGrid(
  face: "top" | "bottom" | "front" | "back" | "left" | "right",
  x: number,
  y: number,
  z: number,
): number {
  switch (face) {
    case "top":
      return 0 + z * 3 + x;
    case "bottom":
      return 27 + (2 - z) * 3 + x;
    case "front":
      return 18 + (2 - y) * 3 + x;
    case "back":
      return 45 + (2 - y) * 3 + (2 - x);
    case "right":
      return 9 + (2 - y) * 3 + (2 - z);
    case "left":
      return 36 + (2 - y) * 3 + z;
  }
}
