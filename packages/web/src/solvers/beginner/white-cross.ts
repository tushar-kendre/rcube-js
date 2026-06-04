/**
 * Beginner-method white cross solver.
 *
 * This is a deterministic, search-free solver: it reads the cube like a human
 * (via the tested facelet/visual oracle), then applies known case algorithms.
 * There is no breadth-first / IDA* search and no large transposition table, so
 * memory use is O(1).
 *
 * Color scheme (fixed centers): U = white, D = yellow, F = red, B = orange,
 * L = green, R = blue. The white cross therefore lives on the U face.
 *
 * Strategy (direct insertion, one edge at a time):
 *   - Edges that are already solved are left untouched (zero moves).
 *   - Each remaining white edge is reduced to "white-down in the bottom" and
 *     then lifted into its U slot with a single double turn of its target face.
 *   - Every step is chosen so it never disturbs an already-solved cross edge:
 *     bottom alignment uses only D turns (which never touch U), the final lift
 *     is a `<target>2` that only affects its own U slot, and the rare case of a
 *     piece trapped between two solved faces is freed with a restoring
 *     conjugate. The resulting sequence is then run through `compress`.
 */

import { stateToVisual } from "../../cube/convert/visual";
import { CubeColor, CUBE_FACE_TO_FACE, Face } from "../../cube/model/faces";
import { applyMove } from "../../cube/moves/apply";
import { CubeState3x3, cloneState } from "../../cube/model/state-3x3";
import { Move, parseMove } from "../../cube/moves/notation";
import { compress } from "./optimize";

const WHITE: CubeColor = "white";

/** Side face that each non-white edge color belongs against. */
const COLOR_TARGET: Record<CubeColor, Face> = {
  red: "F",
  blue: "R",
  orange: "B",
  green: "L",
  white: "U",
  yellow: "D",
};

/** Bottom-layer faces in D-clockwise order (one D turn advances by one). */
const D_ORDER: Face[] = ["F", "R", "B", "L"];

interface EdgeInfo {
  /** Map of the two occupied faces to their sticker color. */
  byFace: Partial<Record<Face, CubeColor>>;
  /** The two faces this edge occupies. */
  faces: Face[];
  /** Face the white sticker is on, or null for non-white edges. */
  whiteFace: Face | null;
  /** The non-white color (for white edges). */
  otherColor: CubeColor | null;
  /** Face the non-white sticker is on. */
  otherFace: Face | null;
}

/** Reads all 12 edges from the visual (sticker) representation of the state. */
function readEdges(state: CubeState3x3): EdgeInfo[] {
  const visual = stateToVisual(state);
  const edges: EdgeInfo[] = [];

  for (const cubie of visual.cubies) {
    const entries = Object.entries(cubie.stickerColors) as [
      keyof typeof CUBE_FACE_TO_FACE,
      CubeColor,
    ][];
    if (entries.length !== 2) continue; // edges only

    const byFace: Partial<Record<Face, CubeColor>> = {};
    for (const [cubeFace, color] of entries) {
      byFace[CUBE_FACE_TO_FACE[cubeFace]] = color;
    }

    const faces = Object.keys(byFace) as Face[];
    let whiteFace: Face | null = null;
    let otherColor: CubeColor | null = null;
    let otherFace: Face | null = null;
    for (const f of faces) {
      if (byFace[f] === WHITE) whiteFace = f;
      else {
        otherColor = byFace[f]!;
        otherFace = f;
      }
    }

    edges.push({ byFace, faces, whiteFace, otherColor, otherFace });
  }

  return edges;
}

function whiteEdges(state: CubeState3x3): EdgeInfo[] {
  return readEdges(state).filter((e) => e.whiteFace !== null);
}

/** True when every white edge is on U, oriented up, and color-matched. */
export function isCrossSolved(state: CubeState3x3): boolean {
  const whites = whiteEdges(state);
  if (whites.length !== 4) return false;
  return whites.every(
    (e) =>
      e.whiteFace === "U" &&
      e.otherColor !== null &&
      COLOR_TARGET[e.otherColor] === e.otherFace,
  );
}

function applySeq(state: CubeState3x3, moves: string[]): CubeState3x3 {
  let s = state;
  for (const m of moves) s = applyMove(s, parseMove(m));
  return s;
}

/** Notation for `k` clockwise quarter turns of a face (0..3). */
function turns(face: Face, k: number): string[] {
  const n = ((k % 4) + 4) % 4;
  if (n === 0) return [];
  if (n === 1) return [face];
  if (n === 2) return [`${face}2`];
  return [`${face}'`];
}

/** D turns to move a bottom edge from face `from` to face `to`. */
function alignBottom(from: Face, to: Face): string[] {
  const k = (D_ORDER.indexOf(to) - D_ORDER.indexOf(from) + 4) % 4;
  return turns("D", k);
}

/** The white edge identified by its non-white color. */
function edgeFor(state: CubeState3x3, color: CubeColor): EdgeInfo {
  return whiteEdges(state).find((e) => e.otherColor === color)!;
}

/** True when this white edge is home: white up on U, side color matched. */
function edgeSolved(edge: EdgeInfo, color: CubeColor): boolean {
  return (
    edge.whiteFace === "U" &&
    edge.otherColor === color &&
    edge.otherFace === COLOR_TARGET[color]
  );
}

/** Set of cross colors currently solved on the U face. */
function solvedColors(state: CubeState3x3): Set<CubeColor> {
  const set = new Set<CubeColor>();
  for (const e of whiteEdges(state)) {
    if (e.whiteFace === "U" && e.otherColor && COLOR_TARGET[e.otherColor] === e.otherFace) {
      set.add(e.otherColor);
    }
  }
  return set;
}

/** True when applying `step` keeps every color in `keep` solved. */
function preserves(state: CubeState3x3, step: string[], keep: Set<CubeColor>): boolean {
  const after = solvedColors(applySeq(state, step));
  for (const c of keep) if (!after.has(c)) return false;
  return true;
}

/** True when an edge is in the bottom layer with white facing down. */
function isWhiteDownBottom(edge: EdgeInfo): boolean {
  return edge.faces.includes("D") && edge.whiteFace === "D";
}

/**
 * Picks a step that drops a middle-layer white edge into the bottom with white
 * facing down. Turning the edge's color face sends white straight down; if that
 * face holds an already-solved edge, a restoring conjugate is used instead.
 */
function middleDrop(state: CubeState3x3, color: CubeColor, keep: Set<CubeColor>): string[] {
  const edge = edgeFor(state, color);
  const y = edge.otherFace!; // the non-white side; turning it sends white down

  const direct = [[y], [`${y}'`]];
  for (const step of direct) {
    if (isWhiteDownBottom(edgeFor(applySeq(state, step), color)) && preserves(state, step, keep)) {
      return step;
    }
  }

  // The color face is solved: free the piece without losing that edge.
  const conjugates = [
    [y, "D", `${y}'`],
    [y, "D'", `${y}'`],
    [`${y}'`, "D", y],
    [`${y}'`, "D'", y],
  ];
  for (const step of conjugates) {
    if (isWhiteDownBottom(edgeFor(applySeq(state, step), color)) && preserves(state, step, keep)) {
      return step;
    }
  }

  return direct[0];
}

/**
 * Solves a single white edge into its U slot without disturbing the cross edges
 * named in `keep` (already-solved colors). Returns the moves and new state.
 */
function solveCrossEdge(
  state: CubeState3x3,
  color: CubeColor,
  keep: Set<CubeColor>,
): { moves: string[]; state: CubeState3x3 } {
  const target = COLOR_TARGET[color];
  const moves: string[] = [];
  let s = state;

  for (let guard = 0; guard < 20; guard++) {
    const edge = edgeFor(s, color);
    if (edgeSolved(edge, color)) break;

    const hasU = edge.faces.includes("U");
    const hasD = edge.faces.includes("D");
    let step: string[];

    if (isWhiteDownBottom(edge)) {
      // Align under the target center, then lift with a double turn.
      step = [...alignBottom(edge.otherFace!, target), `${target}2`];
    } else if (hasU && edge.whiteFace === "U") {
      // White up in the wrong U slot: drop straight down with a double turn.
      step = [`${edge.faces.find((f) => f !== "U")!}2`];
    } else if (hasU) {
      // Flipped in the top: a quarter turn of its face moves it to the middle.
      step = [edge.whiteFace!];
    } else if (hasD) {
      // Flipped in the bottom: spin it under the target and lift to the middle.
      step = [...alignBottom(edge.faces.find((f) => f !== "D")!, target), target];
    } else {
      // Middle layer: drop it into the bottom, white facing down.
      step = middleDrop(s, color, keep);
    }

    moves.push(...step);
    s = applySeq(s, step);
  }

  return { moves, state: s };
}

/**
 * Returns the move sequence that solves the white cross for the given state.
 * The input state is not mutated.
 */
export function solveWhiteCross(state: CubeState3x3): Move[] {
  if (isCrossSolved(state)) return [];

  let s = cloneState(state);
  const out: string[] = [];
  const keep = new Set<CubeColor>();

  for (const color of ["red", "blue", "orange", "green"] as CubeColor[]) {
    const solved = solveCrossEdge(s, color, keep);
    out.push(...solved.moves);
    s = solved.state;
    keep.add(color);
  }

  return compress(out.map(parseMove));
}
