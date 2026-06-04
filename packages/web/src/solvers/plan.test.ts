import { describe, expect, it } from "vitest";
import { applyMoves } from "../cube/moves/apply";
import { createSolvedState } from "../cube/model/state-3x3";
import { Move, parseMove } from "../cube/moves/notation";
import { isSolved } from "../cube/validate/solved";
import { solveCube } from "./beginner/last-layer-corners";
import { buildSolutionPlan, flattenPlan } from "./plan";
import { isCrossSolved } from "./beginner/white-cross";

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

describe("solution plan", () => {
  it("returns empty segments for solved cube", () => {
    const plan = buildSolutionPlan(createSolvedState());
    expect(plan.totalMoves).toBe(0);
    expect(plan.segments.every((s) => s.alreadyComplete && s.moveCount === 0)).toBe(true);
  });

  it("segment moves solve the cube (length may differ slightly from monolithic compress)", () => {
    const rng = makeRng(0xfa11);
    for (let i = 0; i < 200; i++) {
      const scrambled = applyMoves(createSolvedState(), randomScramble(rng, 20));
      const plan = buildSolutionPlan(scrambled);
      const flat = flattenPlan(plan);
      const full = solveCube(scrambled);
      expect(flat.length, `trial ${i}`).toBeGreaterThanOrEqual(full.length - 3);
      expect(flat.length).toBeLessThanOrEqual(full.length + 5);
      expect(plan.totalMoves).toBe(flat.length);
    }
  });

  it("applying all segment moves solves the cube", () => {
    const rng = makeRng(0xbeef);
    for (let i = 0; i < 200; i++) {
      const scrambled = applyMoves(createSolvedState(), randomScramble(rng, 20));
      const plan = buildSolutionPlan(scrambled);
      const result = applyMoves(scrambled, flattenPlan(plan));
      expect(isSolved(result), `trial ${i}`).toBe(true);
    }
  });

  it("marks cross complete after first segment when needed", () => {
    const rng = makeRng(99);
    const scrambled = applyMoves(createSolvedState(), randomScramble(rng, 20));
    const plan = buildSolutionPlan(scrambled);
    if (plan.segments[0].moveCount === 0) {
      expect(isCrossSolved(scrambled)).toBe(true);
    } else {
      const afterCross = applyMoves(scrambled, plan.segments[0].moves);
      expect(isCrossSolved(afterCross)).toBe(true);
    }
  });
});
