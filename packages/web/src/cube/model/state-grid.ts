/**
 * General grid-based cube model for arbitrary N x N x N cubes.
 *
 * Each visible cubie tracks its current grid position and the color shown on
 * each of its faces. A move rotates the affected layer's cubies: positions are
 * permuted by a 90-degree coordinate rotation and sticker faces are relabeled
 * by a face cycle. This direct color tracking avoids orientation matrices and
 * keeps the renderer trivial.
 *
 * The canonical 3x3 model is preferred for size 3 (it powers the solvers); this
 * grid model handles every other size and the visual layer for those sizes.
 */

import { CubeColor, CubeFace, DEFAULT_CUBE_COLORS } from "./faces";
import { Move } from "../moves/notation";
import { VisualCubie, VisualCubieState } from "./state-visual";

export interface GridCubie {
  id: number;
  position: [number, number, number];
  stickers: Partial<Record<CubeFace, CubeColor>>;
}

export interface GridCubeState {
  size: number;
  cubies: GridCubie[];
}

function visibleFaces(x: number, y: number, z: number, size: number): CubeFace[] {
  const max = size - 1;
  const faces: CubeFace[] = [];
  if (x === 0) faces.push("left");
  if (x === max) faces.push("right");
  if (y === 0) faces.push("bottom");
  if (y === max) faces.push("top");
  if (z === 0) faces.push("back");
  if (z === max) faces.push("front");
  return faces;
}

/** Builds a solved grid cube of the given size. */
export function createSolvedGrid(size: number): GridCubeState {
  const cubies: GridCubie[] = [];
  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const faces = visibleFaces(x, y, z, size);
        if (faces.length === 0) continue;
        const stickers: Partial<Record<CubeFace, CubeColor>> = {};
        for (const face of faces) {
          stickers[face] = DEFAULT_CUBE_COLORS[face];
        }
        cubies.push({
          id: x + y * size + z * size * size,
          position: [x, y, z],
          stickers,
        });
      }
    }
  }
  return { size, cubies };
}

// Clockwise quarter-turn position rotations per face (max = size - 1).
const POSITION_ROTATION: Record<
  Move["face"],
  (x: number, y: number, z: number, max: number) => [number, number, number]
> = {
  R: (x, y, z, max) => [x, z, max - y],
  L: (x, y, z, max) => [x, max - z, y],
  U: (x, y, z, max) => [max - z, y, x],
  D: (x, y, z, max) => [z, y, max - x],
  F: (x, y, z, max) => [y, max - x, z],
  B: (x, y, z, max) => [max - y, x, z],
};

// Clockwise quarter-turn sticker face relabeling per face: a sticker on `key`
// ends up on `value`. Faces omitted (the rotation axis faces) stay put.
const FACE_CYCLE: Record<Move["face"], Partial<Record<CubeFace, CubeFace>>> = {
  R: { front: "top", top: "back", back: "bottom", bottom: "front" },
  L: { front: "bottom", bottom: "back", back: "top", top: "front" },
  U: { front: "left", left: "back", back: "right", right: "front" },
  D: { front: "right", right: "back", back: "left", left: "front" },
  F: { top: "right", right: "bottom", bottom: "left", left: "top" },
  B: { top: "left", left: "bottom", bottom: "right", right: "top" },
};

function layerIndexFor(move: Move, size: number): number {
  const depth = move.layer - 1;
  switch (move.face) {
    case "R":
    case "U":
    case "F":
      return size - 1 - depth;
    case "L":
    case "D":
    case "B":
      return depth;
  }
}

function isAffected(move: Move, pos: [number, number, number], size: number): boolean {
  const layerIndex = layerIndexFor(move, size);
  switch (move.face) {
    case "R":
    case "L":
      return pos[0] === layerIndex;
    case "U":
    case "D":
      return pos[1] === layerIndex;
    case "F":
    case "B":
      return pos[2] === layerIndex;
  }
}

function rotateCubieCW(cubie: GridCubie, face: Move["face"], max: number): GridCubie {
  const [x, y, z] = cubie.position;
  const position = POSITION_ROTATION[face](x, y, z, max);

  const cycle = FACE_CYCLE[face];
  const stickers: Partial<Record<CubeFace, CubeColor>> = {};
  for (const key of Object.keys(cubie.stickers) as CubeFace[]) {
    const target = cycle[key] ?? key;
    stickers[target] = cubie.stickers[key];
  }

  return { id: cubie.id, position, stickers };
}

/** Applies a move to a grid state, returning a new state. */
export function applyGridMove(state: GridCubeState, move: Move): GridCubeState {
  const { size } = state;
  const max = size - 1;
  const turns = move.amount; // number of clockwise quarter turns

  let cubies = state.cubies;
  for (let turn = 0; turn < turns; turn++) {
    cubies = cubies.map((cubie) =>
      isAffected(move, cubie.position, size) ? rotateCubieCW(cubie, move.face, max) : cubie,
    );
  }

  return { size, cubies };
}

/** True if every face of the grid cube is uniform (solved). */
export function isGridSolved(state: GridCubeState): boolean {
  return state.cubies.every((cubie) =>
    (Object.keys(cubie.stickers) as CubeFace[]).every(
      (face) => cubie.stickers[face] === DEFAULT_CUBE_COLORS[face],
    ),
  );
}

/** Maps a grid state to the renderer's visual representation. */
export function gridToVisual(state: GridCubeState): VisualCubieState {
  const cubies: VisualCubie[] = state.cubies.map((cubie) => ({
    id: cubie.id,
    gridPosition: cubie.position,
    stickerColors: cubie.stickers,
  }));
  return { size: state.size, cubies };
}
