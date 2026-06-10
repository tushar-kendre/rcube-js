import { CubeState3x3 } from "../cube/model/state-3x3";
import { Move } from "../cube/moves/notation";
import { solveCube } from "./beginner/last-layer-corners";
import { buildSolutionPlan, SolutionPlan } from "./plan";
import { solveCubeCFOP } from "./cfop/solve";
import { solveKociemba } from "./kociemba/solve";

export type SolveMethod = "beginner" | "cfop" | "kociemba";

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

const KOCIEMBA: SolverMethod = {
  id: "kociemba",
  label: "Kociemba",
  subtitle: "Two-phase near-optimal solver (~20 moves)",
  solve: solveKociemba,
  buildPlan: (state) => buildSolutionPlan(state, "kociemba"),
};

const SOLVERS: Record<SolveMethod, SolverMethod> = {
  beginner: BEGINNER,
  cfop: CFOP,
  kociemba: KOCIEMBA,
};

export function getSolver(method: SolveMethod): SolverMethod {
  return SOLVERS[method];
}

export const SOLVE_METHODS: SolveMethod[] = ["beginner", "cfop", "kociemba"];

export { BEGINNER, CFOP, KOCIEMBA };
