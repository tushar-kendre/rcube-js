import { describe, expect, it } from "vitest";
import { applyMoves } from "../cube/moves/apply";
import { Corner, Edge, createSolvedState } from "../cube/model/state-3x3";
import { Move, parseMove } from "../cube/moves/notation";
import {
  isSecondLayerSolved,
  solveSecondLayer,
  solveTwoLayers,
} from "./beginner/second-layer";
import { solveFirstLayer, isFirstLayerSolved } from "./beginner/first-layer";

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

/** Ground-truth: first two layers solved (slots 0-3 and 8-11), independent. */
function twoLayersByModel(state: ReturnType<typeof createSolvedState>): boolean {
  const firstEdges = [Edge.UR, Edge.UF, Edge.UL, Edge.UB];
  const firstCorners = [Corner.URF, Corner.UFL, Corner.ULB, Corner.UBR];
  const midEdges = [Edge.FR, Edge.FL, Edge.BL, Edge.BR];
  return (
    firstEdges.every((s) => state.ep[s] === s && state.eo[s] === 0) &&
    firstCorners.every((s) => state.cp[s] === s && state.co[s] === 0) &&
    midEdges.every((s) => state.ep[s] === s && state.eo[s] === 0)
  );
}

describe("second layer solver", () => {
  it("returns no moves for an already-solved cube", () => {
    expect(solveTwoLayers(createSolvedState())).toEqual([]);
  });

  it("solves the first two layers for many random scrambles", () => {
    const rng = makeRng(0x2bc0de);
    const trials = 3000;
    let maxLen = 0;
    let total = 0;

    for (let i = 0; i < trials; i++) {
      const scrambled = applyMoves(createSolvedState(), randomScramble(rng, 25));

      const solution = solveTwoLayers(scrambled);
      maxLen = Math.max(maxLen, solution.length);
      total += solution.length;
      const result = applyMoves(scrambled, solution);

      expect(isSecondLayerSolved(result), `predicate, trial ${i}`).toBe(true);
      expect(twoLayersByModel(result), `model check, trial ${i}`).toBe(true);
    }

    console.log(`two layers: avg ${(total / trials).toFixed(1)} moves, max ${maxLen}`);
    expect(maxLen).toBeLessThan(115);
    expect(total / trials).toBeLessThan(78);
  });

  it("preserves the first layer once the middle is solved", () => {
    // Individual inserts temporarily disturb the first layer, but each completed
    // edge leaves it intact; this checks the net effect of the full second layer.
    const rng = makeRng(123);
    for (let i = 0; i < 500; i++) {
      const scrambled = applyMoves(createSolvedState(), randomScramble(rng, 25));
      const afterFirst = applyMoves(scrambled, solveFirstLayer(scrambled));
      expect(isFirstLayerSolved(afterFirst)).toBe(true);

      const result = applyMoves(afterFirst, solveSecondLayer(afterFirst));
      expect(isFirstLayerSolved(result), `first layer broken on trial ${i}`).toBe(true);
      expect(isSecondLayerSolved(result)).toBe(true);
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
    solveTwoLayers(scrambled);
    expect(scrambled.cp).toEqual(snapshot.cp);
    expect(scrambled.co).toEqual(snapshot.co);
    expect(scrambled.ep).toEqual(snapshot.ep);
    expect(scrambled.eo).toEqual(snapshot.eo);
  });
});
