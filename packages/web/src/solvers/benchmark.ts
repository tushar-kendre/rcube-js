/**
 * Compare move counts across solve methods on identical starting states.
 */

import { applyMoves } from "../cube/moves/apply";
import { applySeqExt } from "./common/apply-seq";
import { CubeState3x3, createSolvedState } from "../cube/model/state-3x3";
import { Move, parseMove } from "../cube/moves/notation";
import { isSolved } from "../cube/validate/solved";
import { getSolver, SOLVE_METHODS, SolveMethod } from "./registry";

const FACES = ["U", "D", "L", "R", "F", "B"] as const;
const SUFFIX = ["", "'", "2"] as const;

export interface MethodStats {
  total: number;
  avg: number;
  min: number;
  max: number;
}

export interface TrialComparison {
  beginner: number;
  cfop: number;
  delta: number;
}

export interface MethodBenchmarkResult {
  trialCount: number;
  byMethod: Record<SolveMethod, MethodStats>;
  /** Per-trial move counts (same scramble index for both methods). */
  perTrial: TrialComparison[];
  cfopFewerCount: number;
  beginnerFewerCount: number;
  tieCount: number;
}

export interface BenchmarkOptions {
  /** Number of random scrambles when `states` is omitted. */
  trialCount?: number;
  /** RNG seed for reproducible scrambles. */
  seed?: number;
  /** Scramble length when generating random states. */
  scrambleLength?: number;
  /** Explicit starting states; both methods solve each one. */
  states?: CubeState3x3[];
}

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

function stats(counts: number[]): MethodStats {
  if (counts.length === 0) {
    return { total: 0, avg: 0, min: 0, max: 0 };
  }
  const total = counts.reduce((n, c) => n + c, 0);
  return {
    total,
    avg: total / counts.length,
    min: Math.min(...counts),
    max: Math.max(...counts),
  };
}

/** Move counts for each method from one starting state. */
export function countMovesByMethod(state: CubeState3x3): Record<SolveMethod, number> {
  const out = {} as Record<SolveMethod, number>;
  for (const method of SOLVE_METHODS) {
    out[method] = getSolver(method).solve(state).length;
  }
  return out;
}

/**
 * Solves the same starting state(s) with every registered method and aggregates
 * move-count statistics.
 */
export function benchmarkMethods(options: BenchmarkOptions = {}): MethodBenchmarkResult {
  const {
    trialCount = 100,
    seed = 0xbead,
    scrambleLength = 25,
    states: provided,
  } = options;

  const states =
    provided ??
    (() => {
      const rng = makeRng(seed);
      const list: CubeState3x3[] = [];
      for (let i = 0; i < trialCount; i++) {
        list.push(applyMoves(createSolvedState(), randomScramble(rng, scrambleLength)));
      }
      return list;
    })();

  const countsByMethod = {} as Record<SolveMethod, number[]>;
  for (const method of SOLVE_METHODS) countsByMethod[method] = [];
  const perTrial: TrialComparison[] = [];
  let cfopFewerCount = 0;
  let beginnerFewerCount = 0;
  let tieCount = 0;

  for (const state of states) {
    const solutions = {} as Record<SolveMethod, Move[]>;
    for (const method of SOLVE_METHODS) {
      solutions[method] = getSolver(method).solve(state);
      const result = applySeqExt(state, solutions[method]);
      if (!isSolved(result)) {
        throw new Error(`${method} failed to solve trial state`);
      }
      countsByMethod[method].push(solutions[method].length);
    }

    const beginner = solutions.beginner.length;
    const cfop = solutions.cfop.length;
    perTrial.push({ beginner, cfop, delta: beginner - cfop });

    if (cfop < beginner) cfopFewerCount++;
    else if (beginner < cfop) beginnerFewerCount++;
    else tieCount++;
  }

  const byMethod = {} as Record<SolveMethod, MethodStats>;
  for (const method of SOLVE_METHODS) byMethod[method] = stats(countsByMethod[method]);

  return {
    trialCount: states.length,
    byMethod,
    perTrial,
    cfopFewerCount,
    beginnerFewerCount,
    tieCount,
  };
}

/** Formats benchmark output for logging or display. */
export function formatBenchmarkSummary(result: MethodBenchmarkResult): string {
  const b = result.byMethod.beginner;
  const c = result.byMethod.cfop;
  const k = result.byMethod.kociemba;
  const n = result.trialCount;
  const saved = b.avg - c.avg;
  return [
    `Method comparison (${n} identical scrambles)`,
    `  Beginner: avg ${b.avg.toFixed(1)} moves (min ${b.min}, max ${b.max})`,
    `  CFOP:     avg ${c.avg.toFixed(1)} moves (min ${c.min}, max ${c.max})`,
    `  Kociemba: avg ${k.avg.toFixed(1)} moves (min ${k.min}, max ${k.max})`,
    `  CFOP saves avg ${saved.toFixed(1)} moves vs beginner`,
    `  CFOP shorter: ${result.cfopFewerCount}/${n}, beginner shorter: ${result.beginnerFewerCount}/${n}, tie: ${result.tieCount}/${n}`,
  ].join("\n");
}
