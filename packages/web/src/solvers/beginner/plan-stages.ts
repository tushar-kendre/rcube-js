import { CubeState3x3 } from "../../cube/model/state-3x3";
import { Move } from "../../cube/moves/notation";
import { isCrossSolved, solveWhiteCross } from "./white-cross";
import { isFirstLayerSolved, solveFirstLayerCorners } from "./first-layer";
import { isSecondLayerSolved, solveSecondLayer } from "./second-layer";
import { isLastLayerCrossSolved, solveLastLayerCross } from "./last-layer-cross";
import { isLastLayerEdgesSolved, solveLastLayerEdges } from "./last-layer-edges";
import { isCubeSolved, solveLastLayerCorners } from "./last-layer-corners";

export type BeginnerStageId =
  | "cross"
  | "first_layer"
  | "f2l"
  | "oll_cross"
  | "pll_edges"
  | "pll_corners";

export interface StageDef {
  id: BeginnerStageId;
  title: string;
  description: string;
  isSolved: (s: CubeState3x3) => boolean;
  solve: (s: CubeState3x3) => Move[];
}

export const BEGINNER_STAGES: StageDef[] = [
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
