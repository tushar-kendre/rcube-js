import { describe, expect, it } from "vitest";
import { applyMove, applyMoves } from "../../cube/moves/apply";
import { createSolvedState } from "../../cube/model/state-3x3";
import { parseMove } from "../../cube/moves/notation";
import { isSolved } from "../../cube/validate/solved";
import { PHASE2_MOVES } from "./movetables";
import { inG1, solveKociemba, solveKociembaPhases } from "./solve";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const FACES = ["U", "D", "L", "R", "F", "B"];
const SUFFIX = ["", "'", "2"];

function scramble(r: () => number, length: number) {
  let s = createSolvedState();
  for (let i = 0; i < length; i++) {
    const f = FACES[Math.floor(r() * FACES.length)];
    s = applyMove(s, parseMove(`${f}${SUFFIX[Math.floor(r() * SUFFIX.length)]}`));
  }
  return s;
}

describe("kociemba two-phase solver", () => {
  it("returns no moves for a solved cube", () => {
    const sol = solveKociemba(createSolvedState());
    expect(sol).toHaveLength(0);
    expect(inG1(createSolvedState())).toBe(true);
  });

  it("solves random scrambles near-optimally", () => {
    const r = rng(0x5eed);
    const n = 60;
    let total = 0;
    let max = 0;
    for (let i = 0; i < n; i++) {
      const state = scramble(r, 25);
      const sol = solveKociemba(state);
      expect(isSolved(applyMoves(state, sol))).toBe(true);
      expect(sol.length).toBeLessThanOrEqual(25);
      total += sol.length;
      max = Math.max(max, sol.length);
    }
    const avg = total / n;
    console.log(`kociemba avg ${avg.toFixed(2)} max ${max} over ${n} scrambles`);
    expect(avg).toBeLessThan(22);
  }, 120000);

  it("phase 1 lands in G1 and phase 2 stays within G1", () => {
    const r = rng(0xf00d);
    for (let i = 0; i < 15; i++) {
      const state = scramble(r, 25);
      const { phase1, phase2 } = solveKociembaPhases(state);

      const afterPhase1 = applyMoves(state, phase1);
      expect(inG1(afterPhase1)).toBe(true);

      // Phase 2 uses only G1 moves (U, D, R2, L2, F2, B2).
      const g1Notations = new Set(PHASE2_MOVES.map((m) => m.notation));
      for (const m of phase2) {
        expect(g1Notations.has(`${m.face}${m.amount === 2 ? "2" : m.amount === 3 ? "'" : ""}`)).toBe(
          true,
        );
      }
      expect(isSolved(applyMoves(afterPhase1, phase2))).toBe(true);
    }
  }, 60000);

  it("solves a cube scrambled only with G1 moves", () => {
    const r = rng(0xbeef);
    let state = createSolvedState();
    for (let i = 0; i < 20; i++) {
      state = applyMove(state, PHASE2_MOVES[Math.floor(r() * PHASE2_MOVES.length)].move);
    }
    expect(inG1(state)).toBe(true);
    const { phase1, phase2 } = solveKociembaPhases(state);
    expect(phase1).toHaveLength(0); // already in G1
    expect(isSolved(applyMoves(state, [...phase1, ...phase2]))).toBe(true);
  });
});
