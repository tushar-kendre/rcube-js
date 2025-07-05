import { useCallback, useEffect, useRef, useState } from "react";
import {
  createSolvedCubieState,
  executeCubieMove,
  getAffectedCubies,
  legacyMoveTocubieMove,
  parseCubieMove,
} from "../lib/cubie-utils";
import { MoveNotation } from "../types/cube-core";
import {
  CubieAnimationState,
  CubieMoveNotation,
  CubieState,
} from "../types/cubie";

interface UseCubieAnimationOptions {
  /** Initial cube state */
  initialState: CubieState;
  /** Animation duration in milliseconds */
  animationDuration?: number;
  /** Callback when a single move completes */
  onMoveComplete?: (move: CubieMoveNotation) => void;
  /** Callback when a sequence completes */
  onSequenceComplete?: (finalState: CubieState) => void;
}

interface UseCubieAnimationReturn {
  /** Current cube state */
  cubeState: CubieState;
  /** Version number for forcing re-renders */
  cubeVersion: number;
  /** Current animation state */
  animationState: CubieAnimationState;
  /** Execute a single move */
  executeMove: (move: CubieMoveNotation | MoveNotation) => void;
  /** Execute a sequence of moves */
  executeMoves: (moves: (CubieMoveNotation | MoveNotation)[]) => void;
  /** Stop current animation */
  stopAnimation: () => void;
  /** Reset cube to solved state */
  resetCube: () => void;
  /** Whether any animation is currently running */
  isAnimating: boolean;
  /** Whether cube is busy (animating or has queued moves) */
  isBusy: boolean;
}

/**
 * Custom hook for managing cubie-based cube animations and state
 * This provides smooth animations for cube moves while maintaining the cubie-based data structure
 */
export function useCubieAnimation({
  initialState,
  animationDuration = 300,
  onMoveComplete,
  onSequenceComplete,
}: UseCubieAnimationOptions): UseCubieAnimationReturn {
  // Core state
  const [cubeState, setCubeState] = useState<CubieState>(initialState);
  const [cubeVersion, setCubeVersion] = useState(0);
  
  // Animation state
  const [animationState, setAnimationState] = useState<CubieAnimationState>({
    isAnimating: false,
    currentMove: null,
    currentAngle: 0,
    targetAngle: 0,
    progress: 0,
    animatingCubies: [],
  });
  
  // Animation refs
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const moveQueueRef = useRef<CubieMoveNotation[]>([]);
  const animationStartStateRef = useRef<CubieState | null>(null);
  const processNextMoveRef = useRef<(() => void) | null>(null);

  /**
   * Converts legacy move notation to cubie move notation
   */
  const normalizeMoveNotation = useCallback((move: CubieMoveNotation | MoveNotation): CubieMoveNotation => {
    return legacyMoveTocubieMove(move);
  }, []);

  /**
   * Easing function for smooth animation
   */
  const easeOutCubic = useCallback((t: number): number => {
    return 1 - Math.pow(1 - t, 3);
  }, []);

  /**
   * Animation frame handler
   */
  const animationLoop = useCallback((currentTime: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = currentTime;
    }

    const elapsed = currentTime - startTimeRef.current;
    const progress = Math.min(elapsed / animationDuration, 1);
    const easedProgress = easeOutCubic(progress);

    setAnimationState(prev => {
      if (!prev.currentMove || !prev.isAnimating) return prev;

      const currentAngle = prev.targetAngle * easedProgress;

      return {
        ...prev,
        currentAngle,
        progress: easedProgress,
      };
    });

    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animationLoop);
    } else {
      // Animation complete
      completeCurrentAnimation();
    }
  }, [animationDuration, easeOutCubic]);

  /**
   * Completes the current animation and applies the final state
   */
  const completeCurrentAnimation = useCallback(() => {
    setAnimationState(prev => {
      if (!prev.currentMove || !animationStartStateRef.current) return prev;

      // Apply the final move to the cube state that was active when animation started
      const finalState = executeCubieMove(animationStartStateRef.current, prev.currentMove);
      setCubeState(finalState);
      setCubeVersion(v => v + 1);

      // Clear the start state reference
      animationStartStateRef.current = null;

      // Notify completion
      const moveNotation = `${prev.currentMove.layer > 1 ? prev.currentMove.layer : ''}${prev.currentMove.face[0].toUpperCase()}${prev.currentMove.turns === 2 ? '2' : ''}${!prev.currentMove.clockwise ? "'" : ''}`;
      onMoveComplete?.(moveNotation);

      // Process next move after a short delay to ensure state updates
      setTimeout(() => processNextMoveRef.current?.(), 10);

      return {
        isAnimating: false,
        currentMove: null,
        currentAngle: 0,
        targetAngle: 0,
        progress: 0,
        animatingCubies: [],
      };
    });
  }, [onMoveComplete]);

  /**
   * Processes the next move in the queue
   */
  const processNextMove = useCallback(() => {
    // Get current state dynamically to avoid stale closure
    setCubeState(currentState => {
      if (moveQueueRef.current.length === 0) {
        // No more moves, sequence complete
        onSequenceComplete?.(currentState);
        return currentState;
      }

      const nextMoveNotation = moveQueueRef.current.shift()!;
      
      try {
        const nextMove = parseCubieMove(nextMoveNotation, currentState.size);
        const affectedCubies = getAffectedCubies(currentState, nextMove);
        
        // Store the current state for when animation completes
        animationStartStateRef.current = currentState;
        
        setAnimationState({
          isAnimating: true,
          currentMove: nextMove,
          currentAngle: 0,
          targetAngle: nextMove.angle,
          progress: 0,
          animatingCubies: affectedCubies,
        });

        // Start animation
        startTimeRef.current = 0;
        animationRef.current = requestAnimationFrame(animationLoop);
        
        // Validate that all affected cubie indices are valid
        const invalidIndices = affectedCubies.filter(index => index >= currentState.cubies.length || index < 0);
        if (invalidIndices.length > 0) {
          console.error(`Invalid cubie indices found:`, invalidIndices);
          console.error(`Cubie state:`, currentState);
        }
      } catch (error) {
        console.error('Error starting animation for move:', nextMoveNotation, error);
        // Use setTimeout to avoid infinite recursion in setState
        setTimeout(() => processNextMove(), 0);
      }
      
      return currentState; // Don't change state here
    });
  }, [animationLoop, onSequenceComplete]);

  // Store the processNextMove function in a ref for use in completeCurrentAnimation
  processNextMoveRef.current = processNextMove;

  /**
   * Executes a single move with animation
   */
  const executeMove = useCallback((move: CubieMoveNotation | MoveNotation) => {
    const normalizedMove = normalizeMoveNotation(move);
    
    if (animationState.isAnimating) {
      // Add to queue if already animating
      moveQueueRef.current.push(normalizedMove);
    } else {
      // Start immediately
      moveQueueRef.current = [normalizedMove];
      processNextMove();
    }
  }, [normalizeMoveNotation, animationState.isAnimating, processNextMove]);

  /**
   * Executes a sequence of moves with animation
   */
  const executeMoves = useCallback((moves: (CubieMoveNotation | MoveNotation)[]) => {
    if (moves.length === 0) return;

    const normalizedMoves = moves.map(normalizeMoveNotation);
    if (animationState.isAnimating) {
      // Add to queue if already animating
      moveQueueRef.current.push(...normalizedMoves);
    } else {
      // Start immediately
      moveQueueRef.current = [...normalizedMoves];
      processNextMove();
    }
  }, [normalizeMoveNotation, animationState.isAnimating, processNextMove]);

  /**
   * Stops current animation and clears queue
   */
  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    moveQueueRef.current = [];
    startTimeRef.current = 0;
    animationStartStateRef.current = null;
    
    setAnimationState({
      isAnimating: false,
      currentMove: null,
      currentAngle: 0,
      targetAngle: 0,
      progress: 0,
      animatingCubies: [],
    });
  }, []);

  /**
   * Resets the cube to solved state
   */
  const resetCube = useCallback(() => {
    stopAnimation();
    const solvedState = createSolvedCubieState(initialState.size);
    setCubeState(solvedState);
    setCubeVersion(prev => prev + 1);
  }, [initialState.size, stopAnimation]);

  // Update cube state when initial state changes (e.g., size change)
  useEffect(() => {
    stopAnimation();
    setCubeState(initialState);
    setCubeVersion(prev => prev + 1);
  }, [initialState, stopAnimation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    cubeState,
    cubeVersion,
    animationState,
    executeMove,
    executeMoves,
    stopAnimation,
    resetCube,
    isAnimating: animationState.isAnimating,
    isBusy: animationState.isAnimating || moveQueueRef.current.length > 0,
  };
}
