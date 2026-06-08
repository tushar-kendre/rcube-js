import { CubeState3x3 } from "../../../cube/model/state-3x3";
import { isCrossSolved } from "../../beginner/white-cross";
import { FR_CORNER_SLOT, FR_EDGE_SLOT, F2L_SLOTS } from "./slots";

/** True when the FR slot (after y-normalization) is solved. */
export function isFrSlotSolved(state: CubeState3x3): boolean {
  return (
    state.cp[FR_CORNER_SLOT] === 0 &&
    state.co[FR_CORNER_SLOT] === 0 &&
    state.ep[FR_EDGE_SLOT] === 8 &&
    state.eo[FR_EDGE_SLOT] === 0
  );
}

/** True when cross + all four F2L pairs are solved. */
export function isF2LSolved(state: CubeState3x3): boolean {
  if (!isCrossSolved(state)) return false;
  for (const slot of F2L_SLOTS) {
    const cs = slot.cornerSlot;
    const es = slot.edgeSlot;
    if (state.cp[cs] !== slot.cornerId || state.co[cs] !== 0) return false;
    if (state.ep[es] !== slot.edgeId || state.eo[es] !== 0) return false;
  }
  return true;
}

/** True when cross is intact and all slots before `slotIndex` are solved. */
export function isPriorSlotsSolved(state: CubeState3x3, slotIndex: number): boolean {
  if (!isCrossSolved(state)) return false;
  for (let i = 0; i < slotIndex; i++) {
    const slot = F2L_SLOTS[i];
    const cs = slot.cornerSlot;
    const es = slot.edgeSlot;
    if (state.cp[cs] !== slot.cornerId || state.co[cs] !== 0) return false;
    if (state.ep[es] !== slot.edgeId || state.eo[es] !== 0) return false;
  }
  return true;
}
