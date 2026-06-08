/**
 * Ground-truth cross-check: the oriented canonical 3x3 model (fixed solver state
 * + orientation) must reproduce the same physical cube as the independent grid
 * engine, which moves cubies directly. We transform the canonical visual into
 * world space via the orientation and compare cubie-by-cubie.
 */
import { describe, expect, it } from "vitest";
import { createCubeModel } from "../model/cube-model";
import { applyGridMove } from "../model/state-grid";
import { createSolvedGrid, gridToVisual } from "../model/state-grid";
import { Face } from "../model/faces";
import { CubeFace } from "../model/faces";
import { VisualCubieState } from "../model/state-visual";
import { parseSequence } from "./notation";
import { Mat3, toMatrixElements, worldFaceForCubeFace } from "./orientation";

const WORLD_TO_FACE: Record<CubeFace, Face> = {
  top: "U",
  bottom: "D",
  left: "L",
  right: "R",
  front: "F",
  back: "B",
};
const FACE_TO_WORLD: Record<Face, CubeFace> = {
  U: "top",
  D: "bottom",
  L: "left",
  R: "right",
  F: "front",
  B: "back",
};

/** Maps a canonical-frame visual into world space using the orientation. */
function toWorld(visual: VisualCubieState, o: Mat3): Map<string, string> {
  const m = toMatrixElements(o);
  const c = (visual.size - 1) / 2;
  const out = new Map<string, string>();
  for (const cubie of visual.cubies) {
    const [x, y, z] = cubie.gridPosition;
    const local = [x - c, y - c, z - c];
    const wx = m[0] * local[0] + m[1] * local[1] + m[2] * local[2] + c;
    const wy = m[3] * local[0] + m[4] * local[1] + m[5] * local[2] + c;
    const wz = m[6] * local[0] + m[7] * local[1] + m[8] * local[2] + c;
    const stickers: string[] = [];
    for (const localFace of Object.keys(cubie.stickerColors) as CubeFace[]) {
      const worldFace = FACE_TO_WORLD[worldFaceForCubeFace(o, WORLD_TO_FACE[localFace])];
      stickers.push(`${worldFace}=${cubie.stickerColors[localFace]}`);
    }
    out.set(`${wx},${wy},${wz}`, stickers.sort().join("|"));
  }
  return out;
}

/** Maps a grid visual into the same comparable form. */
function gridWorld(visual: VisualCubieState): Map<string, string> {
  const out = new Map<string, string>();
  for (const cubie of visual.cubies) {
    const [x, y, z] = cubie.gridPosition;
    const stickers = (Object.keys(cubie.stickerColors) as CubeFace[])
      .map((f) => `${f}=${cubie.stickerColors[f]}`)
      .sort()
      .join("|");
    out.set(`${x},${y},${z}`, stickers);
  }
  return out;
}

const SEQUENCES = [
  "R U R' U'",
  "x",
  "y'",
  "z2",
  "M",
  "E'",
  "S",
  "Rw",
  "Lw'",
  "Uw2",
  "R U Rw M x F' S U' Lw D' y' B M2 z",
];

describe("oriented 3x3 model matches the grid engine", () => {
  it.each(SEQUENCES)("sequence %s", (seq) => {
    const moves = parseSequence(seq);

    let oriented = createCubeModel(3);
    for (const m of moves) oriented = oriented.applyMove(m);

    let grid = createSolvedGrid(3);
    for (const m of moves) grid = applyGridMove(grid, m);

    const orientedWorld = toWorld(oriented.toVisual(), oriented.orientation);
    const gridWorldMap = gridWorld(gridToVisual(grid));

    expect(orientedWorld).toEqual(gridWorldMap);
  });
});
