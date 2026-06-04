import { describe, expect, it } from "vitest";
import { applyMoves } from "../cube/moves/apply";
import { createSolvedState, cloneState } from "../cube/model/state-3x3";
import { Move, parseMove } from "../cube/moves/notation";
import { isCrossSolved } from "./beginner/white-cross";
import { buildSolutionPlan, flattenPlan } from "./plan";

const FACES = ["U", "D", "L", "R", "F", "B"] as const;

function scramble(seed: number): Move[] {
  let s = seed >>> 0;
  const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 0x100000000);
  const m: Move[] = [];
  let last = "";
  for (let i = 0; i < 25; i++) {
    let f = FACES[Math.floor(rng() * 6)];
    while (f === last) f = FACES[Math.floor(rng() * 6)];
    last = f;
    m.push(parseMove(`${f}${["", "'", "2"][Math.floor(rng() * 3)]}`));
  }
  return m;
}

/** Simulates buggy double-execution of the same move index after each completion. */
function applyCrossWithDuplicateBug(initial: ReturnType<typeof createSolvedState>, crossMoves: Move[]) {
  let s = cloneState(initial);
  for (const m of crossMoves) {
    s = applyMoves(s, [m, m]); // each move applied twice
  }
  return s;
}

describe("tutorial white cross plan", () => {
  it("cross segment alone solves the cross from the build state", () => {
    for (let t = 0; t < 300; t++) {
      const initial = applyMoves(createSolvedState(), scramble(t));
      const plan = buildSolutionPlan(initial);
      const cross = plan.segments[0];
      if (cross.moveCount === 0) {
        expect(isCrossSolved(initial)).toBe(true);
        continue;
      }
      const after = applyMoves(cloneState(initial), cross.moves);
      expect(isCrossSolved(after), `trial ${t}`).toBe(true);
    }
  });

  it("double-applying cross moves breaks the cross (models playback duplicate bug)", () => {
    const initial = applyMoves(createSolvedState(), scramble(0xbad));
    const cross = buildSolutionPlan(initial).segments[0];
    if (cross.moveCount === 0) return;
    const once = applyMoves(cloneState(initial), cross.moves);
    const twice = applyCrossWithDuplicateBug(initial, cross.moves);
    expect(isCrossSolved(once)).toBe(true);
    expect(isCrossSolved(twice)).toBe(false);
  });

  it("rebuilding plan from cross-solved state yields empty cross segment", () => {
    const initial = applyMoves(createSolvedState(), scramble(77));
    const plan1 = buildSolutionPlan(initial);
    const crossMoves = plan1.segments[0].moves;
    if (crossMoves.length === 0) return;
    const afterCross = applyMoves(cloneState(initial), crossMoves);
    const plan2 = buildSolutionPlan(afterCross);
    expect(plan2.segments[0].alreadyComplete).toBe(true);
    expect(plan2.segments[0].moveCount).toBe(0);
  });

  it("multiple scramble-build-cross cycles produce valid cross segments", () => {
    for (let session = 0; session < 50; session++) {
      const initial = applyMoves(createSolvedState(), scramble(session + 500));
      const plan = buildSolutionPlan(initial);
      const cross = plan.segments[0];
      expect(cross.moveCount).toBeGreaterThan(0);
      expect(isCrossSolved(applyMoves(cloneState(initial), cross.moves))).toBe(true);

      // second build without re-scramble (same session mistake)
      const afterCross = applyMoves(cloneState(initial), cross.moves);
      const plan2 = buildSolutionPlan(afterCross);
      expect(plan2.segments[0].moveCount).toBe(0);
    }
  });

  it("flatten cross prefix matches segment moves", () => {
    const initial = applyMoves(createSolvedState(), scramble(3));
    const plan = buildSolutionPlan(initial);
    const flat = flattenPlan(plan);
    const crossLen = plan.segments[0].moveCount;
    expect(flat.slice(0, crossLen)).toEqual(plan.segments[0].moves);
  });
});
