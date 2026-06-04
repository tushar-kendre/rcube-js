import { describe, expect, it } from "vitest";
import { applyMove, applyMoves } from "../cube/moves/apply";
import { Corner, Edge, createSolvedState } from "../cube/model/state-3x3";
import { Move, parseMove } from "../cube/moves/notation";
import {
  isFirstLayerSolved,
  solveFirstLayer,
  solveFirstLayerCorners,
} from "./beginner/first-layer";
import { isCrossSolved, solveWhiteCross } from "./beginner/white-cross";

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

/** Ground-truth first-layer check, independent of the solver's own predicate. */
function firstLayerByModel(state: ReturnType<typeof createSolvedState>): boolean {
  const edges = [Edge.UR, Edge.UF, Edge.UL, Edge.UB];
  const corners = [Corner.URF, Corner.UFL, Corner.ULB, Corner.UBR];
  return (
    edges.every((slot) => state.ep[slot] === slot && state.eo[slot] === 0) &&
    corners.every((slot) => state.cp[slot] === slot && state.co[slot] === 0)
  );
}

describe("first layer solver", () => {
  it("returns no moves for an already-solved cube", () => {
    expect(solveFirstLayer(createSolvedState())).toEqual([]);
  });

  it("solves the full first layer for many random scrambles", () => {
    const rng = makeRng(0xbada55);
    const trials = 3000;
    let maxLen = 0;
    let total = 0;

    for (let i = 0; i < trials; i++) {
      const scramble = randomScramble(rng, 25);
      const scrambled = applyMoves(createSolvedState(), scramble);

      const solution = solveFirstLayer(scrambled);
      maxLen = Math.max(maxLen, solution.length);
      total += solution.length;
      const result = applyMoves(scrambled, solution);

      expect(isFirstLayerSolved(result), `predicate, trial ${i}`).toBe(true);
      expect(firstLayerByModel(result), `model check, trial ${i}`).toBe(true);
    }

    console.log(`first layer: avg ${(total / trials).toFixed(1)} moves, max ${maxLen}`);
    expect(maxLen).toBeLessThan(60);
    expect(total / trials).toBeLessThan(38);
  });

  it("keeps the cross intact while solving corners", () => {
    const rng = makeRng(99);
    for (let i = 0; i < 500; i++) {
      const scrambled = applyMoves(createSolvedState(), randomScramble(rng, 25));
      const afterCross = applyMoves(scrambled, solveWhiteCross(scrambled));
      expect(isCrossSolved(afterCross)).toBe(true);

      const corners = solveFirstLayerCorners(afterCross);
      // The cross must remain solved after every corner move.
      let s = afterCross;
      for (const move of corners) {
        s = applyMove(s, move);
      }
      expect(isCrossSolved(s), `cross broken on trial ${i}`).toBe(true);
      expect(isFirstLayerSolved(s)).toBe(true);
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
    solveFirstLayer(scrambled);
    expect(scrambled.cp).toEqual(snapshot.cp);
    expect(scrambled.co).toEqual(snapshot.co);
    expect(scrambled.ep).toEqual(snapshot.ep);
    expect(scrambled.eo).toEqual(snapshot.eo);
  });
});
