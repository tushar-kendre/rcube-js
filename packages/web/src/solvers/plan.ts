/**
 * Builds segmented solution plans and locates moves within them.
 */

import { applySeqExt } from "./common/apply-seq";
import { GridCubeState } from "../cube/model/state-grid";
import { CubeState3x3, cloneState } from "../cube/model/state-3x3";
import { Move } from "../cube/moves/notation";
import { isSolved } from "../cube/validate/solved";
import { BEGINNER_STAGES, BeginnerStageId } from "./beginner/plan-stages";
import { CFOP_STAGES, CfopStageId } from "./cfop/plan-stages";
import { inG1, solveKociembaPhases } from "./kociemba/solve";
import { isPocketSolved, solvePocket } from "./pocket/solve";
import type { SolveMethod } from "./registry";

/** Plan segment ids for the Kociemba two-phase solver. */
export type KociembaStageId = "kociemba_phase1" | "kociemba_phase2";

/** Plan segment id for the optimal 2x2 (pocket) solver. */
export type PocketStageId = "pocket_solve";

export type SolutionStageId = BeginnerStageId | CfopStageId | KociembaStageId | PocketStageId;

export interface SolutionSegment {
  id: SolutionStageId;
  title: string;
  description: string;
  moves: Move[];
  moveCount: number;
  /** True when this stage was already complete before solving. */
  alreadyComplete: boolean;
}

export interface SolutionPlan {
  method: SolveMethod;
  segments: SolutionSegment[];
  totalMoves: number;
}

interface StageDef {
  id: SolutionStageId;
  title: string;
  description: string;
  isSolved: (s: CubeState3x3) => boolean;
  solve: (s: CubeState3x3) => Move[];
}

const STAGES_BY_METHOD: Record<"beginner" | "cfop", StageDef[]> = {
  beginner: BEGINNER_STAGES,
  cfop: CFOP_STAGES,
};

/**
 * Builds the Kociemba plan as two segments (phase 1 → G1, phase 2 → solved). The
 * optimal total is found jointly, so this runs one full solve and splits it
 * rather than solving stage by stage.
 */
function buildKociembaPlan(state: CubeState3x3): SolutionPlan {
  const { phase1, phase2 } = solveKociembaPhases(state);
  const segments: SolutionSegment[] = [
    {
      id: "kociemba_phase1",
      title: "Phase 1",
      description: "Reduce to the ⟨U, D, R2, L2, F2, B2⟩ subgroup: orient all edges and corners and place the E-slice edges.",
      moves: phase1,
      moveCount: phase1.length,
      alreadyComplete: inG1(state),
    },
    {
      id: "kociemba_phase2",
      title: "Phase 2",
      description: "Solve the cube within the subgroup using only ⟨U, D, R2, L2, F2, B2⟩.",
      moves: phase2,
      moveCount: phase2.length,
      alreadyComplete: isSolved(state),
    },
  ];
  return { method: "kociemba", segments, totalMoves: phase1.length + phase2.length };
}

/**
 * Builds the optimal 2x2 plan as a single segment. Pocket solutions are a flat
 * optimal sequence, so they do not split into method-style stages.
 */
export function buildPocketPlan(grid: GridCubeState): SolutionPlan {
  const moves = isPocketSolved(grid) ? [] : solvePocket(grid);
  const segment: SolutionSegment = {
    id: "pocket_solve",
    title: "Optimal solve",
    description: "Solve the 2x2 in the fewest possible turns via a precomputed distance table.",
    moves,
    moveCount: moves.length,
    alreadyComplete: isPocketSolved(grid),
  };
  return { method: "kociemba", segments: [segment], totalMoves: moves.length };
}

/** Builds a segmented plan from the current state through a full solve. */
export function buildSolutionPlan(
  state: CubeState3x3,
  method: SolveMethod = "beginner",
): SolutionPlan {
  if (method === "kociemba") return buildKociembaPlan(state);

  const stages = STAGES_BY_METHOD[method];
  let s = cloneState(state);
  const segments: SolutionSegment[] = [];

  for (const stage of stages) {
    const alreadyComplete = stage.isSolved(s);
    const moves = alreadyComplete ? [] : stage.solve(s);
    segments.push({
      id: stage.id,
      title: stage.title,
      description: stage.description,
      moves,
      moveCount: moves.length,
      alreadyComplete,
    });
    if (moves.length > 0) s = applySeqExt(s, moves);
  }

  const totalMoves = segments.reduce((n, seg) => n + seg.moveCount, 0);
  return { method, segments, totalMoves };
}

/** Flat list of all moves in plan order. */
export function flattenPlan(plan: SolutionPlan): Move[] {
  return plan.segments.flatMap((s) => s.moves);
}

/** Global move index → segment index and move index within segment. */
export function locateInPlan(
  plan: SolutionPlan,
  globalIndex: number,
): { segmentIndex: number; moveInSegment: number } {
  let remaining = globalIndex;
  for (let i = 0; i < plan.segments.length; i++) {
    const len = plan.segments[i].moveCount;
    if (remaining < len) return { segmentIndex: i, moveInSegment: remaining };
    remaining -= len;
  }
  return { segmentIndex: plan.segments.length - 1, moveInSegment: 0 };
}
