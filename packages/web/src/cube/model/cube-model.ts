/**
 * Unified, immutable cube facade consumed by the controller and renderer.
 *
 * Size 3 is backed by the canonical CP/CO/EP/EO model (which the solvers use);
 * every other size is backed by the general grid model. Both expose the same
 * interface and both can produce a `VisualCubieState` for rendering.
 */

import { Move } from "../moves/notation";
import { Mat3, IDENTITY } from "../moves/orientation";
import { applyOrientedMove } from "../moves/resolve";
import {
  CubeState3x3,
  createSolvedState,
} from "./state-3x3";
import { isSolved as isSolved3x3 } from "../validate/solved";
import { stateToVisual } from "../convert/visual";
import {
  GridCubeState,
  applyGridMove,
  createSolvedGrid,
  gridToVisual,
  isGridSolved,
} from "./state-grid";
import { VisualCubieState } from "./state-visual";

export interface CubeModel {
  readonly size: number;
  isSolved(): boolean;
  applyMove(move: Move): CubeModel;
  applySequence(moves: Move[]): CubeModel;
  toVisual(): VisualCubieState;
  /** Canonical state, available only for 3x3 (used by solvers). */
  readonly canonicalState: CubeState3x3 | null;
  /** Grid state, available only for non-3x3 sizes (used by grid solvers). */
  readonly gridState: GridCubeState | null;
  /** Whole-cube orientation; identity for cubes that move cubies directly. */
  readonly orientation: Mat3;
}

class Cube3x3Model implements CubeModel {
  readonly size = 3;

  constructor(
    private readonly state: CubeState3x3,
    readonly orientation: Mat3 = IDENTITY,
  ) {}

  get canonicalState(): CubeState3x3 {
    return this.state;
  }

  readonly gridState = null;

  isSolved(): boolean {
    return isSolved3x3(this.state);
  }

  applyMove(move: Move): CubeModel {
    const next = applyOrientedMove({ state: this.state, orientation: this.orientation }, move);
    return new Cube3x3Model(next.state, next.orientation);
  }

  applySequence(moves: Move[]): CubeModel {
    let os = { state: this.state, orientation: this.orientation };
    for (const move of moves) os = applyOrientedMove(os, move);
    return new Cube3x3Model(os.state, os.orientation);
  }

  toVisual(): VisualCubieState {
    return stateToVisual(this.state);
  }
}

class GridCubeModel implements CubeModel {
  readonly canonicalState = null;
  readonly orientation = IDENTITY;

  constructor(private readonly state: GridCubeState) {}

  get gridState(): GridCubeState {
    return this.state;
  }

  get size(): number {
    return this.state.size;
  }

  isSolved(): boolean {
    return isGridSolved(this.state);
  }

  applyMove(move: Move): CubeModel {
    return new GridCubeModel(applyGridMove(this.state, move));
  }

  applySequence(moves: Move[]): CubeModel {
    return new GridCubeModel(moves.reduce(applyGridMove, this.state));
  }

  toVisual(): VisualCubieState {
    return gridToVisual(this.state);
  }
}

/** Builds a solved cube model for the given size. */
export function createCubeModel(size: number): CubeModel {
  if (size === 3) {
    return new Cube3x3Model(createSolvedState());
  }
  return new GridCubeModel(createSolvedGrid(size));
}

/** Wraps an existing canonical 3x3 state as a model (used after solving). */
export function modelFromState(state: CubeState3x3): CubeModel {
  return new Cube3x3Model(state);
}
