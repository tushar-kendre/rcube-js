import { describe, expect, it } from "vitest";
import { applyMoves } from "../cube/moves/apply";
import { Corner, Edge, createSolvedState } from "../cube/model/state-3x3";
import { Move, parseMove } from "../cube/moves/notation";
import {
  isLastLayerEdgesSolved,
  solveLastLayerEdges,
  solveThroughLastLayerEdges,
} from "./beginner/last-layer-edges";
import { isLastLayerCrossSolved, solveThroughLastLayerCross } from "./beginner/last-layer-cross";

const FACES = ["U", "D", "L", "R", "F", "B"] as const;
const SUFFIX = ["", "'", "2"] as const;

function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function randomScramble(rng: () => number, length: number): Move[] {
  const moves: Move[] = [];
  let last = "";
  for (let i = 0; i < length; i++) {
    let face = FACES[Math.floor(rng() * FACES.length)];
    while (face === last) face = FACES[Math.floor(rng() * FACES.length)];
    last = face;
    moves.push(parseMove(`${face}${SUFFIX[Math.floor(rng() * SUFFIX.length)]}`));
  }
  return moves;
}

/** Independent ground truth: first two layers + a fully solved D cross. */
function edgesByModel(state: ReturnType<typeof createSolvedState>): boolean {
  const firstEdges = [Edge.UR, Edge.UF, Edge.UL, Edge.UB];
  const firstCorners = [Corner.URF, Corner.UFL, Corner.ULB, Corner.UBR];
  const midEdges = [Edge.FR, Edge.FL, Edge.BL, Edge.BR];
  const dEdges = [Edge.DR, Edge.DF, Edge.DL, Edge.DB];
  return (
    firstEdges.every((s) => state.ep[s] === s && state.eo[s] === 0) &&
    firstCorners.every((s) => state.cp[s] === s && state.co[s] === 0) &&
    midEdges.every((s) => state.ep[s] === s && state.eo[s] === 0) &&
    // D edges fully home (position + orientation); corners may still be off.
    dEdges.every((s) => state.ep[s] === s && state.eo[s] === 0)
  );
}

describe("last-layer edge alignment", () => {
  it("returns no moves for an already-solved cube", () => {
    expect(solveThroughLastLayerEdges(createSolvedState())).toEqual([]);
  });

  it("aligns the cross edges for many random scrambles", () => {
    const rng = makeRng(0x0ce5);
    const trials = 3000;
    let maxLen = 0;
    let total = 0;

    for (let i = 0; i < trials; i++) {
      const scrambled = applyMoves(createSolvedState(), randomScramble(rng, 25));

      const solution = solveThroughLastLayerEdges(scrambled);
      maxLen = Math.max(maxLen, solution.length);
      total += solution.length;
      const result = applyMoves(scrambled, solution);

      expect(isLastLayerEdgesSolved(result), `predicate, trial ${i}`).toBe(true);
      expect(edgesByModel(result), `model check, trial ${i}`).toBe(true);
    }

    console.log(`through LL edges: avg ${(total / trials).toFixed(1)} moves, max ${maxLen}`);
    expect(maxLen).toBeLessThan(160);
  });

  it("keeps the cross oriented and the first two layers intact", () => {
    const rng = makeRng(0xbeef1);
    for (let i = 0; i < 500; i++) {
      const scrambled = applyMoves(createSolvedState(), randomScramble(rng, 25));
      const afterCross = applyMoves(scrambled, solveThroughLastLayerCross(scrambled));
      expect(isLastLayerCrossSolved(afterCross)).toBe(true);

      const result = applyMoves(afterCross, solveLastLayerEdges(afterCross));
      expect(isLastLayerEdgesSolved(result), `not aligned on trial ${i}`).toBe(true);
    }
  });

  it("does not mutate the input state", () => {
    const rng = makeRng(99);
    const scrambled = applyMoves(createSolvedState(), randomScramble(rng, 20));
    const snapshot = {
      cp: scrambled.cp.slice(),
      co: scrambled.co.slice(),
      ep: scrambled.ep.slice(),
      eo: scrambled.eo.slice(),
    };
    solveThroughLastLayerEdges(scrambled);
    expect(scrambled.cp).toEqual(snapshot.cp);
    expect(scrambled.co).toEqual(snapshot.co);
    expect(scrambled.ep).toEqual(snapshot.ep);
    expect(scrambled.eo).toEqual(snapshot.eo);
  });
});
