import { isCrossSolved, solveWhiteCross } from "../beginner/white-cross";
import { isF2LSolved, solveF2L } from "./f2l/solve";
import { isOLLSolved, solveOLL } from "./oll/solve";
import { isCubeSolved, solvePLL } from "./pll/solve";

export type CfopStageId = "cross" | "cfop_f2l" | "cfop_oll" | "cfop_pll";

export interface CfopStageDef {
  id: CfopStageId;
  title: string;
  description: string;
  isSolved: typeof isCrossSolved;
  solve: typeof solveWhiteCross;
}

export const CFOP_STAGES: CfopStageDef[] = [
  {
    id: "cross",
    title: "White Cross",
    description: "Form a white cross on top, matching edge colors to centers.",
    isSolved: isCrossSolved,
    solve: solveWhiteCross,
  },
  {
    id: "cfop_f2l",
    title: "F2L (4 pairs)",
    description: "Insert corner-edge pairs to complete the first two layers.",
    isSolved: isF2LSolved,
    solve: solveF2L,
  },
  {
    id: "cfop_oll",
    title: "OLL",
    description: "Orient all last-layer stickers in one step (57 cases).",
    isSolved: isOLLSolved,
    solve: solveOLL,
  },
  {
    id: "cfop_pll",
    title: "PLL",
    description: "Permute the last layer to finish the cube (21 cases).",
    isSolved: isCubeSolved,
    solve: solvePLL,
  },
];
