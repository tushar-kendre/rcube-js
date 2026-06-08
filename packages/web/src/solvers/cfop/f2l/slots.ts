import { Corner, Edge } from "../../../cube/model/state-3x3";

/** F2L slot: U-layer corner slot + middle-layer edge slot. */
export interface F2lSlot {
  name: "FR" | "FL" | "BL" | "BR";
  cornerSlot: Corner;
  edgeSlot: Edge;
  cornerId: number;
  edgeId: number;
  /** U turns before treating this slot as FR (see solve.ts). */
  ySetup: number;
}

/** Solve order: FR → FL → BL → BR. */
export const F2L_SLOTS: readonly F2lSlot[] = [
  { name: "FR", cornerSlot: Corner.URF, edgeSlot: Edge.FR, cornerId: 0, edgeId: 8, ySetup: 0 },
  { name: "FL", cornerSlot: Corner.UFL, edgeSlot: Edge.FL, cornerId: 1, edgeId: 9, ySetup: 3 },
  { name: "BL", cornerSlot: Corner.ULB, edgeSlot: Edge.BL, cornerId: 2, edgeId: 10, ySetup: 2 },
  { name: "BR", cornerSlot: Corner.UBR, edgeSlot: Edge.BR, cornerId: 3, edgeId: 11, ySetup: 1 },
];

/** FR slot indices after y-normalization. */
export const FR_CORNER_SLOT = Corner.URF;
export const FR_EDGE_SLOT = Edge.FR;
