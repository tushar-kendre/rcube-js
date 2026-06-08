/**
 * Whole-cube orientation tracking.
 *
 * The canonical `cp/co/ep/eo` state is always expressed relative to the cube's
 * centers (white up, etc.). When the cube is physically reoriented (x/y/z, or
 * the implicit reorientation inside a wide/slice move), the centers move; we
 * capture that as a `CubeOrientation`: a 3x3 integer rotation matrix mapping the
 * cube's local axes into world space. Identity means "white up, red front".
 *
 * From the matrix we derive (a) which canonical face currently sits at a given
 * world direction (so a screen-space move like world-`R` is applied to the right
 * canonical face), and (b) a rotation for the renderer's root group.
 *
 * Quarter-turn generators follow the renderer convention where a clockwise turn
 * is -90 degrees about the axis, so the rotation `x` (which follows `R`) sends
 * Front -> Up, matching a real cube.
 */

import { Face } from "../model/faces";

export type Vec3 = readonly [number, number, number];
/** Row-major 3x3 integer rotation matrix (columns are images of local axes). */
export type Mat3 = readonly [Vec3, Vec3, Vec3];
export type RotationAxis = "x" | "y" | "z";

/** Outward unit normal of each face in the cube's local frame. */
export const FACE_NORMAL: Record<Face, Vec3> = {
  R: [1, 0, 0],
  L: [-1, 0, 0],
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
};

const NORMAL_TO_FACE = new Map<string, Face>(
  (Object.keys(FACE_NORMAL) as Face[]).map((f) => [FACE_NORMAL[f].join(","), f]),
);

export const IDENTITY: Mat3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

/** Clockwise quarter-turn (-90 deg) generators about each world axis. */
const QUARTER: Record<RotationAxis, Mat3> = {
  // -90 about X: +Y -> -Z, +Z -> +Y
  x: [
    [1, 0, 0],
    [0, 0, 1],
    [0, -1, 0],
  ],
  // -90 about Y: +Z -> -X, +X -> +Z
  y: [
    [0, 0, -1],
    [0, 1, 0],
    [1, 0, 0],
  ],
  // -90 about Z: +X -> -Y, +Y -> +X
  z: [
    [0, 1, 0],
    [-1, 0, 0],
    [0, 0, 1],
  ],
};

function multiply(a: Mat3, b: Mat3): Mat3 {
  const out: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      out[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
    }
  }
  return out as unknown as Mat3;
}

function applyToVec(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
}

function transpose(m: Mat3): Mat3 {
  return [
    [m[0][0], m[1][0], m[2][0]],
    [m[0][1], m[1][1], m[2][1]],
    [m[0][2], m[1][2], m[2][2]],
  ];
}

function faceFromNormal(v: Vec3): Face {
  const key = `${Math.round(v[0])},${Math.round(v[1])},${Math.round(v[2])}`;
  const face = NORMAL_TO_FACE.get(key);
  if (!face) throw new Error(`No face for normal ${key}`);
  return face;
}

/** The identity orientation (white up, red front). */
export function identityOrientation(): Mat3 {
  return IDENTITY;
}

/** True when the orientation is the identity (cube is in its solved frame). */
export function isIdentity(o: Mat3): boolean {
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      if (o[i][j] !== IDENTITY[i][j]) return false;
  return true;
}

/** Composes a whole-cube rotation about a world axis onto the orientation. */
export function rotate(o: Mat3, axis: RotationAxis, amount: number): Mat3 {
  let world = IDENTITY;
  const turns = ((amount % 4) + 4) % 4;
  for (let i = 0; i < turns; i++) world = multiply(QUARTER[axis], world);
  return multiply(world, o);
}

/** Canonical face whose center currently sits at the given world direction. */
export function cubeFaceAtWorld(o: Mat3, worldFace: Face): Face {
  return faceFromNormal(applyToVec(transpose(o), FACE_NORMAL[worldFace]));
}

/** World direction a canonical face currently points toward. */
export function worldFaceForCubeFace(o: Mat3, cubeFace: Face): Face {
  return faceFromNormal(applyToVec(o, FACE_NORMAL[cubeFace]));
}

/** Rotation axis a reference face encodes (R/L -> x, U/D -> y, F/B -> z). */
export function axisForFace(face: Face): RotationAxis {
  if (face === "R" || face === "L") return "x";
  if (face === "U" || face === "D") return "y";
  return "z";
}

/** Flat row-major matrix for building a renderer rotation (e.g. THREE.Matrix4). */
export function toMatrixElements(o: Mat3): number[] {
  return [
    o[0][0], o[0][1], o[0][2],
    o[1][0], o[1][1], o[1][2],
    o[2][0], o[2][1], o[2][2],
  ];
}
