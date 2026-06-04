import { describe, expect, it } from "vitest";
import { applyMove, applyMoves } from "../cube/moves/apply";
import { Edge } from "../cube/model/state-3x3";
import { createSolvedState } from "../cube/model/state-3x3";
import { Move, parseMove } from "../cube/moves/notation";
import { solveWhiteCross, isCrossSolved } from "./beginner/white-cross";

const FACES = ["U", "D", "L", "R", "F", "B"] as const;
const SUFFIX = ["", "'", "2"] as const;

/** Deterministic PRNG so failures are reproducible. */
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

/** Ground-truth check independent of the solver's own predicate. */
function crossSolvedByModel(state: ReturnType<typeof createSolvedState>): boolean {
  const top = [Edge.UR, Edge.UF, Edge.UL, Edge.UB];
  return top.every((slot) => state.ep[slot] === slot && state.eo[slot] === 0);
}

describe("white cross solver", () => {
  it("returns no moves for an already-solved cube", () => {
    expect(solveWhiteCross(createSolvedState())).toEqual([]);
  });

  it("solves the cross for a large set of random scrambles", () => {
    const rng = makeRng(0xc0ffee);
    const trials = 3000;
    let maxLen = 0;
    let total = 0;

    for (let i = 0; i < trials; i++) {
      const scramble = randomScramble(rng, 25);
      const scrambled = applyMoves(createSolvedState(), scramble);

      const solution = solveWhiteCross(scrambled);
      maxLen = Math.max(maxLen, solution.length);
      total += solution.length;

      const result = applyMoves(scrambled, solution);

      expect(isCrossSolved(result), `solver predicate, trial ${i}`).toBe(true);
      expect(crossSolvedByModel(result), `model check, trial ${i}`).toBe(true);
    }

    console.log(`cross: avg ${(total / trials).toFixed(1)} moves, max ${maxLen}`);
    // Beginner cross is not optimal but should stay tight after compression.
    expect(maxLen).toBeLessThan(24);
    expect(total / trials).toBeLessThan(14);
  });

  it("leaves already-solved edges untouched", () => {
    const rng = makeRng(0x5eed);
    for (let i = 0; i < 300; i++) {
      const scrambled = applyMoves(createSolvedState(), randomScramble(rng, 25));
      const first = solveWhiteCross(scrambled);
      const solved = applyMoves(scrambled, first);
      // Re-solving an already-solved cross must do nothing.
      expect(solveWhiteCross(solved)).toEqual([]);
    }
  });

  it("does not mutate the input state", () => {
    const rng = makeRng(42);
    const scramble = randomScramble(rng, 20);
    const scrambled = applyMoves(createSolvedState(), scramble);
    const snapshot = {
      cp: scrambled.cp.slice(),
      co: scrambled.co.slice(),
      ep: scrambled.ep.slice(),
      eo: scrambled.eo.slice(),
    };

    solveWhiteCross(scrambled);

    expect(scrambled.cp).toEqual(snapshot.cp);
    expect(scrambled.co).toEqual(snapshot.co);
    expect(scrambled.ep).toEqual(snapshot.ep);
    expect(scrambled.eo).toEqual(snapshot.eo);
  });

  it("each returned move is a valid outer-layer turn", () => {
    const rng = makeRng(7);
    const scrambled = applyMoves(createSolvedState(), randomScramble(rng, 25));
    for (const move of solveWhiteCross(scrambled)) {
      expect(move.layer).toBe(1);
      expect([1, 2, 3]).toContain(move.amount);
      // sanity: applying it does not throw
      applyMove(scrambled, move);
    }
  });
});
