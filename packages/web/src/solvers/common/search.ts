import { CubeState3x3 } from "../../cube/model/state-3x3";
import { Move, parseMove } from "../../cube/moves/notation";
import { applySeq, dConjugate } from "./apply-seq";
import { compress } from "./optimize";

export type ConjugateFn = (k: number, alg: string[]) => string[];

/**
 * Iterative-deepening search over conjugated applications of the given
 * algorithms until `done` holds. Returns the shortest compressed solution
 * at the shallowest depth, or null if not found within `maxDepth`.
 */
export function conjugateSearch(
  state: CubeState3x3,
  algs: string[][],
  done: (s: CubeState3x3) => boolean,
  maxDepth: number,
  prefix: string[] = [],
  conjugate: ConjugateFn = dConjugate,
): string[] | null {
  const solutions: string[][] = [];
  const collect = (s: CubeState3x3, depth: number, acc: string[]): void => {
    if (done(s)) {
      solutions.push(acc);
      return;
    }
    if (depth === 0) return;
    for (let k = 0; k < 4; k++) {
      for (const alg of algs) {
        const step = conjugate(k, alg);
        collect(applySeq(s, step), depth - 1, [...acc, ...step]);
      }
    }
  };

  for (let depth = 0; depth <= maxDepth; depth++) {
    collect(state, depth, []);
    if (solutions.length > 0) {
      let best = solutions[0];
      let bestLen = compress([...prefix, ...best].map(parseMove)).length;
      for (const candidate of solutions.slice(1)) {
        const len = compress([...prefix, ...candidate].map(parseMove)).length;
        if (len < bestLen) {
          best = candidate;
          bestLen = len;
        }
      }
      return best;
    }
  }
  return null;
}

/** Applies search result as Move[] or throws. */
export function searchToMoves(
  result: string[] | null,
  errorMsg: string,
): Move[] {
  if (!result) throw new Error(errorMsg);
  return compress(result.map(parseMove));
}
