/**
 * Builds a segmented beginner-method solution plan for tutorial playback.
 */

import { applyMoves } from "../cube/moves/apply";
import { CubeState3x3, cloneState } from "../cube/model/state-3x3";
import { Move } from "../cube/moves/notation";
import { isCrossSolved, solveWhiteCross } from "./beginner/white-cross";
import {
  isFirstLayerSolved,
  solveFirstLayerCorners,
} from "./beginner/first-layer";
import { isSecondLayerSolved, solveSecondLayer } from "./beginner/second-layer";
import {
  isLastLayerCrossSolved,
  solveLastLayerCross,
} from "./beginner/last-layer-cross";
import {
  isLastLayerEdgesSolved,
  solveLastLayerEdges,
} from "./beginner/last-layer-edges";
import {
  isCubeSolved,
  solveLastLayerCorners,
} from "./beginner/last-layer-corners";

export type SolutionStageId =
  | "cross"
  | "first_layer"
  | "f2l"
  | "oll_cross"
  | "pll_edges"
  | "pll_corners";

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

const STAGES: StageDef[] = [
  {
    id: "cross",
    title: "White Cross",
    description: "Form a white cross on top, matching edge colors to centers.",
    isSolved: isCrossSolved,
    solve: solveWhiteCross,
  },
  {
    id: "first_layer",
    title: "First Layer Corners",
    description: "Insert the four white corner pieces to complete the first layer.",
    isSolved: isFirstLayerSolved,
    solve: solveFirstLayerCorners,
  },
  {
    id: "f2l",
    title: "Second Layer (F2L)",
    description: "Place the four middle-layer edges using right and left insert algorithms.",
    isSolved: isSecondLayerSolved,
    solve: solveSecondLayer,
  },
  {
    id: "oll_cross",
    title: "Yellow Cross (OLL)",
    description: "Orient the last-layer edges so yellow faces down.",
    isSolved: isLastLayerCrossSolved,
    solve: solveLastLayerCross,
  },
  {
    id: "pll_edges",
    title: "Align Edges (PLL)",
    description: "Permute last-layer edges so side colors match centers.",
    isSolved: isLastLayerEdgesSolved,
    solve: solveLastLayerEdges,
  },
  {
    id: "pll_corners",
    title: "Corners (PLL)",
    description: "Position then orient the last-layer corners to finish the cube.",
    isSolved: isCubeSolved,
    solve: solveLastLayerCorners,
  },
];

/** Builds a segmented plan from the current state through the full beginner solve. */
export function buildSolutionPlan(state: CubeState3x3): SolutionPlan {
  let s = cloneState(state);
  const segments: SolutionSegment[] = [];

  for (const stage of STAGES) {
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
    if (moves.length > 0) s = applyMoves(s, moves);
  }

  const totalMoves = segments.reduce((n, seg) => n + seg.moveCount, 0);
  return { segments, totalMoves };
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
