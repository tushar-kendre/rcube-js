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
import { AnimationDescriptor } from "../../render/animation";
import { solveCube } from "../../solvers";

interface UseCubeControllerOptions {
  initialSize?: number;
  /** Per-move animation duration in milliseconds. */
  durationMs?: number;
}

export interface ExecuteOptions {
  /** Apply moves immediately without animation (for seek/rewind). */
  instant?: boolean;
}

export interface CubeController {
  size: number;
  visual: VisualCubieState;
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
}: UseCubeControllerOptions = {}): CubeController {
  const [size, setSizeState] = useState(initialSize);
  const modelRef = useRef<CubeModel>(createCubeModel(initialSize));
  const [visual, setVisual] = useState<VisualCubieState>(() =>
    modelRef.current.toVisual(),
  );
  const visualRef = useRef<VisualCubieState>(visual);
  const [animation, setAnimation] = useState<AnimationDescriptor | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const queueRef = useRef<Move[]>([]);
  const moveIdRef = useRef(0);
  const currentMoveRef = useRef<Move | null>(null);

  const commitVisual = useCallback((next: VisualCubieState) => {
    visualRef.current = next;
    setVisual(next);
  }, []);

  const clearQueue = useCallback(() => {
    queueRef.current = [];
    currentMoveRef.current = null;
    setAnimation(null);
    setIsBusy(false);
  }, []);

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
    const geometry = getMoveGeometry(move, modelRef.current.size);
    const affectedIds = new Set<number>();
    for (const cubie of visualRef.current.cubies) {
      if (geometry.isAffected(cubie.gridPosition)) affectedIds.add(cubie.id);
    }

    moveIdRef.current += 1;
    setAnimation({
      moveId: moveIdRef.current,
      affectedIds,
      axis: geometry.axis,
      angle: geometry.angle,
      durationMs,
    });
    setIsBusy(true);
  }, [durationMs]);

  const onAnimationComplete = useCallback(() => {
    const move = currentMoveRef.current;
    if (move) {
      modelRef.current = modelRef.current.applyMove(move);
      commitVisual(modelRef.current.toVisual());
    }
    startNext();
  }, [commitVisual, startNext]);

  const applyInstant = useCallback(
    (moves: Move[]) => {
      for (const move of moves) {
        modelRef.current = modelRef.current.applyMove(move);
      }
      commitVisual(modelRef.current.toVisual());
    },
    [commitVisual],
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
      const max = modelRef.current.size;
      const moves: string[] = [];
      let lastFace = "";
      for (let i = 0; i < length; i++) {
        let face = FACES[Math.floor(Math.random() * FACES.length)];
        while (face === lastFace) {
          face = FACES[Math.floor(Math.random() * FACES.length)];
        }
        lastFace = face;
        const suffix = ["", "'", "2"][Math.floor(Math.random() * 3)];
        const layer = max > 3 ? Math.floor(Math.random() * (max - 1)) + 1 : 1;
        const prefix = layer > 1 ? String(layer) : "";
        moves.push(`${prefix}${face}${suffix}`);
      }
      enqueue(parseTokens(moves));
      toast.success(`Scramble queued (${moves.length} moves).`);
    },
    [enqueue],
  );

  const solveCubeAction = useCallback(() => {
    const canonical = modelRef.current.canonicalState;
    if (!canonical) return;
    const moves = solveCube(canonical).map(formatMove);
    enqueue(parseTokens(moves));
    toast.info(`Solve queued (${moves.length} moves).`);
  }, [enqueue]);

  const loadState = useCallback(
    (state: CubeState3x3) => {
      clearQueue();
      modelRef.current = modelFromState(cloneState(state));
      commitVisual(modelRef.current.toVisual());
    },
    [clearQueue, commitVisual],
  );

  const getCanonicalState = useCallback((): CubeState3x3 | null => {
    const s = modelRef.current.canonicalState;
    return s ? cloneState(s) : null;
  }, []);

  const rebuild = useCallback(
    (nextSize: number) => {
      clearQueue();
      modelRef.current = createCubeModel(nextSize);
      commitVisual(modelRef.current.toVisual());
    },
    [clearQueue, commitVisual],
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
    animation,
    isBusy,
    isAnimating: animation !== null,
    onAnimationComplete,
    executeMove,
    executeMoves,
    scramble,
    solveCube: solveCubeAction,
    canSolve: size === 3,
    reset,
    stop,
    setSize,
    loadState,
    getCanonicalState,
  };
}
