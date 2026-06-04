/**
 * Canonical face and color definitions shared by the logical cube model and
 * the renderer.
 *
 * Two face vocabularies coexist:
 * - `Face` (U/D/L/R/F/B): the standard cubing notation used by the logical
 *   model, move engine, and solvers.
 * - `CubeFace` ("top"/"bottom"/...): the descriptive names used by the React
 *   rendering layer and existing UI components.
 *
 * The fixed color scheme (white on top) is:
 *   U = white, D = yellow, F = red, B = orange, L = green, R = blue
 */

/** Standard cubing face notation. */
export type Face = "U" | "D" | "L" | "R" | "F" | "B";

/** Descriptive face names used by the rendering and UI layers. */
export type CubeFace = "front" | "back" | "left" | "right" | "top" | "bottom";

/** The six sticker colors. */
export type CubeColor = "white" | "yellow" | "red" | "orange" | "blue" | "green";

/** All faces in canonical order. */
export const FACES: readonly Face[] = ["U", "R", "F", "D", "L", "B"];

/** Maps standard notation faces to descriptive render names. */
export const FACE_TO_CUBE_FACE: Record<Face, CubeFace> = {
  U: "top",
  D: "bottom",
  L: "left",
  R: "right",
  F: "front",
  B: "back",
};

/** Maps descriptive render names back to standard notation faces. */
export const CUBE_FACE_TO_FACE: Record<CubeFace, Face> = {
  top: "U",
  bottom: "D",
  left: "L",
  right: "R",
  front: "F",
  back: "B",
};

/** The solved color of each face (i.e. the center color). */
export const FACE_COLOR: Record<Face, CubeColor> = {
  U: "white",
  D: "yellow",
  F: "red",
  B: "orange",
  L: "green",
  R: "blue",
};

/** Solved color keyed by descriptive face name. */
export const DEFAULT_CUBE_COLORS: Record<CubeFace, CubeColor> = {
  top: "white",
  bottom: "yellow",
  front: "red",
  back: "orange",
  left: "green",
  right: "blue",
};

/** Color to hex mapping used by the renderer. */
export const COLOR_MAP: Record<CubeColor, string> = {
  white: "#f5f5f5",
  yellow: "#ffd500",
  red: "#c41e3a",
  orange: "#ff5800",
  blue: "#0051ba",
  green: "#009e60",
};
