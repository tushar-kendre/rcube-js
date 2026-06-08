/**
 * Orientation-aware move application for the canonical 3x3 model.
 *
 * A move arrives in the screen frame (what the user sees / clicks). We keep the
 * canonical `cp/co/ep/eo` solver state in a fixed frame and track the cube's
 * spatial orientation separately:
 *
 *   - face moves remap through the orientation to the canonical face currently
 *     in that screen position, then apply the existing table;
 *   - rotations update only the orientation;
 *   - wide and slice moves expand into a whole-cube rotation plus compensating
 *     outer turns (standard identities), so the centers move (orientation
 *     changes) while the canonical state stays consistent.
 *
 * Half/quarter-prime wide and slice moves repeat the unit (amount = 1) expansion,
 * because the rotation inside changes the frame between repetitions.
 */

import { CubeState3x3 } from "../model/state-3x3";
import { Face } from "../model/faces";
import { Move } from "./notation";
import { applyMove as applyFaceMove } from "./apply";
import {
  Mat3,
  IDENTITY,
  RotationAxis,
  axisForFace,
  cubeFaceAtWorld,
  rotate,
} from "./orientation";

export interface OrientedState {
  state: CubeState3x3;
  orientation: Mat3;
}

const OPPOSITE: Record<Face, Face> = { R: "L", L: "R", U: "D", D: "U", F: "B", B: "F" };

/** Reference face for a rotation axis (the positive end). */
const AXIS_REF_FACE: Record<RotationAxis, Face> = { x: "R", y: "U", z: "F" };

/** Wide face -> the whole-cube rotation it follows. */
function wideRotation(face: Face): Move {
  const axis = axisForFace(face);
  const positive = face === "R" || face === "U" || face === "F";
  return { kind: "rotation", face: AXIS_REF_FACE[axis], layer: 1, amount: positive ? 1 : 3 };
}

const cw = (face: Face): Move => ({ kind: "face", face, layer: 1, amount: 1 });

/** Unit (amount = 1) screen-frame expansion of a wide move (Rw = L x). */
function wideUnit(face: Face): Move[] {
  return [cw(OPPOSITE[face]), wideRotation(face)];
}

/**
 * Unit (amount = 1) screen-frame expansion of a slice move. A slice follows its
 * reference face (M->L, E->D, S->F) and equals the opposite wide move undone
 * plus that opposite outer turn: M = Rw' R, E = Uw' U, S = Bw' B.
 */
function sliceUnit(refFace: Face): Move[] {
  const opposite = OPPOSITE[refFace];
  return [...invertMoves(wideUnit(opposite)), cw(opposite)];
}

function invertMoves(moves: Move[]): Move[] {
  return [...moves].reverse().map((m) => ({
    ...m,
    amount: (m.amount === 1 ? 3 : m.amount === 3 ? 1 : 2) as 1 | 2 | 3,
  }));
}

function applyUnitList(os: OrientedState, moves: Move[]): OrientedState {
  let cur = os;
  for (const m of moves) cur = applyOrientedMove(cur, m);
  return cur;
}

/** Applies a screen-frame move to the oriented canonical state. */
export function applyOrientedMove(os: OrientedState, move: Move): OrientedState {
  const kind = move.kind ?? "face";

  if (kind === "rotation") {
    return {
      state: os.state,
      orientation: rotate(os.orientation, axisForFace(move.face), move.amount),
    };
  }

  if (kind === "face") {
    const canonicalFace = cubeFaceAtWorld(os.orientation, move.face);
    return {
      state: applyFaceMove(os.state, {
        kind: "face",
        face: canonicalFace,
        layer: move.layer,
        amount: move.amount,
      }),
      orientation: os.orientation,
    };
  }

  if (kind === "wide") {
    let cur = os;
    for (let i = 0; i < move.amount; i++) cur = applyUnitList(cur, wideUnit(move.face));
    return cur;
  }

  // slice
  let cur = os;
  for (let i = 0; i < move.amount; i++) cur = applyUnitList(cur, sliceUnit(move.face));
  return cur;
}

const invertAmount = (a: 1 | 2 | 3): 1 | 2 | 3 => (a === 1 ? 3 : a === 3 ? 1 : 2);

/** Reference (positive) face encoding each rotation axis. */
const ROTATION_REF: Record<RotationAxis, Face> = { x: "R", y: "U", z: "F" };
/** Reference face encoding each slice (M->L axis x, E->D axis y, S->F axis z). */
const SLICE_REF: Record<RotationAxis, Face> = { x: "L", y: "D", z: "F" };

/**
 * Re-expresses a move whose reference face is relabeled by `mapFace`. Face and
 * wide moves just take the new face; rotation and slice moves normalize back to
 * their canonical reference face, inverting the turn when the reference flips to
 * the opposite end of the axis (the same physical turn named from the far side).
 */
export function remapMove(move: Move, mapFace: (f: Face) => Face): Move {
  const kind = move.kind ?? "face";
  const f2 = mapFace(move.face);
  if (kind === "face" || kind === "wide") return { ...move, face: f2 };

  const axis = axisForFace(f2);
  if (kind === "rotation") {
    const positive = f2 === "R" || f2 === "U" || f2 === "F";
    return { ...move, face: ROTATION_REF[axis], amount: positive ? move.amount : invertAmount(move.amount) };
  }
  const onRef = f2 === "L" || f2 === "D" || f2 === "F";
  return { ...move, face: SLICE_REF[axis], amount: onRef ? move.amount : invertAmount(move.amount) };
}

/**
 * Rewrites a sequence into an equivalent one without whole-cube rotations,
 * conjugating each subsequent move by the rotations seen so far. For a sequence
 * with net-identity rotation this preserves the canonical effect exactly while
 * removing the rotation tokens (so move counts are not inflated).
 */
export function foldRotations(moves: Move[]): Move[] {
  let o = IDENTITY;
  const out: Move[] = [];
  for (const m of moves) {
    if ((m.kind ?? "face") === "rotation") {
      o = rotate(o, axisForFace(m.face), m.amount);
      continue;
    }
    out.push(remapMove(m, (f) => cubeFaceAtWorld(o, f)));
  }
  return out;
}
