/**
 * Public API for cube solvers.
 *
 * Currently this implements the beginner method's first layer (white cross +
 * white corners). Solvers operate on the canonical 3x3 state from the `cube`
 * module and return standard move sequences; they perform no graph search and
 * depend on neither React nor Three.js.
 */

export { solveWhiteCross, isCrossSolved } from "./beginner/white-cross";
export {
  solveFirstLayer,
  solveFirstLayerCorners,
  isFirstLayerSolved,
} from "./beginner/first-layer";
export {
  solveSecondLayer,
  solveTwoLayers,
  isSecondLayerSolved,
} from "./beginner/second-layer";
export {
  solveLastLayerCross,
  solveThroughLastLayerCross,
  isLastLayerCrossSolved,
} from "./beginner/last-layer-cross";
export {
  solveLastLayerEdges,
  solveThroughLastLayerEdges,
  isLastLayerEdgesSolved,
} from "./beginner/last-layer-edges";
export {
  solveLastLayerCorners,
  solveCube,
  isCubeSolved,
} from "./beginner/last-layer-corners";
export {
  buildSolutionPlan,
  flattenPlan,
  locateInPlan,
  type SolutionPlan,
  type SolutionSegment,
  type SolutionStageId,
} from "./plan";
export { solveCubeCFOP } from "./cfop/solve";
export {
  getSolver,
  SOLVE_METHODS,
  type SolveMethod,
  type SolverMethod,
} from "./registry";
export {
  benchmarkMethods,
  countMovesByMethod,
  formatBenchmarkSummary,
  type MethodBenchmarkResult,
  type MethodStats,
  type TrialComparison,
} from "./benchmark";
