import { describe, expect, it } from "vitest";
import { applyMoves } from "./apply";
import { formatMove, invertSequence, Move, parseMove, parseSequence } from "./notation";
import {
  cubeFaceAtWorld,
  identityOrientation,
  isIdentity,
  rotate,
} from "./orientation";
import { applyOrientedMove, OrientedState } from "./resolve";
import { createSolvedState, statesEqual } from "../model/state-3x3";
import { isSolved } from "../validate/solved";
import { solveCube } from "../../solvers/beginner/last-layer-corners";

function solved(): OrientedState {
  return { state: createSolvedState(), orientation: identityOrientation() };
}

function applySeq(os: OrientedState, seq: string): OrientedState {
  let cur = os;
  for (const m of parseSequence(seq)) cur = applyOrientedMove(cur, m);
  return cur;
}

describe("extended notation", () => {
  it("parses rotations, slices, and wides", () => {
    expect(parseMove("x")).toMatchObject({ kind: "rotation", face: "R", amount: 1 });
    expect(parseMove("y'")).toMatchObject({ kind: "rotation", face: "U", amount: 3 });
    expect(parseMove("z2")).toMatchObject({ kind: "rotation", face: "F", amount: 2 });
    expect(parseMove("M'")).toMatchObject({ kind: "slice", face: "L", amount: 3 });
    expect(parseMove("E")).toMatchObject({ kind: "slice", face: "D", amount: 1 });
    expect(parseMove("S2")).toMatchObject({ kind: "slice", face: "F", amount: 2 });
    expect(parseMove("r")).toMatchObject({ kind: "wide", face: "R", width: 2, amount: 1 });
    expect(parseMove("Rw")).toMatchObject({ kind: "wide", face: "R", width: 2, amount: 1 });
    expect(parseMove("3Rw2")).toMatchObject({ kind: "wide", face: "R", width: 3, amount: 2 });
    expect(parseMove("R")).toMatchObject({ kind: "face", face: "R", layer: 1, amount: 1 });
    expect(parseMove("2R'")).toMatchObject({ kind: "face", face: "R", layer: 2, amount: 3 });
  });

  it("formats moves back to canonical notation", () => {
    expect(formatMove(parseMove("x"))).toBe("x");
    expect(formatMove(parseMove("M'"))).toBe("M'");
    expect(formatMove(parseMove("r"))).toBe("Rw");
    expect(formatMove(parseMove("3Rw2"))).toBe("3Rw2");
    expect(formatMove(parseMove("R'"))).toBe("R'");
  });
});

describe("orientation tracking", () => {
  it("remaps screen faces to canonical faces after rotations", () => {
    // x sends Front -> Up, so world-U then holds the canonical F face.
    const ox = rotate(identityOrientation(), "x", 1);
    expect(cubeFaceAtWorld(ox, "U")).toBe("F");
    expect(cubeFaceAtWorld(ox, "D")).toBe("B");
    // y sends Right -> Front, so world-R holds canonical B.
    const oy = rotate(identityOrientation(), "y", 1);
    expect(cubeFaceAtWorld(oy, "R")).toBe("B");
    expect(cubeFaceAtWorld(oy, "F")).toBe("R");
  });

  it("returns to identity after four quarter turns", () => {
    let o = identityOrientation();
    for (let i = 0; i < 4; i++) o = rotate(o, "x", 1);
    expect(isIdentity(o)).toBe(true);
  });

  it("rotations do not change the canonical state", () => {
    const after = applySeq(solved(), "x y z' x2");
    expect(statesEqual(after.state, createSolvedState())).toBe(true);
    expect(isIdentity(after.orientation)).toBe(false);
  });
});

describe("oriented move algebra", () => {
  it("returns to solved + identity after a sequence and its inverse", () => {
    const seq = parseSequence("R U Rw' M x F' S U' L D' y' B M2 z");
    let os = solved();
    for (const m of seq) os = applyOrientedMove(os, m);
    for (const m of invertSequence(seq)) os = applyOrientedMove(os, m);
    expect(statesEqual(os.state, createSolvedState())).toBe(true);
    expect(isIdentity(os.orientation)).toBe(true);
  });

  it("Rw equals R then M' (wide = outer + slice)", () => {
    const a = applySeq(solved(), "Rw");
    const b = applySeq(solved(), "R M'");
    expect(statesEqual(a.state, b.state)).toBe(true);
    expect(a.orientation).toEqual(b.orientation);
  });

  it("M' equals R'-equivalent slice consistency (M M' = identity)", () => {
    const os = applySeq(solved(), "M M'");
    expect(statesEqual(os.state, createSolvedState())).toBe(true);
    expect(isIdentity(os.orientation)).toBe(true);
  });

  it("M follows L: front center goes down (F->D world cycle)", () => {
    // Standard M (L direction): U->F, F->D, D->B, B->U.
    const o = applySeq(solved(), "M").orientation;
    expect(cubeFaceAtWorld(o, "F")).toBe("U");
    expect(cubeFaceAtWorld(o, "D")).toBe("F");
    expect(cubeFaceAtWorld(o, "B")).toBe("D");
    expect(cubeFaceAtWorld(o, "U")).toBe("B");
  });
});

describe("solver from oriented scrambles", () => {
  it("solves the canonical state after a scramble with wide/slice/rotation moves", () => {
    const scramble = "R U Rw M x F2 S' U' Lw D y M' B z' r2 u'";
    const os = applySeq(solved(), scramble);
    const solution = solveCube(os.state);
    const final = applyMoves(os.state, solution);
    expect(isSolved(final)).toBe(true);
  });
});
