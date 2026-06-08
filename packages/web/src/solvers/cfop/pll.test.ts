import { describe, expect, it } from "vitest";
import { applyMoves } from "../../cube/moves/apply";
import { applySeqExt } from "../common/apply-seq";
import { createSolvedState } from "../../cube/model/state-3x3";
import { Move, parseMove } from "../../cube/moves/notation";
import { isCubeSolved } from "../beginner/last-layer-corners";
import { solveWhiteCross } from "../beginner/white-cross";
import { isF2LSolved, solveF2L } from "./f2l/solve";
import { isOLLSolved, solveOLL } from "./oll/solve";
import { solvePLL } from "./pll/solve";

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

describe("CFOP PLL", () => {
  it("returns no moves when the cube is already solved", () => {
    expect(solvePLL(createSolvedState())).toEqual([]);
  });

  it("permutes the last layer to a solved cube after cross + F2L + OLL", () => {
    const rng = makeRng(0x9c1e);
    for (let i = 0; i < 60; i++) {
      const scrambled = applyMoves(createSolvedState(), randomScramble(rng, 25));
      let s = applyMoves(scrambled, solveWhiteCross(scrambled));
      s = applySeqExt(s, solveF2L(s));
      s = applySeqExt(s, solveOLL(s));
      expect(isF2LSolved(s) && isOLLSolved(s), `OLL precondition, trial ${i}`).toBe(true);

      const result = applySeqExt(s, solvePLL(s));
      expect(isCubeSolved(result), `solved, trial ${i}`).toBe(true);
    }
  }, 60000);
});
