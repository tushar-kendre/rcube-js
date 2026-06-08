import { describe, expect, it } from "vitest";
import { applyMoves } from "../../cube/moves/apply";
import { modelFromState } from "../../cube/model/cube-model";
import { createSolvedState } from "../../cube/model/state-3x3";
import { Move, parseMove, parseSequence } from "../../cube/moves/notation";
import { worldFaceForCubeFace } from "../../cube/moves/orientation";
import { foldRotations, remapMove } from "../../cube/moves/resolve";
import { applySeqExt } from "../common/apply-seq";
import { isSolved } from "../../cube/validate/solved";
import { solveCubeCFOP } from "./solve";
import { FULL_OLL } from "./oll/full-algs";
import { SLICE_PLL } from "./pll/slice-algs";

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

describe("rotation folding", () => {
  it("removes whole-cube rotations while preserving the canonical effect", () => {
    const rng = makeRng(0x5eed);
    const samples = ["x2 R U R' U' x2", "y R U2 R' x'", "z' M U M' z", "x M2 U R U' M2 x'"];
    for (const seq of samples) {
      const moves = parseSequence(seq);
      const folded = foldRotations(moves);
      expect(folded.some((m) => m.kind === "rotation")).toBe(false);
      for (let t = 0; t < 5; t++) {
        const start = applyMoves(createSolvedState(), randomScramble(rng, 12));
        expect(applySeqExt(start, folded)).toEqual(applySeqExt(start, moves));
      }
    }
  });
});

describe("wide/slice last-layer algorithm sets", () => {
  it("keeps a healthy fraction of the standard OLL set and all slice PLLs", () => {
    expect(FULL_OLL.length).toBeGreaterThanOrEqual(50);
    expect(SLICE_PLL.length).toBeGreaterThanOrEqual(4);
  });
});

describe("solving a reoriented cube", () => {
  it("solves through the oriented model after manual rotations (frame conversion)", () => {
    const rng = makeRng(0xa11ce);
    const tilts = ["x", "y", "x y", "z' x", "y2 x'"];
    for (let i = 0; i < 25; i++) {
      const scramble = randomScramble(rng, 25);
      let model = modelFromState(applyMoves(createSolvedState(), scramble));
      // Manually reorient the cube the way a user would before solving.
      model = model.applySequence(parseSequence(tilts[i % tilts.length]));

      const orient = model.orientation;
      const canonical = model.canonicalState!;
      const screenSolution = solveCubeCFOP(canonical).map((move) =>
        remapMove(move, (f) => worldFaceForCubeFace(orient, f)),
      );

      const solved = model.applySequence(screenSolution);
      expect(isSolved(solved.canonicalState!), `trial ${i}`).toBe(true);
    }
  }, 60000);
});
