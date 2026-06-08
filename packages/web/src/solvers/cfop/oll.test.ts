import { describe, expect, it } from "vitest";
import { applyMoves } from "../../cube/moves/apply";
import { applySeqExt } from "../common/apply-seq";
import { createSolvedState } from "../../cube/model/state-3x3";
import { Move, parseMove } from "../../cube/moves/notation";
import { solveWhiteCross } from "../beginner/white-cross";
import { isF2LSolved, solveF2L } from "./f2l/solve";
import { isOLLSolved } from "./oll/pattern";
import { solveOLL } from "./oll/solve";

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

describe("CFOP OLL", () => {
  it("returns no moves when the last layer is already oriented", () => {
    expect(solveOLL(createSolvedState())).toEqual([]);
  });

  it("orients the last layer after cross + F2L, preserving the first two layers", () => {
    const rng = makeRng(0x011c);
    for (let i = 0; i < 60; i++) {
      const scrambled = applyMoves(createSolvedState(), randomScramble(rng, 25));
      let s = applyMoves(scrambled, solveWhiteCross(scrambled));
      s = applyMoves(s, solveF2L(s));
      expect(isF2LSolved(s), `F2L precondition, trial ${i}`).toBe(true);

      const result = applySeqExt(s, solveOLL(s));
      expect(isOLLSolved(result), `OLL oriented, trial ${i}`).toBe(true);
      expect(isF2LSolved(result), `F2L preserved, trial ${i}`).toBe(true);
    }
  }, 60000);
});
