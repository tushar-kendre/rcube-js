/**
 * Optimal 2x2 (pocket cube) solver.
 *
 * The 3.67M-state space (DBL corner fixed) is small enough to precompute a full
 * BFS distance table from solved over the R/U/F generators. Solving then decodes
 * the scrambled state and walks down the table to a guaranteed-optimal sequence.
 *
 * Because the 2x2 has no fixed centers, the solve target is the absolute solved
 * cube (white up, red front, ...). We first reorient the whole cube so the DBL
 * piece (yellow/green/orange) is home - then R/U/F never disturb it and solve
 * the cube absolutely. The reorientation is emitted as whole-cube rotations.
 *
 * The table is built lazily on first solve and cached.
 */

import { DEFAULT_CUBE_COLORS } from "../../cube/model/faces";
import {
  GridCubeState,
  applyGridMove,
  createSolvedGrid,
  isGridSolved,
} from "../../cube/model/state-grid";
import { Move, parseMove } from "../../cube/moves/notation";
import { compress } from "../common/optimize";
import {
  GENERATORS,
  N_POCKET,
  applyGenerator,
  decodePocketInto,
  encodePocket,
  gridToCorners,
} from "./corners";

const UNVISITED = 255;

let distanceTable: Uint8Array | null = null;

/**
 * Lazily builds and caches the BFS distance table from the solved state.
 *
 * The hot loop is allocation-free: a single pair of cp/co scratch buffers is
 * reused for every decode, and generator actions are precomputed flat arrays.
 */
function getTable(): Uint8Array {
  if (distanceTable) return distanceTable;

  const dist = new Uint8Array(N_POCKET).fill(UNVISITED);
  dist[0] = 0; // solved coordinate (identity permutation, zero orientation)

  const cp = new Uint8Array(8);
  const co = new Uint8Array(8);
  const ncp = new Uint8Array(8);
  const nco = new Uint8Array(8);

  let frontier = new Int32Array(1);
  frontier[0] = 0;
  let frontierLen = 1;
  let depth = 0;

  while (frontierLen > 0) {
    const next = new Int32Array(frontierLen * GENERATORS.length);
    let nextLen = 0;

    for (let f = 0; f < frontierLen; f++) {
      decodePocketInto(frontier[f], cp, co);
      for (const gen of GENERATORS) {
        const { perm, ori } = gen;
        for (let i = 0; i < 8; i++) {
          ncp[i] = cp[perm[i]];
          nco[i] = (co[perm[i]] + ori[i]) % 3;
        }
        const nc = encodePocket(ncp, nco);
        if (dist[nc] === UNVISITED) {
          dist[nc] = depth + 1;
          next[nextLen++] = nc;
        }
      }
    }

    frontier = next;
    frontierLen = nextLen;
    depth++;
  }

  distanceTable = dist;
  return dist;
}

function applyGridSeq(grid: GridCubeState, moves: Move[]): GridCubeState {
  return moves.reduce(applyGridMove, grid);
}

/** Whole-cube rotation generators used to reorient the cube. */
const ROTATION_GENERATORS = ["x", "x2", "x'", "y", "y2", "y'"].map(parseMove);

function cubieAt(grid: GridCubeState, x: number, y: number, z: number) {
  return grid.cubies.find(
    (c) => c.position[0] === x && c.position[1] === y && c.position[2] === z,
  );
}

/** Orientation fingerprint: the colors on two opposite corners' six faces. */
function orientationSignature(grid: GridCubeState): string {
  const a = cubieAt(grid, 0, 0, 0);
  const b = cubieAt(grid, 1, 1, 1);
  return [
    a?.stickers.bottom,
    a?.stickers.left,
    a?.stickers.back,
    b?.stickers.top,
    b?.stickers.right,
    b?.stickers.front,
  ].join(",");
}

let rotationsCache: Move[][] | null = null;

/** The 24 whole-cube orientations as shortest x/y rotation sequences. */
function rotations24(): Move[][] {
  if (rotationsCache) return rotationsCache;

  const solved = createSolvedGrid(2);
  const seen = new Map<string, Move[]>();
  seen.set(orientationSignature(solved), []);

  let frontier: { grid: GridCubeState; seq: Move[] }[] = [{ grid: solved, seq: [] }];
  while (frontier.length > 0 && seen.size < 24) {
    const next: { grid: GridCubeState; seq: Move[] }[] = [];
    for (const { grid, seq } of frontier) {
      for (const rot of ROTATION_GENERATORS) {
        const ng = applyGridMove(grid, rot);
        const key = orientationSignature(ng);
        if (!seen.has(key)) {
          const nseq = [...seq, rot];
          seen.set(key, nseq);
          next.push({ grid: ng, seq: nseq });
        }
      }
    }
    frontier = next;
  }

  rotationsCache = [...seen.values()];
  return rotationsCache;
}

/**
 * Finds the whole-cube rotation that brings the solved DBL corner home
 * (yellow on the bottom, green on the left, orange on the back).
 */
function reorientToHome(grid: GridCubeState): Move[] {
  for (const seq of rotations24()) {
    const corner = cubieAt(applyGridSeq(grid, seq), 0, 0, 0);
    if (
      corner?.stickers.bottom === DEFAULT_CUBE_COLORS.bottom &&
      corner?.stickers.left === DEFAULT_CUBE_COLORS.left &&
      corner?.stickers.back === DEFAULT_CUBE_COLORS.back
    ) {
      return seq;
    }
  }
  return [];
}

/** True when the 2x2 grid is fully solved. */
export function isPocketSolved(grid: GridCubeState): boolean {
  return isGridSolved(grid);
}

/** Returns an optimal solution (rotations + R/U/F turns) for a scrambled 2x2. */
export function solvePocket(grid: GridCubeState): Move[] {
  const table = getTable();

  const reorient = reorientToHome(grid);
  const oriented = applyGridSeq(grid, reorient);

  let { cp, co } = gridToCorners(oriented);
  let coord = encodePocket(cp, co);
  let dist = table[coord];

  const turns: Move[] = [];
  while (dist > 0) {
    for (const gen of GENERATORS) {
      const n = applyGenerator(cp, co, gen);
      const nc = encodePocket(n.cp, n.co);
      if (table[nc] === dist - 1) {
        turns.push(gen.move);
        cp = n.cp;
        co = n.co;
        coord = nc;
        dist--;
        break;
      }
    }
  }

  return compress([...reorient, ...turns]);
}
