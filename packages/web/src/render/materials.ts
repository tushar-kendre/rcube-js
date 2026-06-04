/**
 * Shared Three.js resources for the cube renderer.
 *
 * Geometries and materials are created once at module load and reused across
 * every cubie, so an N x N cube allocates a constant number of GPU resources
 * regardless of size. Sticker color materials are cached lazily per color.
 */

import { BoxGeometry, MeshLambertMaterial, PlaneGeometry } from "three";
import { COLOR_MAP, CubeColor, CubeFace } from "../cube/model/faces";

export const CUBIE_SIZE = 0.95;
export const STICKER_SIZE = 0.9;
/** Distance from the cubie center to a sticker plane (avoids z-fighting). */
export const STICKER_OFFSET = 0.501;

/** Single shared cubie body geometry. */
export const cubieGeometry = new BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE);

/** Single shared sticker plane geometry. */
export const stickerGeometry = new PlaneGeometry(STICKER_SIZE, STICKER_SIZE);

/** Shared dark material for the plastic cubie body. */
export const bodyMaterial = new MeshLambertMaterial({ color: "#1a1a1a" });

const stickerMaterials = new Map<CubeColor, MeshLambertMaterial>();

/** Returns a cached material for a sticker color. */
export function getStickerMaterial(color: CubeColor): MeshLambertMaterial {
  let material = stickerMaterials.get(color);
  if (!material) {
    material = new MeshLambertMaterial({ color: COLOR_MAP[color] });
    stickerMaterials.set(color, material);
  }
  return material;
}

/** Outward normal direction for each face's sticker. */
export const FACE_NORMAL: Record<CubeFace, [number, number, number]> = {
  front: [0, 0, 1],
  back: [0, 0, -1],
  right: [1, 0, 0],
  left: [-1, 0, 0],
  top: [0, 1, 0],
  bottom: [0, -1, 0],
};

/** Rotation that orients a sticker plane outward on each face. */
export const FACE_ROTATION: Record<CubeFace, [number, number, number]> = {
  front: [0, 0, 0],
  back: [0, Math.PI, 0],
  right: [0, Math.PI / 2, 0],
  left: [0, -Math.PI / 2, 0],
  top: [-Math.PI / 2, 0, 0],
  bottom: [Math.PI / 2, 0, 0],
};
