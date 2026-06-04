import { describe, expect, it } from "vitest";
import { applyMoves } from "../cube/moves/apply";
import { Corner, Edge, createSolvedState } from "../cube/model/state-3x3";
import { Move, parseMove } from "../cube/moves/notation";
import {
  isLastLayerCrossSolved,
  solveLastLayerCross,
  solveThroughLastLayerCross,
} from "./beginner/last-layer-cross";
import { isSecondLayerSolved, solveTwoLayers } from "./beginner/second-layer";

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
    const suffix = SUFFIX[Math.floor(rng() * SUFFIX.length)];
    moves.push(parseMove(`${face}${suffix}`));
  }
  return moves;
}

/** Independent ground truth: first two layers solved + all 4 D edges oriented. */
function crossByModel(state: ReturnType<typeof createSolvedState>): boolean {
  const firstEdges = [Edge.UR, Edge.UF, Edge.UL, Edge.UB];
  const firstCorners = [Corner.URF, Corner.UFL, Corner.ULB, Corner.UBR];
  const midEdges = [Edge.FR, Edge.FL, Edge.BL, Edge.BR];
  const dEdges = [Edge.DR, Edge.DF, Edge.DL, Edge.DB];
  return (
    firstEdges.every((s) => state.ep[s] === s && state.eo[s] === 0) &&
    firstCorners.every((s) => state.cp[s] === s && state.co[s] === 0) &&
    midEdges.every((s) => state.ep[s] === s && state.eo[s] === 0) &&
    // D-layer edges may be permuted, but must be correctly oriented (eo 0).
    dEdges.every((s) => state.eo[s] === 0)
  );
}

describe("last-layer cross", () => {
  it("returns no moves for an already-solved cube", () => {
    expect(solveThroughLastLayerCross(createSolvedState())).toEqual([]);
  });

  it("forms the yellow cross for many random scrambles", () => {
    const rng = makeRng(0xfeed5);
    const trials = 3000;
    let maxLen = 0;
    let total = 0;

    for (let i = 0; i < trials; i++) {
      const scrambled = applyMoves(createSolvedState(), randomScramble(rng, 25));

      const solution = solveThroughLastLayerCross(scrambled);
      maxLen = Math.max(maxLen, solution.length);
      total += solution.length;
      const result = applyMoves(scrambled, solution);

      expect(isLastLayerCrossSolved(result), `predicate, trial ${i}`).toBe(true);
      expect(crossByModel(result), `model check, trial ${i}`).toBe(true);
    }

    console.log(`through LL cross: avg ${(total / trials).toFixed(1)} moves, max ${maxLen}`);
    expect(maxLen).toBeLessThan(135);
  });

  it("preserves the first two layers", () => {
    const rng = makeRng(777);
    for (let i = 0; i < 500; i++) {
      const scrambled = applyMoves(createSolvedState(), randomScramble(rng, 25));
      const afterTwo = applyMoves(scrambled, solveTwoLayers(scrambled));
      expect(isSecondLayerSolved(afterTwo)).toBe(true);

      const result = applyMoves(afterTwo, solveLastLayerCross(afterTwo));
      expect(isSecondLayerSolved(result), `F2L broken on trial ${i}`).toBe(true);
      expect(isLastLayerCrossSolved(result)).toBe(true);
    }
  });

  it("does not mutate the input state", () => {
    const rng = makeRng(42);
    const scrambled = applyMoves(createSolvedState(), randomScramble(rng, 20));
    const snapshot = {
      cp: scrambled.cp.slice(),
      co: scrambled.co.slice(),
      ep: scrambled.ep.slice(),
      eo: scrambled.eo.slice(),
    };
    solveThroughLastLayerCross(scrambled);
    expect(scrambled.cp).toEqual(snapshot.cp);
    expect(scrambled.co).toEqual(snapshot.co);
    expect(scrambled.ep).toEqual(snapshot.ep);
    expect(scrambled.eo).toEqual(snapshot.eo);
  });
});
