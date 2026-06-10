import { describe, expect, it } from "vitest";
import { applyMove } from "../../cube/moves/apply";
import { createSolvedState } from "../../cube/model/state-3x3";
import {
  N_CORNER_PERM,
  N_FLIP,
  N_SLICE_PERM,
  N_TWIST,
  N_UDEDGE_PERM,
  N_UDSLICE,
  getCornerPerm,
  getFlip,
  getSliceEdgePerm,
  getTwist,
  getUDEdgePerm,
  getUDSlice,
  setCornerPerm,
  setFlip,
  setSliceEdgePerm,
  setTwist,
  setUDEdgePerm,
  setUDSlice,
} from "./coords";
import { PHASE1_MOVES, PHASE2_MOVES, getMoveTables } from "./movetables";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function roundTrip(
  size: number,
  set: (s: ReturnType<typeof createSolvedState>, v: number) => void,
  get: (s: ReturnType<typeof createSolvedState>) => number,
  samples: number,
  seed: number,
) {
  const r = rng(seed);
  const s = createSolvedState();
  for (let i = 0; i < samples; i++) {
    const v = Math.floor(r() * size);
    set(s, v);
    expect(get(s)).toBe(v);
  }
  // boundaries
  set(s, 0);
  expect(get(s)).toBe(0);
  set(s, size - 1);
  expect(get(s)).toBe(size - 1);
}

describe("kociemba coordinates", () => {
  it("encode/decode round-trip for every coordinate", () => {
    roundTrip(N_TWIST, setTwist, getTwist, 300, 1);
    roundTrip(N_FLIP, setFlip, getFlip, 300, 2);
    roundTrip(N_UDSLICE, setUDSlice, getUDSlice, 300, 3);
    roundTrip(N_CORNER_PERM, setCornerPerm, getCornerPerm, 300, 4);
    roundTrip(N_UDEDGE_PERM, setUDEdgePerm, getUDEdgePerm, 300, 5);
    roundTrip(N_SLICE_PERM, setSliceEdgePerm, getSliceEdgePerm, 24, 6);
  });

  it("phase-1 move tables match applyMove on random states", () => {
    const mt = getMoveTables();
    const n = PHASE1_MOVES.length;
    const r = rng(0x51ce);
    let s = createSolvedState();
    for (let i = 0; i < 40; i++) {
      s = applyMove(s, PHASE1_MOVES[Math.floor(r() * n)].move);
      const twist = getTwist(s);
      const flip = getFlip(s);
      const slice = getUDSlice(s);
      for (let m = 0; m < n; m++) {
        const next = applyMove(s, PHASE1_MOVES[m].move);
        expect(mt.twist[twist * n + m]).toBe(getTwist(next));
        expect(mt.flip[flip * n + m]).toBe(getFlip(next));
        expect(mt.udSlice[slice * n + m]).toBe(getUDSlice(next));
      }
    }
  });

  it("phase-2 move tables match applyMove on random G1 states", () => {
    const mt = getMoveTables();
    const n = PHASE2_MOVES.length;
    const r = rng(0x9111);
    let s = createSolvedState();
    for (let i = 0; i < 40; i++) {
      s = applyMove(s, PHASE2_MOVES[Math.floor(r() * n)].move);
      const cp = getCornerPerm(s);
      const ud = getUDEdgePerm(s);
      const sl = getSliceEdgePerm(s);
      for (let m = 0; m < n; m++) {
        const next = applyMove(s, PHASE2_MOVES[m].move);
        expect(mt.cornerPerm[cp * n + m]).toBe(getCornerPerm(next));
        expect(mt.udEdgePerm[ud * n + m]).toBe(getUDEdgePerm(next));
        expect(mt.sliceEdgePerm[sl * n + m]).toBe(getSliceEdgePerm(next));
      }
    }
  });

  it("G1 moves keep the phase-1 coordinates solved", () => {
    const r = rng(0xa11e);
    const goal = getUDSlice(createSolvedState());
    let s = createSolvedState();
    for (let i = 0; i < 60; i++) {
      s = applyMove(s, PHASE2_MOVES[Math.floor(r() * PHASE2_MOVES.length)].move);
      expect(getTwist(s)).toBe(0);
      expect(getFlip(s)).toBe(0);
      expect(getUDSlice(s)).toBe(goal);
    }
  });
});
