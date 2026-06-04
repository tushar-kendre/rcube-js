import { describe, expect, it } from "vitest";
import { FACES, FACE_COLOR } from "./model/faces";
import { createSolvedState, statesEqual } from "./model/state-3x3";
import {
  Move,
  formatMove,
  invertSequence,
  parseMove,
  parseSequence,
} from "./moves/notation";
import { applyMove, applyMoves, applyNotation } from "./moves/apply";
import { isSolved, isValidState } from "./validate/solved";
import {
  fromFacelets,
  toFacelets,
  toFaceletString,
} from "./convert/facelets";
import { stateToVisual } from "./convert/visual";

function randomMoves(count: number): Move[] {
  const moves: Move[] = [];
  for (let i = 0; i < count; i++) {
    const face = FACES[Math.floor(Math.random() * FACES.length)];
    const amount = ((Math.floor(Math.random() * 3) + 1) as 1 | 2 | 3);
    moves.push({ face, layer: 1, amount });
  }
  return moves;
}

describe("notation", () => {
  it("parses and formats single moves", () => {
    expect(parseMove("R")).toEqual({ face: "R", layer: 1, amount: 1 });
    expect(parseMove("R'")).toEqual({ face: "R", layer: 1, amount: 3 });
    expect(parseMove("R2")).toEqual({ face: "R", layer: 1, amount: 2 });
    expect(parseMove("3U'")).toEqual({ face: "U", layer: 3, amount: 3 });
    expect(formatMove({ face: "U", layer: 1, amount: 3 })).toBe("U'");
    expect(formatMove({ face: "R", layer: 2, amount: 2 })).toBe("2R2");
  });

  it("rejects invalid notation", () => {
    expect(() => parseMove("X")).toThrow();
    expect(() => parseMove("R3")).toThrow();
  });
});

describe("move engine invariants", () => {
  it("solved cube is solved and valid", () => {
    const solved = createSolvedState();
    expect(isSolved(solved)).toBe(true);
    expect(isValidState(solved)).toBe(true);
  });

  it("each base quarter turn has order 4", () => {
    for (const face of FACES) {
      let state = createSolvedState();
      const move: Move = { face, layer: 1, amount: 1 };
      for (let i = 0; i < 4; i++) {
        state = applyMove(state, move);
      }
      expect(isSolved(state)).toBe(true);
    }
  });

  it("a move followed by its inverse is identity", () => {
    for (const face of FACES) {
      const cw = applyMove(createSolvedState(), { face, layer: 1, amount: 1 });
      const back = applyMove(cw, { face, layer: 1, amount: 3 });
      expect(isSolved(back)).toBe(true);
    }
  });

  it("double turns equal two quarter turns", () => {
    for (const face of FACES) {
      const viaDouble = applyMove(createSolvedState(), { face, layer: 1, amount: 2 });
      const viaQuarters = applyMoves(createSolvedState(), [
        { face, layer: 1, amount: 1 },
        { face, layer: 1, amount: 1 },
      ]);
      expect(statesEqual(viaDouble, viaQuarters)).toBe(true);
    }
  });

  it("the sexy move (R U R' U') has order 6", () => {
    let state = createSolvedState();
    const seq = parseSequence("R U R' U'");
    for (let i = 0; i < 6; i++) {
      state = applyMoves(state, seq);
    }
    expect(isSolved(state)).toBe(true);
  });

  it("a scramble composed with its inverse returns to solved", () => {
    for (let trial = 0; trial < 50; trial++) {
      const scramble = randomMoves(25);
      const state = applyMoves(createSolvedState(), scramble);
      const back = applyMoves(state, invertSequence(scramble));
      expect(isSolved(back)).toBe(true);
    }
  });

  it("random scrambles stay physically valid", () => {
    for (let trial = 0; trial < 50; trial++) {
      const state = applyMoves(createSolvedState(), randomMoves(30));
      expect(isValidState(state)).toBe(true);
    }
  });
});

describe("facelets", () => {
  it("solved cube has uniform faces", () => {
    const facelets = toFaceletString(createSolvedState());
    expect(facelets).toBe(
      "UUUUUUUUU" +
        "RRRRRRRRR" +
        "FFFFFFFFF" +
        "DDDDDDDDD" +
        "LLLLLLLLL" +
        "BBBBBBBBB",
    );
  });

  it("round-trips arbitrary states", () => {
    for (let trial = 0; trial < 50; trial++) {
      const state = applyMoves(createSolvedState(), randomMoves(20));
      const restored = fromFacelets(toFacelets(state));
      expect(statesEqual(state, restored)).toBe(true);
    }
  });

  it("keeps centers fixed under any move", () => {
    const state = applyNotation(createSolvedState(), "R U F D L B R2 U'");
    const facelets = toFacelets(state);
    expect(facelets[4]).toBe("U");
    expect(facelets[13]).toBe("R");
    expect(facelets[22]).toBe("F");
    expect(facelets[31]).toBe("D");
    expect(facelets[40]).toBe("L");
    expect(facelets[49]).toBe("B");
  });
});

describe("visual conversion", () => {
  it("solved cube renders solved colors", () => {
    const visual = stateToVisual(createSolvedState());
    const solvedColor: Record<string, string> = {
      top: FACE_COLOR.U,
      bottom: FACE_COLOR.D,
      front: FACE_COLOR.F,
      back: FACE_COLOR.B,
      left: FACE_COLOR.L,
      right: FACE_COLOR.R,
    };
    expect(visual.size).toBe(3);
    expect(visual.cubies).toHaveLength(26);
    for (const cubie of visual.cubies) {
      for (const [face, color] of Object.entries(cubie.stickerColors)) {
        expect(color).toBe(solvedColor[face]);
      }
    }
  });

  it("a single R move recolors the expected stickers", () => {
    const state = applyNotation(createSolvedState(), "R");
    const visual = stateToVisual(state);
    // After R, the up-right column should now show the front color (red) on top.
    const topRight = visual.cubies.find(
      (c) => c.gridPosition[0] === 2 && c.gridPosition[1] === 2 && c.gridPosition[2] === 1,
    );
    expect(topRight?.stickerColors.top).toBe(FACE_COLOR.F);
  });
});