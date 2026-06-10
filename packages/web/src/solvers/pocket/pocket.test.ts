import { beforeAll, describe, expect, it } from "vitest";
import { applyGridMove, createSolvedGrid, isGridSolved } from "../../cube/model/state-grid";
import { Move, parseMove } from "../../cube/moves/notation";
import { isPocketSolved, solvePocket } from "./solve";

// Full scramble alphabet: every face plus whole-cube rotations, so the solver's
// absolute-frame reorientation path is exercised, not just the R/U/F subgroup.
const SCRAMBLE_MOVES = [
  "R",
  "R'",
  "R2",
  "U",
  "U'",
  "U2",
  "F",
  "F'",
  "F2",
  "L",
  "L'",
  "L2",
  "D",
  "D'",
  "D2",
  "B",
  "B'",
  "B2",
  "x",
  "y",
  "z",
].map(parseMove);

function scramble(seed: number, length: number) {
  let grid = createSolvedGrid(2);
  let s = seed;
  for (let i = 0; i < length; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    grid = applyGridMove(grid, SCRAMBLE_MOVES[s % SCRAMBLE_MOVES.length]);
  }
  return grid;
}

const faceTurns = (moves: Move[]): number =>
  moves.filter((m) => (m.kind ?? "face") === "face").length;

describe("pocket solver", () => {
  // Warm the lazily-built BFS distance table once so per-test timing is stable.
  beforeAll(() => {
    solvePocket(scramble(1, 5));
  }, 60000);

  it("returns an empty solution for an already-solved cube", () => {
    const grid = createSolvedGrid(2);
    expect(isPocketSolved(grid)).toBe(true);
    expect(solvePocket(grid)).toEqual([]);
  });

  it(
    "optimally solves random 2x2 scrambles (<= 11 HTM)",
    () => {
      const n = 300;
      let maxTurns = 0;
      let totalTurns = 0;

      for (let i = 0; i < n; i++) {
        const grid = scramble(i + 1, 30);
        const solution = solvePocket(grid);
        const solved = solution.reduce(applyGridMove, grid);

        expect(isGridSolved(solved)).toBe(true);

        const turns = faceTurns(solution);
        expect(turns).toBeLessThanOrEqual(11);
        maxTurns = Math.max(maxTurns, turns);
        totalTurns += turns;
      }

      const avg = totalTurns / n;
      console.log(`pocket solve: n=${n} avg=${avg.toFixed(2)} max=${maxTurns} HTM`);
      // God's number for the 2x2 is 11; random states average well under it.
      expect(avg).toBeLessThan(10);
    },
    60000,
  );
});
