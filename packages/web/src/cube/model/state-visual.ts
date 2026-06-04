/**
 * Rendering-facing cube representation and move geometry.
 *
 * The renderer never sees the canonical solver model. Instead each cube model
 * (3x3 canonical or N x N grid) produces a `VisualCubieState`: a flat list of
 * visible cubies, each with a grid position and the colors currently shown on
 * its faces. This keeps the renderer a pure function of derived data.
 */

import { CubeColor, CubeFace } from "./faces";
import { Move } from "../moves/notation";

export interface VisualCubie {
  /** Stable identity (its solved grid position), used as a React key. */
  id: number;
  /** Current grid position, components in 0..size-1. */
  gridPosition: [number, number, number];
  /** Color shown on each visible face. */
  stickerColors: Partial<Record<CubeFace, CubeColor>>;
}

export interface VisualCubieState {
  size: number;
  cubies: VisualCubie[];
}

export type Axis = "x" | "y" | "z";

export interface MoveGeometry {
  /** Rotation axis of the affected layer. */
  axis: Axis;
  /** Signed target angle in radians for the animation. */
  angle: number;
  /** Predicate selecting cubies in the rotating layer by grid position. */
  isAffected: (gridPosition: [number, number, number]) => boolean;
}

const FACE_AXIS: Record<Move["face"], Axis> = {
  R: "x",
  L: "x",
  U: "y",
  D: "y",
  F: "z",
  B: "z",
};

// Sign applied to the rotation so that visuals match the logical move. Derived
// to match the original renderer's conventions (e.g. R rotates +X, L rotates -X).
const FACE_SIGN: Record<Move["face"], number> = {
  R: 1,
  L: -1,
  U: 1,
  D: -1,
  F: 1,
  B: -1,
};

/**
 * Computes the rotation axis, signed angle, and affected-layer predicate for a
 * move on a cube of the given size.
 */
export function getMoveGeometry(move: Move, size: number): MoveGeometry {
  const axis = FACE_AXIS[move.face];
  const max = size - 1;
  const layerIndex = layerIndexFor(move, size);

  // Clockwise quarter turn is -90 degrees in this coordinate convention; prime
  // is +90; a half turn animates -180.
  const magnitude = move.amount === 2 ? Math.PI : Math.PI / 2;
  const direction = move.amount === 3 ? 1 : -1;
  const angle = FACE_SIGN[move.face] * direction * magnitude;

  return {
    axis,
    angle,
    isAffected: ([x, y, z]) => {
      switch (axis) {
        case "x":
          return x === layerIndex;
        case "y":
          return y === layerIndex;
        case "z":
          return z === layerIndex;
      }
    },
  };

  function layerIndexFor(m: Move, s: number): number {
    const depth = m.layer - 1;
    switch (m.face) {
      case "R":
        return s - 1 - depth;
      case "L":
        return depth;
      case "U":
        return s - 1 - depth;
      case "D":
        return depth;
      case "F":
        return s - 1 - depth;
      case "B":
        return depth;
    }
    return max;
  }
}
