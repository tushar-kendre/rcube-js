import { describe, expect, it } from "vitest";
import { applyMoves } from "../../cube/moves/apply";
import { createSolvedState } from "../../cube/model/state-3x3";
import { Move, parseMove } from "../../cube/moves/notation";
import { isSolved } from "../../cube/validate/solved";
import { solveWhiteCross } from "../beginner/white-cross";
import { isF2LSolved, solveF2L } from "./f2l/solve";

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

describe("CFOP F2L", () => {
  it("returns no moves when F2L is already solved", () => {
    expect(solveF2L(createSolvedState())).toEqual([]);
  });

  it("solves F2L from cross-complete states", () => {
    const rng = makeRng(0xf210);
    for (let i = 0; i < 50; i++) {
      const scrambled = applyMoves(createSolvedState(), randomScramble(rng, 20));
      const afterCross = applyMoves(scrambled, solveWhiteCross(scrambled));
      const solution = solveF2L(afterCross);
      const result = applyMoves(afterCross, solution);
      expect(isF2LSolved(result), `trial ${i}`).toBe(true);
    }
  }, 60000);
});
