import { describe, expect, it } from "vitest";
import { applyMoves } from "../cube/moves/apply";
import { createSolvedState } from "../cube/model/state-3x3";
import { parseMove } from "../cube/moves/notation";
import {
  benchmarkMethods,
  countMovesByMethod,
  formatBenchmarkSummary,
} from "./benchmark";

describe("method move-count comparison", () => {
  it("returns zero moves for solved state on both methods", () => {
    const counts = countMovesByMethod(createSolvedState());
    expect(counts.beginner).toBe(0);
    expect(counts.cfop).toBe(0);
  });

  it("uses identical scrambles for both methods", () => {
    const scrambled = applyMoves(createSolvedState(), [
      parseMove("R"),
      parseMove("U"),
      parseMove("F'"),
    ]);
    const counts = countMovesByMethod(scrambled);
    expect(counts.beginner).toBeGreaterThan(0);
    expect(counts.cfop).toBeGreaterThan(0);
  });

  it("reports average moves per method on shared scrambles", () => {
    const result = benchmarkMethods({ trialCount: 50, seed: 0xc00d, scrambleLength: 25 });
    console.log(formatBenchmarkSummary(result));

    expect(result.trialCount).toBe(50);
    expect(result.perTrial).toHaveLength(50);
    expect(result.byMethod.beginner.avg).toBeGreaterThan(0);
    expect(result.byMethod.cfop.avg).toBeGreaterThan(0);
    expect(result.cfopFewerCount + result.beginnerFewerCount + result.tieCount).toBe(50);

    for (const row of result.perTrial) {
      expect(row.delta).toBe(row.beginner - row.cfop);
    }
  }, 120000);
});
