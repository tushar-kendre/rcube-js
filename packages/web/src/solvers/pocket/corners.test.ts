import { describe, expect, it } from "vitest";
import { applyMove } from "../../cube/moves/apply";
import { createSolvedState } from "../../cube/model/state-3x3";
import { applyGridMove, createSolvedGrid } from "../../cube/model/state-grid";
import { parseMove } from "../../cube/moves/notation";
import {
  N_POCKET,
  decodePocket,
  encodePocket,
  gridToCorners,
} from "./corners";

describe("pocket corner coordinate", () => {
  it("solved state encodes to coordinate 0", () => {
    const { cp, co } = gridToCorners(createSolvedGrid(2));
    expect(encodePocket(cp, co)).toBe(0);
  });

  it("encode/decode round-trips over random coordinates", () => {
    let seed = 12345;
    for (let i = 0; i < 5000; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const coord = seed % N_POCKET;
      const { cp, co } = decodePocket(coord);
      expect(encodePocket(cp, co)).toBe(coord);
    }
  });

  it("decoded states satisfy the corner-orientation constraint", () => {
    let seed = 999;
    for (let i = 0; i < 1000; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const { cp, co } = decodePocket(seed % N_POCKET);
      // DBL corner (slot 6) is fixed; total orientation is a multiple of 3.
      expect(cp[6]).toBe(6);
      expect(co[6]).toBe(0);
      const sum = Array.from(co).reduce((a, b) => a + b, 0);
      expect(sum % 3).toBe(0);
    }
  });
});

describe("pocket projection vs canonical model", () => {
  const FACES = ["R", "R'", "R2", "U", "U'", "U2", "F", "F'", "F2", "L", "D", "B"].map(parseMove);

  it("gridToCorners matches applyMove corner action for face sequences", () => {
    let seed = 7;
    for (let trial = 0; trial < 300; trial++) {
      let grid = createSolvedGrid(2);
      let canonical = createSolvedState();
      const len = 1 + (trial % 12);
      for (let i = 0; i < len; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const move = FACES[seed % FACES.length];
        grid = applyGridMove(grid, move);
        canonical = applyMove(canonical, move);
      }
      const { cp, co } = gridToCorners(grid);
      expect(Array.from(cp)).toEqual(Array.from(canonical.cp));
      expect(Array.from(co)).toEqual(Array.from(canonical.co));
    }
  });
});
