/**
 * Two-phase IDA* search.
 *
 * The outer loop deepens the *phase-1* length one move at a time, starting from
 * its pruning lower bound. Phase 1 runs on coordinates (twist, flip, udSlice)
 * advanced through the transition tables and stops the instant it reaches G1
 * (padding past the subgroup never helps). Each distinct phase-1 solution of the
 * current length is completed by an optimal phase-2 search, and the shortest
 * total is kept. Deepening stops once the phase-1 length alone meets the best
 * total (it cannot be beaten), after a small fixed number of extra phase-1
 * moves, or when the completion budget is exhausted.
 *
 * Bounding phase-1 *length* (rather than the total) keeps it from wandering on
 * long sub-optimal routes to G1, which is what makes the search fast.
 *
 * Phase 2 runs on its own coordinates (cornerPerm, udEdgePerm, sliceEdgePerm)
 * within G1 and returns the shortest completion within a move budget. The G1
 * handoff state is rebuilt by replaying the short phase-1 list on the real cube.
 *
 * Everything is deterministic: fixed move ordering plus depth and budget caps,
 * never wall-clock.
 */

import { applyMove } from "../../cube/moves/apply";
import { CubeState3x3 } from "../../cube/model/state-3x3";
import {
  N_SLICE_PERM,
  N_UDSLICE,
  getCornerPerm,
  getFlip,
  getSliceEdgePerm,
  getTwist,
  getUDEdgePerm,
  getUDSlice,
} from "./coords";
import { PHASE1_MOVES, PHASE2_MOVES, getMoveTables } from "./movetables";
import { getPruneTables } from "./prune";

/** Hard cap on phase-1 length (G1 is always reachable in <= 12 moves). */
const MAX_PHASE1_DEPTH = 12;
/**
 * How many moves past the *first* solution's phase-1 length we keep deepening to
 * look for a shorter total. Trades a little speed for a couple of moves.
 */
const PHASE1_EXTRA = 2;
/**
 * Phase-2 length the first solution is allowed. Keeping this well under the
 * phase-2 maximum (18) avoids an expensive deep optimal phase-2 from the very
 * first (shortest) phase-1 path: instead we let phase 1 deepen until some path
 * yields a short phase 2 (the two-phase synergy). Raised on the fallback pass if
 * no capped solution is found.
 */
const PHASE2_FIRST_CAP = 14;
/** Deterministic cap on phase-1 -> phase-2 completion attempts per pass. */
const MAX_COMPLETIONS = 1000;

/** Move-redundancy filter: no same-axis turn unless it advances the axis order. */
function blocked(axis: number, order: number, prevAxis: number, prevOrder: number): boolean {
  return axis === prevAxis && order <= prevOrder;
}

/** Shortest phase-2 completion from the given G1 coordinates, or null. */
function searchPhase2(
  cornerPerm: number,
  udEdgePerm: number,
  sliceEdgePerm: number,
  maxDepth: number,
): number[] | null {
  const mt = getMoveTables();
  const pt = getPruneTables();
  const n = PHASE2_MOVES.length;

  const h2 = (cp: number, ud: number, sl: number): number =>
    Math.max(pt.cornerSlice[cp * N_SLICE_PERM + sl], pt.udEdgeSlice[ud * N_SLICE_PERM + sl]);

  const path: number[] = [];

  const dfs = (
    cp: number,
    ud: number,
    sl: number,
    depth: number,
    bound: number,
    prevAxis: number,
    prevOrder: number,
  ): boolean => {
    const h = h2(cp, ud, sl);
    if (h === 0) return true;
    if (depth + h > bound) return false;

    for (let m = 0; m < n; m++) {
      const mv = PHASE2_MOVES[m];
      if (blocked(mv.axis, mv.order, prevAxis, prevOrder)) continue;
      const ncp = mt.cornerPerm[cp * n + m];
      const nud = mt.udEdgePerm[ud * n + m];
      const nsl = mt.sliceEdgePerm[sl * n + m];
      path.push(m);
      if (dfs(ncp, nud, nsl, depth + 1, bound, mv.axis, mv.order)) return true;
      path.pop();
    }
    return false;
  };

  for (let bound = h2(cornerPerm, udEdgePerm, sliceEdgePerm); bound <= maxDepth; bound++) {
    path.length = 0;
    if (dfs(cornerPerm, udEdgePerm, sliceEdgePerm, 0, bound, -1, -1)) {
      return path.slice();
    }
  }
  return null;
}

export interface TwoPhaseSolution {
  /** Phase-1 move indices into PHASE1_MOVES. */
  phase1: number[];
  /** Phase-2 move indices into PHASE2_MOVES. */
  phase2: number[];
}

/**
 * Finds a near-optimal two-phase solution. Returns the phase-1 and phase-2 move
 * index lists; empty/empty means the cube is already solved.
 */
export function searchTwoPhase(state: CubeState3x3): TwoPhaseSolution {
  const mt = getMoveTables();
  const pt = getPruneTables();
  const n1 = PHASE1_MOVES.length;

  const startTwist = getTwist(state);
  const startFlip = getFlip(state);
  const startSlice = getUDSlice(state);

  const h1 = (twist: number, flip: number, slice: number): number =>
    Math.max(pt.flipSlice[flip * N_UDSLICE + slice], pt.twistSlice[twist * N_UDSLICE + slice]);

  const startH1 = h1(startTwist, startFlip, startSlice);

  // One full pass with the given first-solution phase-2 cap. The phase-1 depth
  // grows from its lower bound; each phase-1 solution is finished by the shortest
  // phase 2 that can still improve the best total.
  const run = (firstCap: number): { phase1: number[]; phase2: number[] } | null => {
    const path: number[] = [];
    // Held in an object so TypeScript keeps the nullable type across the closure
    // mutation in `tryComplete` (a plain `let` would narrow to `null`).
    const ref: { best: { phase1: number[]; phase2: number[]; length: number } | null } = {
      best: null,
    };
    let completions = 0;

    // At a G1 node: rebuild the real state by replaying the (short) phase-1 moves
    // and find the shortest completion that can still improve the best total.
    const tryComplete = (): void => {
      completions++;
      const cap = ref.best ? ref.best.length - 1 - path.length : firstCap;
      if (cap < 0) return;

      let s = state;
      for (const m of path) s = applyMove(s, PHASE1_MOVES[m].move);

      const phase2 = searchPhase2(getCornerPerm(s), getUDEdgePerm(s), getSliceEdgePerm(s), cap);
      if (!phase2) return;

      const length = path.length + phase2.length;
      if (!ref.best || length < ref.best.length) {
        ref.best = { phase1: path.slice(), phase2, length };
      }
    };

    // Pure-coordinate phase-1 enumeration: solutions whose first arrival at G1 is
    // exactly `limit`. The real cube is only materialized at the few G1 hits.
    const dfs1 = (
      twist: number,
      flip: number,
      slice: number,
      depth: number,
      limit: number,
      prevAxis: number,
      prevOrder: number,
    ): void => {
      if (completions >= MAX_COMPLETIONS) return;
      const h = h1(twist, flip, slice);
      if (h === 0) {
        if (depth === limit) tryComplete();
        return;
      }
      if (depth + h > limit || depth === limit) return;

      for (let m = 0; m < n1; m++) {
        const mv = PHASE1_MOVES[m];
        if (blocked(mv.axis, mv.order, prevAxis, prevOrder)) continue;
        path.push(m);
        dfs1(
          mt.twist[twist * n1 + m],
          mt.flip[flip * n1 + m],
          mt.udSlice[slice * n1 + m],
          depth + 1,
          limit,
          mv.axis,
          mv.order,
        );
        path.pop();
      }
    };

    let stopDepth = MAX_PHASE1_DEPTH;
    for (let limit = startH1; limit <= stopDepth; limit++) {
      if (ref.best && limit >= ref.best.length) break;
      if (completions >= MAX_COMPLETIONS) break;
      path.length = 0;
      dfs1(startTwist, startFlip, startSlice, 0, limit, -1, -1);
      // Once a solution exists, chase a slightly shorter total for a bit longer.
      if (ref.best) stopDepth = Math.min(stopDepth, limit + PHASE1_EXTRA);
    }

    return ref.best ? { phase1: ref.best.phase1, phase2: ref.best.phase2 } : null;
  };

  // Tightly capped phase 2 first (fast, exploits two-phase synergy); fall back to
  // the full phase-2 range only if no short completion exists.
  const result = run(PHASE2_FIRST_CAP) ?? run(18);
  return result ?? { phase1: [], phase2: [] };
}
