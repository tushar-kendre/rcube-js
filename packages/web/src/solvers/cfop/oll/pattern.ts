import { CubeState3x3 } from "../../../cube/model/state-3x3";

/** True when all last-layer stickers are oriented (yellow on D). */
export function isOLLSolved(state: CubeState3x3): boolean {
  for (let i = 4; i <= 7; i++) {
    if (state.co[i] !== 0 || state.eo[i] !== 0) return false;
  }
  return true;
}
