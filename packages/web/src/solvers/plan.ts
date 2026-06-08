/**
 * Builds segmented solution plans and locates moves within them.
 */

import { applySeqExt } from "./common/apply-seq";
import { CubeState3x3, cloneState } from "../cube/model/state-3x3";
import { Move } from "../cube/moves/notation";
import { BEGINNER_STAGES, BeginnerStageId } from "./beginner/plan-stages";
import { CFOP_STAGES, CfopStageId } from "./cfop/plan-stages";
import type { SolveMethod } from "./registry";

export type SolutionStageId = BeginnerStageId | CfopStageId;

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

const STAGES_BY_METHOD: Record<SolveMethod, StageDef[]> = {
  beginner: BEGINNER_STAGES,
  cfop: CFOP_STAGES,
};

/** Builds a segmented plan from the current state through a full solve. */
export function buildSolutionPlan(
  state: CubeState3x3,
  method: SolveMethod = "beginner",
): SolutionPlan {
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
