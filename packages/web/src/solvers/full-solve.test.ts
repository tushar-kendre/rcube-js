import { describe, expect, it } from "vitest";
import { applyMoves } from "../cube/moves/apply";
import { createSolvedState } from "../cube/model/state-3x3";
import { Move, parseMove } from "../cube/moves/notation";
import { isSolved } from "../cube/validate/solved";
import {
  isCubeSolved,
  solveCube,
  solveLastLayerCorners,
} from "./beginner/last-layer-corners";
import { solveThroughLastLayerEdges } from "./beginner/last-layer-edges";

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

describe("full beginner solve", () => {
  it("returns no moves for an already-solved cube", () => {
    expect(solveCube(createSolvedState())).toEqual([]);
  });

  it("solves the whole cube for many random scrambles", () => {
    const rng = makeRng(0x501bed);
    const trials = 3000;
    let maxLen = 0;
    let total = 0;

    for (let i = 0; i < trials; i++) {
      const scramble = randomScramble(rng, 25);
      const scrambled = applyMoves(createSolvedState(), scramble);

      const solution = solveCube(scrambled);
      maxLen = Math.max(maxLen, solution.length);
      total += solution.length;
      const result = applyMoves(scrambled, solution);

      expect(isSolved(result), `isSolved, trial ${i}`).toBe(true);
      expect(isCubeSolved(result), `predicate, trial ${i}`).toBe(true);
    }

    console.log(`full solve: avg ${(total / trials).toFixed(1)} moves, max ${maxLen}`);
    expect(maxLen).toBeLessThan(200);
  }, 60000);

  it("finishes corners from a solved-cross state without disturbing the rest", () => {
    const rng = makeRng(0xc0de);
    for (let i = 0; i < 500; i++) {
      const scrambled = applyMoves(createSolvedState(), randomScramble(rng, 25));
      const afterEdges = applyMoves(scrambled, solveThroughLastLayerEdges(scrambled));

      const result = applyMoves(afterEdges, solveLastLayerCorners(afterEdges));
      expect(isSolved(result), `not solved on trial ${i}`).toBe(true);
    }
  }, 30000);

  it("does not mutate the input state", () => {
    const rng = makeRng(2024);
    const scrambled = applyMoves(createSolvedState(), randomScramble(rng, 20));
    const snapshot = {
      cp: scrambled.cp.slice(),
      co: scrambled.co.slice(),
      ep: scrambled.ep.slice(),
      eo: scrambled.eo.slice(),
    };
    solveCube(scrambled);
    expect(scrambled.cp).toEqual(snapshot.cp);
    expect(scrambled.co).toEqual(snapshot.co);
    expect(scrambled.ep).toEqual(snapshot.ep);
    expect(scrambled.eo).toEqual(snapshot.eo);
  });
});
