import { describe, expect, it } from "vitest";
import { applyMoves } from "../cube/moves/apply";
import { applySeqExt } from "./common/apply-seq";
import { createSolvedState } from "../cube/model/state-3x3";
import { Move, parseMove } from "../cube/moves/notation";
import { isSolved } from "../cube/validate/solved";
import { solveCubeCFOP, isCubeSolved } from "./cfop/solve";
import { buildSolutionPlan, flattenPlan } from "./plan";

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

describe("full CFOP solve", () => {
  it("returns no moves for an already-solved cube", () => {
    expect(solveCubeCFOP(createSolvedState())).toEqual([]);
  });

  it("solves the whole cube for many random scrambles", () => {
    const rng = makeRng(0xcf00);
    const trials = 30;
    let maxLen = 0;
    let total = 0;

    for (let i = 0; i < trials; i++) {
      const scramble = randomScramble(rng, 25);
      const scrambled = applyMoves(createSolvedState(), scramble);

      const solution = solveCubeCFOP(scrambled);
      maxLen = Math.max(maxLen, solution.length);
      total += solution.length;
      const result = applySeqExt(scrambled, solution);

      expect(isSolved(result), `isSolved, trial ${i}`).toBe(true);
      expect(isCubeSolved(result), `predicate, trial ${i}`).toBe(true);
    }

    console.log(`CFOP full solve: avg ${(total / trials).toFixed(1)} moves, max ${maxLen}`);
    expect(maxLen).toBeLessThan(200);
  }, 300000);
});

describe("CFOP solution plan", () => {
  it("applying all segment moves solves the cube", () => {
    const rng = makeRng(0xbeef);
    for (let i = 0; i < 15; i++) {
      const scrambled = applyMoves(createSolvedState(), randomScramble(rng, 20));
      const plan = buildSolutionPlan(scrambled, "cfop");
      expect(plan.method).toBe("cfop");
      expect(plan.segments.length).toBe(4);
      const result = applySeqExt(scrambled, flattenPlan(plan));
      expect(isSolved(result), `trial ${i}`).toBe(true);
    }
  }, 300000);
});
