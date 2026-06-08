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
  /** Rotation axis of the affected layer(s). */
  axis: Axis;
  /** Signed target angle in radians for the animation. */
  angle: number;
  /** Predicate selecting cubies in the rotating layer(s) by grid position. */
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

function coord(axis: Axis, pos: [number, number, number]): number {
  return axis === "x" ? pos[0] : axis === "y" ? pos[1] : pos[2];
}

/**
 * Computes the rotation axis, signed angle, and affected-layer predicate for a
 * move on a cube of the given size.
 *
 * The move's `face` is expected in canonical/local terms (callers remap a
 * screen-space move through the cube orientation first). `wide` selects a range
 * of layers from the face inward, `slice` selects the middle layer, and
 * `rotation` selects every layer.
 */
export function getMoveGeometry(move: Move, size: number): MoveGeometry {
  const axis = FACE_AXIS[move.face];

  const magnitude = move.amount === 2 ? Math.PI : Math.PI / 2;
  const direction = move.amount === 3 ? 1 : -1;
  const angle = FACE_SIGN[move.face] * direction * magnitude;

  const layers = affectedLayers(move, size);
  const set = new Set(layers);

  return {
    axis,
    angle,
    isAffected: (pos) => set.has(coord(axis, pos)),
  };

  function affectedLayers(m: Move, s: number): number[] {
    const positive = m.face === "R" || m.face === "U" || m.face === "F";
    const kind = m.kind ?? "face";

    if (kind === "rotation") {
      return Array.from({ length: s }, (_, i) => i);
    }

    if (kind === "slice") {
      return [Math.floor((s - 1) / 2)];
    }

    if (kind === "wide") {
      const width = Math.min(m.width ?? 2, s);
      return Array.from({ length: width }, (_, d) => (positive ? s - 1 - d : d));
    }

    const depth = m.layer - 1;
    return [positive ? s - 1 - depth : depth];
  }
}
