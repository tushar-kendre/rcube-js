/**
 * CFOP F2L — completes the first two layers after the cross.
 *
 * Deterministic and search-free. The target corner of a slot uniquely
 * determines the edge it pairs with, and the pair's configuration (corner/edge
 * position + orientation) uniquely determines the insertion case. Each slot is
 * solved by:
 *
 *   1. If the pair is accessible (in the free layer or the slot), look up the
 *      precomputed case for its configuration and apply it (see
 *      `buildInsertTable`). This is a pure table lookup — no runtime search.
 *   2. Otherwise a piece is buried inside another (unsolved) slot; one of that
 *      slot's own cross-safe case algs pops it back into the free layer, then we
 *      retry step 1.
 *
 * Algorithms are stored once in the textbook frame (white cross on the bottom,
 * reference slot front-right; see `algorithms.ts`). This cube keeps the cross on
 * U, the vertical mirror of the textbook, so each algorithm is mirrored into
 * this frame (U<->D, every turn inverted) and then has its two slot faces
 * substituted for the slot being solved.
 *
 * The beginner first-layer-corner + middle-edge inserts remain only as a final
 * safety net so the solve always completes.
 */

import { Face } from "../../../cube/model/faces";
import { applyMoves } from "../../../cube/moves/apply";
import {
  CubeState3x3,
  cloneState,
  createSolvedState,
} from "../../../cube/model/state-3x3";
import {
  Move,
  formatMove,
  invertSequence,
  parseMove,
} from "../../../cube/moves/notation";
import { solveFirstLayerCorners } from "../../beginner/first-layer";
import { solveSecondLayer } from "../../beginner/second-layer";
import { applySeq, dTurns } from "../../common/apply-seq";
import { compress } from "../../common/optimize";
import { STANDARD_F2L } from "./algorithms";
import { isF2LSolved, isPriorSlotsSolved } from "./detect";
import { F2L_SLOTS } from "./slots";

/** Side face immediately clockwise of each side face (used as the "right" of a slot). */
const RIGHT_OF: Record<string, Face> = { F: "R", R: "B", B: "L", L: "F" };

/** Front face for each F2L slot, in `F2L_SLOTS` order (FR, FL, BL, BR). */
const SLOT_FRONT: readonly Face[] = ["F", "L", "B", "R"];

const TOKEN = /^([UDLRFB])(2|')?$/;

/** Mirrors a textbook token (cross-on-bottom) into this cube's frame (cross-on-U). */
function mirrorToken(tok: string): string {
  const m = tok.match(TOKEN);
  if (!m) throw new Error(`Bad F2L token: ${tok}`);
  let face = m[1];
  const amount = m[2] === "2" ? 2 : m[2] === "'" ? 3 : 1;
  const inv = amount === 1 ? 3 : amount === 3 ? 1 : 2;
  if (face === "U") face = "D";
  else if (face === "D") face = "U";
  return face + (inv === 2 ? "2" : inv === 3 ? "'" : "");
}

/** Substitutes the reference slot's faces (front=F, right=R) for `front`/`right`. */
function substToken(tok: string, front: Face, right: Face): string {
  const m = tok.match(TOKEN);
  if (!m) throw new Error(`Bad F2L token: ${tok}`);
  let face = m[1];
  if (face === "F") face = front;
  else if (face === "R") face = right;
  return face + (m[2] ?? "");
}

/** All case algorithms remapped into this cube's frame for a given slot. */
function slotAlgorithms(slotIndex: number): string[][] {
  const front = SLOT_FRONT[slotIndex];
  const right = RIGHT_OF[front];
  return STANDARD_F2L.map((alg) =>
    alg.map((tok) => substToken(mirrorToken(tok), front, right)),
  );
}

const SLOT_ALGS: string[][][] = F2L_SLOTS.map((_, i) => slotAlgorithms(i));

function isSlotSolved(state: CubeState3x3, slotIndex: number): boolean {
  const slot = F2L_SLOTS[slotIndex];
  return (
    state.cp[slot.cornerSlot] === slot.cornerId &&
    state.co[slot.cornerSlot] === 0 &&
    state.ep[slot.edgeSlot] === slot.edgeId &&
    state.eo[slot.edgeSlot] === 0
  );
}

function slotDone(state: CubeState3x3, slotIndex: number): boolean {
  return isSlotSolved(state, slotIndex) && isPriorSlotsSolved(state, slotIndex);
}

function cornerPos(state: CubeState3x3, slotIndex: number): number {
  return state.cp.indexOf(F2L_SLOTS[slotIndex].cornerId);
}

function edgePos(state: CubeState3x3, slotIndex: number): number {
  return state.ep.indexOf(F2L_SLOTS[slotIndex].edgeId);
}

/** Corner is reachable from the free layer when it sits among the D corners. */
function cornerFree(pos: number): boolean {
  return pos >= 4;
}

/** Edge is in the free layer when it sits among the D edges (not a middle slot). */
function edgeFree(pos: number): boolean {
  return pos >= 4 && pos <= 7;
}

/** Number of the target pieces currently in the free layer. */
function freeCount(state: CubeState3x3, slotIndex: number): number {
  return (
    (cornerFree(cornerPos(state, slotIndex)) ? 1 : 0) +
    (edgeFree(edgePos(state, slotIndex)) ? 1 : 0)
  );
}

/**
 * Frees a buried corner/edge into the free layer. A piece is buried inside some
 * F2L slot k; applying one of slot k's own (cross-safe, prior-safe) case algs
 * pops it out without ever disturbing the cross or an already-solved slot.
 */
function freeBuriedPiece(state: CubeState3x3, slotIndex: number): string[] | null {
  const cp = cornerPos(state, slotIndex);
  const ep = edgePos(state, slotIndex);
  const before = freeCount(state, slotIndex);

  // F2L slot indices that currently bury a target piece (corner top slot p maps
  // to slot p; edge middle slot q maps to slot q-8).
  const burying = new Set<number>();
  if (!cornerFree(cp)) burying.add(cp);
  if (!edgeFree(ep)) burying.add(ep - 8);

  let best: string[] | null = null;
  let bestLen = Infinity;
  for (const k of burying) {
    for (let auf = 0; auf < 4; auf++) {
      const setup = dTurns(auf);
      for (const alg of SLOT_ALGS[k]) {
        const seq = [...setup, ...alg];
        const result = applySeq(cloneState(state), seq);
        if (!isPriorSlotsSolved(result, slotIndex)) continue;
        if (freeCount(result, slotIndex) <= before) continue; // require progress
        const len = compress(seq.map(parseMove)).length;
        if (len < bestLen) {
          best = seq;
          bestLen = len;
        }
      }
    }
  }
  return best;
}

/** Configuration key of the target pair (corner/edge position + orientation). */
function pairKey(state: CubeState3x3, slotIndex: number): string {
  const slot = F2L_SLOTS[slotIndex];
  const cp = state.cp.indexOf(slot.cornerId);
  const ep = state.ep.indexOf(slot.edgeId);
  return `${cp},${state.co[cp]},${ep},${state.eo[ep]}`;
}

function invertTokens(seq: string[]): string[] {
  return invertSequence(seq.map(parseMove)).map(formatMove);
}

/**
 * Precomputes, once per slot, the complete map from a pair configuration to the
 * shortest sequence that inserts it. Built by breadth-first search outward from
 * the solved state: applying the inverse of each `[setup, case]` reaches a new
 * configuration whose solution is that `[setup, case]` followed by the parent's.
 *
 * Because every case algorithm is confined to the slot (verified), only "pair
 * accessible" configurations are generated, and the table is exhaustive over
 * them — so runtime insertion is a pure lookup with no search.
 */
function buildInsertTable(slotIndex: number): Map<string, string[]> {
  const steps: string[][] = [];
  for (let auf = 0; auf < 4; auf++) {
    const setup = dTurns(auf);
    for (const alg of SLOT_ALGS[slotIndex]) steps.push([...setup, ...alg]);
  }
  const invSteps = steps.map(invertTokens);

  const table = new Map<string, string[]>();
  const solved = createSolvedState();
  table.set(pairKey(solved, slotIndex), []);

  let frontier: CubeState3x3[] = [solved];
  const MAX_ALGS = 2;
  for (let depth = 0; depth < MAX_ALGS; depth++) {
    const next: CubeState3x3[] = [];
    for (const st of frontier) {
      const solution = table.get(pairKey(st, slotIndex))!;
      for (let i = 0; i < steps.length; i++) {
        const reached = applySeq(cloneState(st), invSteps[i]);
        const key = pairKey(reached, slotIndex);
        if (table.has(key)) continue;
        table.set(
          key,
          compress([...steps[i], ...solution].map(parseMove)).map(formatMove),
        );
        next.push(reached);
      }
    }
    frontier = next;
  }
  return table;
}

/** Per-slot insertion tables, built lazily on first use (not at import time). */
const INSERT_TABLES: (Map<string, string[]> | undefined)[] = F2L_SLOTS.map(
  () => undefined,
);

function insertTable(slotIndex: number): Map<string, string[]> {
  let table = INSERT_TABLES[slotIndex];
  if (!table) {
    table = buildInsertTable(slotIndex);
    INSERT_TABLES[slotIndex] = table;
  }
  return table;
}

/**
 * Finishes a slot whose pair is accessible (in the free layer or the slot) by
 * looking up the precomputed deterministic case. Returns the moves, or null
 * when the pair is buried in another slot (handled by extraction).
 */
function insertPair(state: CubeState3x3, slotIndex: number): string[] | null {
  const seq = insertTable(slotIndex).get(pairKey(state, slotIndex));
  if (!seq) return null;
  return slotDone(applySeq(cloneState(state), seq), slotIndex) ? seq : null;
}

/** Solves one slot: free the buried pieces, then insert the pair. */
function solveSlot(state: CubeState3x3, slotIndex: number): string[] | null {
  let s = cloneState(state);
  const out: string[] = [];

  for (let guard = 0; guard < 16; guard++) {
    if (slotDone(s, slotIndex)) return out;

    // Try the deterministic case for the current configuration first. This
    // covers every standard F2L case (pair in the free layer, corner in slot,
    // edge in slot, or both in slot), not just the free-layer ones.
    const insert = insertPair(s, slotIndex);
    if (insert) {
      out.push(...insert);
      s = applySeq(s, insert);
      continue;
    }

    // No case applies — a piece is buried in another slot. Free it, then retry.
    const free = freeBuriedPiece(s, slotIndex);
    if (!free) return null;
    out.push(...free);
    s = applySeq(s, free);
  }

  return slotDone(s, slotIndex) ? out : null;
}

function solveF2LWithCases(state: CubeState3x3): Move[] | null {
  let s = cloneState(state);
  const out: string[] = [];

  for (let i = 0; i < F2L_SLOTS.length; i++) {
    if (isSlotSolved(s, i)) continue;
    const step = solveSlot(s, i);
    if (!step) return null;
    out.push(...step);
    s = applySeq(s, step);
  }

  return isF2LSolved(s) ? compress(out.map(parseMove)) : null;
}

function solveF2LFallback(state: CubeState3x3): Move[] {
  const corners = solveFirstLayerCorners(state);
  const afterCorners = applyMoves(cloneState(state), corners);
  const edges = solveSecondLayer(afterCorners);
  return compress([...corners, ...edges]);
}

/** Solves all four F2L pairs assuming the cross is done. Input is not mutated. */
export function solveF2L(state: CubeState3x3): Move[] {
  if (isF2LSolved(state)) return [];
  return solveF2LWithCases(state) ?? solveF2LFallback(state);
}

export { isF2LSolved } from "./detect";
