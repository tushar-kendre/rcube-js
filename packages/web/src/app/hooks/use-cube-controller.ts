import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CubeModel,
  createCubeModel,
  modelFromState,
} from "../../cube/model/cube-model";
import { CubeState3x3, cloneState } from "../../cube/model/state-3x3";
import { getMoveGeometry, VisualCubieState } from "../../cube/model/state-visual";
import { formatMove, Move, parseMove } from "../../cube/moves/notation";
import {
  Mat3,
  axisForFace,
  cubeFaceAtWorld,
  worldFaceForCubeFace,
} from "../../cube/moves/orientation";
import { remapMove } from "../../cube/moves/resolve";
import { AnimationDescriptor } from "../../render/animation";
import { getSolver, SolveMethod } from "../../solvers/registry";
import { solvePocket } from "../../solvers/pocket/solve";

interface UseCubeControllerOptions {
  initialSize?: number;
  /** Per-move animation duration in milliseconds. */
  durationMs?: number;
  /** Solving method for 3×3 instant solve. */
  solveMethod?: SolveMethod;
}

export interface ExecuteOptions {
  /** Apply moves immediately without animation (for seek/rewind). */
  instant?: boolean;
}

export interface CubeController {
  size: number;
  visual: VisualCubieState;
  orientation: Mat3;
  animation: AnimationDescriptor | null;
  isBusy: boolean;
  isAnimating: boolean;
  onAnimationComplete: () => void;
  executeMove: (notation: string, options?: ExecuteOptions) => void;
  executeMoves: (notations: string[], options?: ExecuteOptions) => void;
  scramble: (length?: number) => void;
  solveCube: () => void;
  canSolve: boolean;
  reset: () => void;
  stop: () => void;
  setSize: (size: number) => void;
  /** Load a canonical 3×3 state (clears queue and animation). */
  loadState: (state: CubeState3x3) => void;
  /** Current canonical 3×3 state, or null for non-3×3 cubes. */
  getCanonicalState: () => CubeState3x3 | null;
}

const FACES = ["U", "D", "L", "R", "F", "B"] as const;
const SUFFIX = ["", "'", "2"] as const;
const SLICES = ["M", "E", "S"] as const;
const ROTATIONS = ["x", "y", "z"] as const;

const pick = <T,>(items: readonly T[]): T =>
  items[Math.floor(Math.random() * items.length)];

/**
 * Builds a scramble. For a 3x3 it occasionally emits wide, slice, and rotation
 * moves so solving must work from any orientation; larger cubes use outer and
 * inner-layer turns.
 */
function randomScramble(length: number, size: number): string[] {
  const moves: string[] = [];
  let lastFace = "";
  for (let i = 0; i < length; i++) {
    const roll = size === 3 ? Math.random() : 1;
    if (roll < 0.1) {
      moves.push(`${pick(ROTATIONS)}${pick(SUFFIX)}`);
      lastFace = "";
      continue;
    }
    if (roll < 0.22) {
      moves.push(`${pick(SLICES)}${pick(SUFFIX)}`);
      lastFace = "";
      continue;
    }

    let face = pick(FACES);
    while (face === lastFace) face = pick(FACES);
    lastFace = face;

    if (roll < 0.34) {
      moves.push(`${face}w${pick(SUFFIX)}`);
      continue;
    }

    const layer = size > 3 ? Math.floor(Math.random() * (size - 1)) + 1 : 1;
    const prefix = layer > 1 ? String(layer) : "";
    moves.push(`${prefix}${face}${pick(SUFFIX)}`);
  }
  return moves;
}

function parseTokens(notations: string[]): Move[] {
  const moves: Move[] = [];
  let skipped = 0;
  for (const token of notations) {
    for (const part of token.trim().split(/\s+/).filter(Boolean)) {
      try {
        moves.push(parseMove(part));
      } catch {
        skipped++;
      }
    }
  }
  if (skipped > 0) toast.warning(`Skipped ${skipped} invalid move(s).`);
  return moves;
}

export function useCubeController({
  initialSize = 3,
  durationMs = 300,
  solveMethod = "beginner",
}: UseCubeControllerOptions = {}): CubeController {
  const [size, setSizeState] = useState(initialSize);
  const modelRef = useRef<CubeModel>(createCubeModel(initialSize));
  const [visual, setVisual] = useState<VisualCubieState>(() =>
    modelRef.current.toVisual(),
  );
  const visualRef = useRef<VisualCubieState>(visual);
  const [orientation, setOrientation] = useState<Mat3>(modelRef.current.orientation);
  const [animation, setAnimation] = useState<AnimationDescriptor | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const queueRef = useRef<Move[]>([]);
  const moveIdRef = useRef(0);
  const currentMoveRef = useRef<Move | null>(null);

  const syncFromModel = useCallback(() => {
    const next = modelRef.current.toVisual();
    visualRef.current = next;
    setVisual(next);
    setOrientation(modelRef.current.orientation);
  }, []);

  const clearQueue = useCallback(() => {
    queueRef.current = [];
    currentMoveRef.current = null;
    setAnimation(null);
    setIsBusy(false);
  }, []);

  // Builds the animation for a screen-frame move. Rotations spin the whole cube
  // about a world axis; every other kind reparents the affected canonical-frame
  // layer(s) under the pivot (the renderer's root group applies the orientation).
  const buildAnimation = useCallback(
    (move: Move, moveId: number): AnimationDescriptor => {
      const cubeSize = modelRef.current.size;
      const orient = modelRef.current.orientation;
      const kind = move.kind ?? "face";

      if (kind === "rotation") {
        const magnitude = move.amount === 2 ? Math.PI : Math.PI / 2;
        const direction = move.amount === 3 ? 1 : -1;
        return {
          moveId,
          affectedIds: new Set<number>(),
          axis: axisForFace(move.face),
          angle: direction * magnitude,
          durationMs,
          wholeCube: true,
        };
      }

      const canonicalFace = cubeFaceAtWorld(orient, move.face);
      const geometry = getMoveGeometry({ ...move, face: canonicalFace }, cubeSize);
      const affectedIds = new Set<number>();
      for (const cubie of visualRef.current.cubies) {
        if (geometry.isAffected(cubie.gridPosition)) affectedIds.add(cubie.id);
      }
      return {
        moveId,
        affectedIds,
        axis: geometry.axis,
        angle: geometry.angle,
        durationMs,
      };
    },
    [durationMs],
  );

  const startNext = useCallback(() => {
    const queue = queueRef.current;
    const move = queue.shift();
    if (!move) {
      currentMoveRef.current = null;
      setAnimation(null);
      setIsBusy(false);
      return;
    }

    currentMoveRef.current = move;
    moveIdRef.current += 1;
    setAnimation(buildAnimation(move, moveIdRef.current));
    setIsBusy(true);
  }, [buildAnimation]);

  const onAnimationComplete = useCallback(() => {
    const move = currentMoveRef.current;
    if (move) {
      modelRef.current = modelRef.current.applyMove(move);
      syncFromModel();
    }
    startNext();
  }, [syncFromModel, startNext]);

  const applyInstant = useCallback(
    (moves: Move[]) => {
      for (const move of moves) {
        modelRef.current = modelRef.current.applyMove(move);
      }
      syncFromModel();
    },
    [syncFromModel],
  );

  const enqueue = useCallback(
    (moves: Move[]) => {
      if (moves.length === 0) return;
      queueRef.current.push(...moves);
      if (currentMoveRef.current === null) startNext();
    },
    [startNext],
  );

  const executeMoves = useCallback(
    (notations: string[], options?: ExecuteOptions) => {
      const moves = parseTokens(notations);
      if (moves.length === 0) return;
      if (options?.instant) {
        clearQueue();
        applyInstant(moves);
        return;
      }
      enqueue(moves);
    },
    [applyInstant, clearQueue, enqueue],
  );

  const executeMove = useCallback(
    (notation: string, options?: ExecuteOptions) =>
      executeMoves([notation], options),
    [executeMoves],
  );

  const scramble = useCallback(
    (length = 25) => {
      const moves = randomScramble(length, modelRef.current.size);
      enqueue(parseTokens(moves));
      toast.success(`Scramble queued (${moves.length} moves).`);
    },
    [enqueue],
  );

  const solveCubeAction = useCallback(() => {
    const grid = modelRef.current.gridState;
    if (grid && grid.size === 2) {
      const solution = solvePocket(grid).map(formatMove);
      enqueue(parseTokens(solution));
      toast.info(`Optimal solve queued (${solution.length} moves).`);
      return;
    }

    const canonical = modelRef.current.canonicalState;
    if (!canonical) return;
    const solver = getSolver(solveMethod);
    // The solver works in the fixed canonical frame; relabel its outer moves into
    // the current screen frame so they animate correctly on a reoriented cube.
    const orient = modelRef.current.orientation;
    const solution = solver
      .solve(canonical)
      .map((move) =>
        formatMove(remapMove(move, (f) => worldFaceForCubeFace(orient, f))),
      );
    enqueue(parseTokens(solution));
    toast.info(`${solver.label} solve queued (${solution.length} moves).`);
  }, [enqueue, solveMethod]);

  const loadState = useCallback(
    (state: CubeState3x3) => {
      clearQueue();
      modelRef.current = modelFromState(cloneState(state));
      syncFromModel();
    },
    [clearQueue, syncFromModel],
  );

  const getCanonicalState = useCallback((): CubeState3x3 | null => {
    const s = modelRef.current.canonicalState;
    return s ? cloneState(s) : null;
  }, []);

  const rebuild = useCallback(
    (nextSize: number) => {
      clearQueue();
      modelRef.current = createCubeModel(nextSize);
      syncFromModel();
    },
    [clearQueue, syncFromModel],
  );

  const reset = useCallback(() => {
    rebuild(size);
    toast.message("Cube reset to solved.");
  }, [rebuild, size]);

  const stop = useCallback(() => {
    clearQueue();
    toast.message("Stopped — remaining moves cleared.");
  }, [clearQueue]);

  const setSize = useCallback(
    (nextSize: number) => {
      if (nextSize < 2 || nextSize === size) return;
      setSizeState(nextSize);
    },
    [size],
  );

  useEffect(() => {
    rebuild(size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  return {
    size,
    visual,
    orientation,
    animation,
    isBusy,
    isAnimating: animation !== null,
    onAnimationComplete,
    executeMove,
    executeMoves,
    scramble,
    solveCube: solveCubeAction,
    canSolve: size === 2 || size === 3,
    reset,
    stop,
    setSize,
    loadState,
    getCanonicalState,
  };
}
