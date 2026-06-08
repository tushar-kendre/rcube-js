import { CubeState3x3 } from "../cube/model/state-3x3";
import { Move } from "../cube/moves/notation";
import { solveCube } from "./beginner/last-layer-corners";
import { buildSolutionPlan, SolutionPlan } from "./plan";
import { solveCubeCFOP } from "./cfop/solve";

export type SolveMethod = "beginner" | "cfop";

export interface SolverMethod {
  id: SolveMethod;
  label: string;
  subtitle: string;
  solve(state: CubeState3x3): Move[];
  buildPlan(state: CubeState3x3): SolutionPlan;
}

const BEGINNER: SolverMethod = {
  id: "beginner",
  label: "Beginner Method",
  subtitle: "Cross → corners → F2L → LL cross → edges → corners",
  solve: solveCube,
  buildPlan: (state) => buildSolutionPlan(state, "beginner"),
};

const CFOP: SolverMethod = {
  id: "cfop",
  label: "CFOP",
  subtitle: "Cross → F2L → OLL → PLL",
  solve: solveCubeCFOP,
  buildPlan: (state) => buildSolutionPlan(state, "cfop"),
};

const SOLVERS: Record<SolveMethod, SolverMethod> = {
  beginner: BEGINNER,
  cfop: CFOP,
};

export function getSolver(method: SolveMethod): SolverMethod {
  return SOLVERS[method];
}

export const SOLVE_METHODS: SolveMethod[] = ["beginner", "cfop"];

export { BEGINNER, CFOP };
