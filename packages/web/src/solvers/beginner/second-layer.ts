/**
 * Beginner-method second (middle) layer.
 *
 * Assumes the first layer is already solved on U (white on top). The four
 * middle-slice edges (FR, FL, BL, BR — the edges with neither white nor yellow)
 * are inserted from the free bottom (D) layer using the two classic beginner
 * algorithms. Because the solved layer is on top here (not the bottom as in the
 * usual diagrams), these are the vertical mirror of the textbook inserts:
 *
 *   right insert (front Fr, right Ri):  D' Ri' D Ri D Fr D' Fr'
 *   left  insert (front Fr, left  Le):  D  Le  D' Le' D' Fr' D Fr
 *
 * Each insert keeps the entire first layer intact and, among the four middle
 * edges, only ever touches the slot it fills. To place an edge we spin the free
 * layer so its side sticker matches a center, then pick the insert by which
 * neighbouring center the downward sticker belongs to. An edge stuck in the
 * wrong middle slot is kicked back down with one insert and then re-handled.
 */

import { stateToVisual } from "../../cube/convert/visual";
import { CubeColor, CUBE_FACE_TO_FACE, Face, FACE_COLOR } from "../../cube/model/faces";
import { applyMove } from "../../cube/moves/apply";
import { CubeState3x3, cloneState } from "../../cube/model/state-3x3";
import { Move, parseMove } from "../../cube/moves/notation";
import { compress } from "./optimize";
import { isFirstLayerSolved, solveFirstLayer } from "./first-layer";

/** Center color of each side face, and the reverse lookup. */
const FACE_OF_COLOR: Partial<Record<CubeColor, Face>> = {
  red: "F",
  orange: "B",
  green: "L",
  blue: "R",
};

/** Side face immediately clockwise (to the right) when looking at a face. */
const RIGHT_OF: Record<Face, Face> = { F: "R", R: "B", B: "L", L: "F", U: "U", D: "D" };
/** Side face immediately counter-clockwise (to the left). */
const LEFT_OF: Record<Face, Face> = { F: "L", L: "B", B: "R", R: "F", U: "U", D: "D" };

interface MiddleTarget {
  /** The two side faces of the slot (each center color is FACE_COLOR[face]). */
  faces: [Face, Face];
  /** The two colors identifying the edge. */
  colors: ReadonlySet<CubeColor>;
}

const TARGETS: readonly MiddleTarget[] = [
  { faces: ["F", "R"], colors: new Set<CubeColor>(["red", "blue"]) }, // FR
  { faces: ["F", "L"], colors: new Set<CubeColor>(["red", "green"]) }, // FL
  { faces: ["B", "L"], colors: new Set<CubeColor>(["orange", "green"]) }, // BL
  { faces: ["B", "R"], colors: new Set<CubeColor>(["orange", "blue"]) }, // BR
];

interface EdgeInfo {
  byFace: Partial<Record<Face, CubeColor>>;
  /** The side faces (excluding U/D) the edge occupies. */
  sideFaces: Face[];
  hasU: boolean;
  hasD: boolean;
}

/** Reads the edge cubie carrying the given pair of colors. */
function findEdge(state: CubeState3x3, colors: ReadonlySet<CubeColor>): EdgeInfo {
  const visual = stateToVisual(state);
  for (const cubie of visual.cubies) {
    const entries = Object.entries(cubie.stickerColors) as [
      keyof typeof CUBE_FACE_TO_FACE,
      CubeColor,
    ][];
    if (entries.length !== 2) continue; // edges only

    const byFace: Partial<Record<Face, CubeColor>> = {};
    for (const [cubeFace, color] of entries) byFace[CUBE_FACE_TO_FACE[cubeFace]] = color;

    const edgeColors = new Set(Object.values(byFace) as CubeColor[]);
    if (edgeColors.size !== 2) continue;
    let matches = true;
    for (const c of colors) if (!edgeColors.has(c)) matches = false;
    if (!matches) continue;

    const sideFaces = (Object.keys(byFace) as Face[]).filter((f) => f !== "U" && f !== "D");
    return { byFace, sideFaces, hasU: "U" in byFace, hasD: "D" in byFace };
  }
  throw new Error("Middle edge not found");
}

function applySeq(state: CubeState3x3, moves: string[]): CubeState3x3 {
  let s = state;
  for (const m of moves) s = applyMove(s, parseMove(m));
  return s;
}

function rightInsert(front: Face): string[] {
  const ri = RIGHT_OF[front];
  return ["D'", `${ri}'`, "D", ri, "D", front, "D'", `${front}'`];
}

function leftInsert(front: Face): string[] {
  const le = LEFT_OF[front];
  return ["D", le, "D'", `${le}'`, "D'", `${front}'`, "D", front];
}

/** True when the edge sits in its slot with both side colors matched. */
function middleSolved(state: CubeState3x3, target: MiddleTarget): boolean {
  const edge = findEdge(state, target.colors);
  if (edge.hasU || edge.hasD) return false;
  return target.faces.every((f) => edge.byFace[f] === FACE_COLOR[f]);
}

/** The front face whose right insert ejects the given middle slot. */
function ejectFront(sideFaces: Face[]): Face {
  return sideFaces.find((f) => RIGHT_OF[f] === sideFaces.find((g) => g !== f)) ?? sideFaces[0];
}

/**
 * Solves the four middle-layer edges, assuming the first layer is solved.
 * Returns the moves used; the input state is not mutated.
 */
export function solveSecondLayer(state: CubeState3x3): Move[] {
  let s = cloneState(state);
  const out: string[] = [];

  for (const target of TARGETS) {
    for (let guard = 0; guard < 20; guard++) {
      if (middleSolved(s, target)) break;

      const edge = findEdge(s, target.colors);

      let step: string[];
      if (!edge.hasU && !edge.hasD) {
        // Trapped in a middle slot (wrong place or flipped): kick it down.
        step = rightInsert(ejectFront(edge.sideFaces));
      } else {
        // In the bottom (free) layer: align under a matching center, then insert.
        const dMoves: string[] = [];
        let aligned = s;
        // Spin D until the edge's side sticker matches the center it sits on.
        let info = findEdge(aligned, target.colors);
        for (let k = 0; k < 4; k++) {
          info = findEdge(aligned, target.colors);
          const side = info.sideFaces[0];
          if (info.byFace[side] === FACE_COLOR[side]) break;
          dMoves.push("D");
          aligned = applySeq(aligned, ["D"]);
        }

        const matchFace = info.sideFaces[0];
        const otherColor = info.byFace.D!;
        const downFace = FACE_OF_COLOR[otherColor]!;

        const insert =
          RIGHT_OF[matchFace] === downFace ? rightInsert(matchFace) : leftInsert(matchFace);

        // Verify; fall back to the mirror insert if geometry was off.
        const candidate = [...dMoves, ...insert];
        if (middleSolved(applySeq(s, candidate), target)) {
          step = candidate;
        } else {
          step = [...dMoves, ...leftInsert(matchFace)];
          if (!middleSolved(applySeq(s, step), target)) {
            step = [...dMoves, ...rightInsert(matchFace)];
          }
        }
      }

      out.push(...step);
      s = applySeq(s, step);

      if (guard === 19) throw new Error("Middle-layer edge did not converge");
    }
  }

  return compress(out.map(parseMove));
}

/**
 * Solves the first two layers: first layer, then the middle edges. Returns the
 * full move sequence; the input state is not mutated.
 */
export function solveTwoLayers(state: CubeState3x3): Move[] {
  const first = solveFirstLayer(state);
  const afterFirst = first.reduce((acc, move) => applyMove(acc, move), cloneState(state));
  const second = solveSecondLayer(afterFirst);
  return compress([...first, ...second]);
}

/** True when the first two layers are solved. */
export function isSecondLayerSolved(state: CubeState3x3): boolean {
  if (!isFirstLayerSolved(state)) return false;
  return TARGETS.every((target) => middleSolved(state, target));
}
