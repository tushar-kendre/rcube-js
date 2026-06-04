/**
 * Beginner-method first layer: white cross + white corners.
 *
 * Builds on the white cross (see `white-cross.ts`). White is the U center, so
 * the first layer is the U face: the four white edges plus the four white
 * corners, each with its side colors matched to the adjacent centers.
 *
 * Corner insertion is search-free. Each corner is brought to the bottom layer
 * directly beneath its home slot and then dropped in with one short insertion
 * chosen by its orientation, where X is the side face that lifts the bottom
 * corner up into the slot (R for URF, F for UFL, L for ULB, B for UBR):
 *
 *   white on a side : X' D' X          (3 moves)
 *   white on a side : D' X' D X         (4 moves)
 *   white facing down: X2 D' X2 D X2    (5 moves)
 *
 * These three insertions (discovered by an exhaustive search over {X, D} that
 * was then baked in as constants) share two properties for every slot:
 *   - they leave all four cross edges exactly in place, and
 *   - among the four top corners they only ever move their own target corner.
 *
 * So corners can be solved one at a time, in any order, without disturbing the
 * cross or a previously placed corner. A wrongly seated top corner is ejected
 * to the bottom with the same 3-move insertion. The final sequence is run
 * through `compress`.
 */

import { stateToVisual } from "../../cube/convert/visual";
import { CubeColor, CUBE_FACE_TO_FACE, Face } from "../../cube/model/faces";
import { applyMove } from "../../cube/moves/apply";
import { CubeState3x3, cloneState } from "../../cube/model/state-3x3";
import { Move, parseMove } from "../../cube/moves/notation";
import { compress } from "./optimize";
import { isCrossSolved, solveWhiteCross } from "./white-cross";

const WHITE: CubeColor = "white";

interface CornerTarget {
  /** The two side faces of the home slot, paired with their solved colors. */
  sides: ReadonlyArray<{ face: Face; color: CubeColor }>;
  /** Face whose turn lifts the corner directly below the slot up into it. */
  lift: Face;
  /** The three sticker colors that identify this corner piece. */
  colors: ReadonlySet<CubeColor>;
}

/** The four white corners, keyed by their home slot. */
const TARGETS: readonly CornerTarget[] = [
  {
    sides: [
      { face: "R", color: "blue" },
      { face: "F", color: "red" },
    ],
    lift: "R",
    colors: new Set<CubeColor>([WHITE, "blue", "red"]),
  }, // URF
  {
    sides: [
      { face: "F", color: "red" },
      { face: "L", color: "green" },
    ],
    lift: "F",
    colors: new Set<CubeColor>([WHITE, "red", "green"]),
  }, // UFL
  {
    sides: [
      { face: "L", color: "green" },
      { face: "B", color: "orange" },
    ],
    lift: "L",
    colors: new Set<CubeColor>([WHITE, "green", "orange"]),
  }, // ULB
  {
    sides: [
      { face: "B", color: "orange" },
      { face: "R", color: "blue" },
    ],
    lift: "B",
    colors: new Set<CubeColor>([WHITE, "orange", "blue"]),
  }, // UBR
];

/** Lift face for the slot identified by a pair of side faces. */
const LIFT_OF_PAIR: Record<string, Face> = {
  "F,R": "R",
  "F,L": "F",
  "B,L": "L",
  "B,R": "B",
};

interface CornerInfo {
  byFace: Partial<Record<Face, CubeColor>>;
  /** The two side faces (excluding U/D) the corner currently occupies. */
  sidePair: Face[];
  inTop: boolean;
}

/** Reads the corner cubie that carries the given set of three colors. */
function findCorner(state: CubeState3x3, colors: ReadonlySet<CubeColor>): CornerInfo {
  const visual = stateToVisual(state);
  for (const cubie of visual.cubies) {
    const entries = Object.entries(cubie.stickerColors) as [
      keyof typeof CUBE_FACE_TO_FACE,
      CubeColor,
    ][];
    if (entries.length !== 3) continue; // corners only

    const byFace: Partial<Record<Face, CubeColor>> = {};
    for (const [cubeFace, color] of entries) {
      byFace[CUBE_FACE_TO_FACE[cubeFace]] = color;
    }

    const cornerColors = new Set(Object.values(byFace) as CubeColor[]);
    if (cornerColors.size !== colors.size) continue;
    let matches = true;
    for (const c of colors) if (!cornerColors.has(c)) matches = false;
    if (!matches) continue;

    const sidePair = (Object.keys(byFace) as Face[]).filter(
      (f) => f !== "U" && f !== "D",
    );
    return { byFace, sidePair, inTop: "U" in byFace };
  }
  throw new Error("Corner not found");
}

function pairKey(faces: Face[]): string {
  return [...faces].sort().join(",");
}

/**
 * The three orientation-specific insertions (shortest first) that drop a corner
 * from the bottom slot below `lift`'s top slot into it. Exactly one solves a
 * given corner; the caller picks it by simulation.
 */
function insertionsFor(lift: Face): string[][] {
  return [
    [`${lift}'`, "D'", lift],
    ["D'", `${lift}'`, "D", lift],
    [`${lift}2`, "D'", `${lift}2`, "D", `${lift}2`],
  ];
}

function applySeq(state: CubeState3x3, moves: string[]): CubeState3x3 {
  let s = state;
  for (const m of moves) s = applyMove(s, parseMove(m));
  return s;
}

/** True when a corner is home: white up and both side colors matched. */
function cornerSolved(info: CornerInfo, target: CornerTarget): boolean {
  if (info.byFace.U !== WHITE) return false;
  return target.sides.every(({ face, color }) => info.byFace[face] === color);
}

/**
 * Solves the four white corners, assuming the white cross is already in place.
 * Returns the moves used; the input state is not mutated.
 */
export function solveFirstLayerCorners(state: CubeState3x3): Move[] {
  let s = cloneState(state);
  const out: string[] = [];

  for (const target of TARGETS) {
    for (let guard = 0; guard < 40; guard++) {
      const info = findCorner(s, target.colors);
      if (cornerSolved(info, target)) break;

      let step: string[];
      if (info.inTop) {
        // Eject the corner to the bottom with the 3-move insertion of the slot
        // it occupies (touches only that top corner, so others are preserved).
        const lift = LIFT_OF_PAIR[pairKey(info.sidePair)];
        step = [`${lift}'`, "D'", lift];
      } else {
        // Bottom layer: rotate it under its home slot, then drop it in with the
        // orientation-specific insertion that solves it.
        const dMoves: string[] = [];
        let aligned = s;
        const wantedPair = pairKey(target.sides.map((side) => side.face));
        for (let k = 0; k < 4; k++) {
          if (pairKey(findCorner(aligned, target.colors).sidePair) === wantedPair) break;
          dMoves.push("D");
          aligned = applySeq(aligned, ["D"]);
        }

        const insertion =
          insertionsFor(target.lift).find((seq) =>
            cornerSolved(findCorner(applySeq(aligned, seq), target.colors), target),
          ) ?? insertionsFor(target.lift)[0];
        step = [...dMoves, ...insertion];
      }

      out.push(...step);
      s = applySeq(s, step);

      if (guard === 39) throw new Error("First-layer corner did not converge");
    }
  }

  return compress(out.map(parseMove));
}

/**
 * Solves the entire white (first) layer: cross then corners. Returns the full
 * move sequence; the input state is not mutated.
 */
export function solveFirstLayer(state: CubeState3x3): Move[] {
  const cross = solveWhiteCross(state);
  const afterCross = cross.reduce((acc, move) => applyMove(acc, move), cloneState(state));
  const corners = solveFirstLayerCorners(afterCross);
  return compress([...cross, ...corners]);
}

/** True when the whole first (white) layer is solved on U. */
export function isFirstLayerSolved(state: CubeState3x3): boolean {
  if (!isCrossSolved(state)) return false;
  return TARGETS.every((target) => cornerSolved(findCorner(state, target.colors), target));
}
