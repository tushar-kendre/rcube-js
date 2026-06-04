/**
 * Public API for the framework-agnostic cube logic. Nothing here imports React
 * or Three.js; the rendering and solver layers build on top of these exports.
 */

export * from "./model/faces";
export * from "./model/state-3x3";
export * from "./model/state-visual";
export {
  type CubeModel,
  createCubeModel,
  modelFromState,
} from "./model/cube-model";
export {
  type GridCubeState,
  type GridCubie,
  createSolvedGrid,
  applyGridMove,
  isGridSolved,
  gridToVisual,
} from "./model/state-grid";

export {
  type Move,
  parseMove,
  parseSequence,
  formatMove,
  formatSequence,
  invertMove,
  invertSequence,
} from "./moves/notation";
export { applyMove, applyMoves, applyNotation } from "./moves/apply";

export {
  toFacelets,
  toFaceletString,
  fromFacelets,
  faceletIndexForGrid,
} from "./convert/facelets";
export { stateToVisual } from "./convert/visual";

export { isSolved, isValidState } from "./validate/solved";
export { hashState, hashEdges } from "./validate/hash";
