/**
 * Derives a `VisualCubieState` (renderer input) from the canonical 3x3 model.
 *
 * The 3x3 state is converted to facelets, then each visible grid cubie reads
 * its sticker colors straight out of the facelet array. This removes any need
 * for per-cubie orientation matrices in the rendering path.
 */

import { CubeColor, CubeFace, FACE_COLOR } from "../model/faces";
import { CubeState3x3 } from "../model/state-3x3";
import { VisualCubie, VisualCubieState } from "../model/state-visual";
import { faceletIndexForGrid, toFacelets } from "./facelets";

const SIZE = 3;

/** Visible faces for a grid cubie at (x, y, z) on a size-3 cube. */
function visibleFaces(x: number, y: number, z: number): CubeFace[] {
  const faces: CubeFace[] = [];
  if (x === 0) faces.push("left");
  if (x === SIZE - 1) faces.push("right");
  if (y === 0) faces.push("bottom");
  if (y === SIZE - 1) faces.push("top");
  if (z === 0) faces.push("back");
  if (z === SIZE - 1) faces.push("front");
  return faces;
}

/** Converts a canonical 3x3 state into a renderable visual state. */
export function stateToVisual(state: CubeState3x3): VisualCubieState {
  const facelets = toFacelets(state);
  const cubies: VisualCubie[] = [];

  for (let z = 0; z < SIZE; z++) {
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const faces = visibleFaces(x, y, z);
        if (faces.length === 0) continue;

        const stickerColors: Partial<Record<CubeFace, CubeColor>> = {};
        for (const face of faces) {
          const idx = faceletIndexForGrid(face, x, y, z);
          stickerColors[face] = FACE_COLOR[facelets[idx]];
        }

        cubies.push({
          id: x + y * SIZE + z * SIZE * SIZE,
          gridPosition: [x, y, z],
          stickerColors,
        });
      }
    }
  }

  return { size: SIZE, cubies };
}
