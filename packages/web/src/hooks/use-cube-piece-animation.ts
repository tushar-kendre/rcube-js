import { applyMove, applyMoves, parseMove } from "@/lib/cube-piece-moves";
import { AnimationState, CubeState, MoveNotation } from "@/types/cube-pieces";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Props interface for the useCubePieceAnimation hook
 */
interface UseCubePieceAnimationProps {
  /** Initial state of the cube */
  initialState: CubeState;
  /** Duration of each move animation in milliseconds */
  animationDuration?: number;
  /** Callback triggered when a single move completes */
  onMoveComplete?: (move: MoveNotation) => void;
  /** Callback triggered when a complete move sequence finishes */
  onSequenceComplete?: () => void;
}

/**
 * Custom hook for managing Rubik's cube piece animations and state transitions
 *
 * Handles smooth animation of cube face rotations, queuing of move sequences,
 * and synchronization between visual animations and logical cube state updates.
 *
 * @param initialState - The starting cube configuration
 * @param animationDuration - How long each move animation takes (default: 500ms)
 * @param onMoveComplete - Callback executed after each individual move
 * @param onSequenceComplete - Callback executed after all queued moves finish
 * @returns Object containing cube state, animation controls, and execution functions
 */
export function useCubePieceAnimation({
  initialState,
  animationDuration = 500,
  onMoveComplete,
  onSequenceComplete,
}: UseCubePieceAnimationProps) {
  // State management for cube configuration and animations
  const [cubeState, setCubeState] = useState<CubeState>(initialState);
  const [cubeVersion, setCubeVersion] = useState<number>(0); // Version counter for forced component recreation
  const [animationState, setAnimationState] = useState<AnimationState>({
    isAnimating: false,
    currentMove: null,
    currentAngle: 0,
    targetAngle: 0,
    progress: 0,
  });
  const [hasQueuedMoves, setHasQueuedMoves] = useState<boolean>(false);

  // Refs for managing animation state and queuing
  const moveQueueRef = useRef<MoveNotation[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);

  /**
   * Animates a single cube move with smooth rotation and state transition
   *
   * @param move - The move notation to animate (e.g., 'R', 'U', 'F'', etc.)
   * @returns boolean indicating if animation started successfully
   */
  const animateMove = useCallback(
    (move: MoveNotation) => {
      // Prevent starting new animation if one is already in progress
      if (animationState.isAnimating) return false;

      // Parse the move notation into a structured Move object
      const parsedMove = parseMove(move);

      // Initialize animation state
      setAnimationState({
        isAnimating: true,
        currentMove: parsedMove,
        currentAngle: 0,
        targetAngle: parsedMove.angle,
        progress: 0,
      });

      // Record animation start time for progress calculation
      startTimeRef.current = performance.now();

      /**
       * Recursive animation function called on each frame
       *
       * @param currentTime - Current timestamp from requestAnimationFrame
       */
      const animate = (currentTime: number) => {
        if (!startTimeRef.current) return;

        // Calculate animation progress (0 to 1)
        const elapsed = currentTime - startTimeRef.current;
        const progress = Math.min(elapsed / animationDuration, 1);

        // Apply smooth easing function (cubic ease-out)
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentAngle = parsedMove.angle * easeProgress;

        // Update animation state with current progress
        setAnimationState((prev) => ({
          ...prev,
          currentAngle,
          progress: easeProgress,
        }));

        if (progress < 1) {
          // Continue animation on next frame
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Animation complete - apply the move to the logical cube state
          setCubeState((prevState) => applyMove(prevState, parsedMove));

          // Force cube component recreation by incrementing version
          setCubeVersion((prev) => prev + 1);

          // Reset animation state
          setAnimationState({
            isAnimating: false,
            currentMove: null,
            currentAngle: 0,
            targetAngle: 0,
            progress: 0,
          });

          // Trigger completion callback
          onMoveComplete?.(move);

          // Process next move in queue if any exist
          if (moveQueueRef.current.length > 0) {
            const nextMove = moveQueueRef.current.shift()!;
            setTimeout(() => animateMove(nextMove), 100); // Small delay between moves for visual clarity
          } else {
            // All moves completed - update queue state and trigger sequence completion callback
            setHasQueuedMoves(false);
            onSequenceComplete?.();
          }
        }
      };

      // Start the animation loop
      animationFrameRef.current = requestAnimationFrame(animate);
      return true;
    },
    [
      animationState.isAnimating,
      animationDuration,
      onMoveComplete,
      onSequenceComplete,
    ],
  );

  /**
   * Executes a single move, either immediately or by adding to queue
   *
   * @param moveNotation - The move to execute (e.g., 'R', 'U'', 'F2')
   */
  const executeMove = useCallback(
    (moveNotation: MoveNotation) => {
      if (animationState.isAnimating) {
        // Animation in progress - add to queue
        moveQueueRef.current.push(moveNotation);
        setHasQueuedMoves(true);
      } else {
        // No animation - start immediately
        animateMove(moveNotation);
      }
    },
    [animateMove, animationState.isAnimating],
  );

  /**
   * Executes a sequence of moves with automatic queuing
   *
   * @param moves - Array of move notations to execute in order
   */
  const executeMoves = useCallback(
    (moves: MoveNotation[]) => {
      if (moves.length === 0) return;

      // Extract first move and queue the rest
      const [firstMove, ...remainingMoves] = moves;
      moveQueueRef.current.push(...remainingMoves);
      if (remainingMoves.length > 0) {
        setHasQueuedMoves(true);
      }
      executeMove(firstMove);
    },
    [executeMove],
  );

  /**
   * Immediately stops all animations and clears the move queue
   */
  const stopAnimation = useCallback(() => {
    // Cancel any active animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }

    // Clear the move queue and reset animation state
    moveQueueRef.current = [];
    setHasQueuedMoves(false);
    setAnimationState({
      isAnimating: false,
      currentMove: null,
      currentAngle: 0,
      targetAngle: 0,
      progress: 0,
    });
  }, []);

  /**
   * Resets the cube to its initial state and stops any animations
   */
  const resetCube = useCallback(() => {
    stopAnimation();
    setCubeState(initialState);
    setCubeVersion(0); // Reset version counter on cube reset
  }, [initialState, stopAnimation]);

  /**
   * Applies multiple moves instantly without animation
   *
   * @param moves - Array of moves to apply directly to the cube state
   */
  const applyCubeMoves = useCallback(
    (moves: MoveNotation[]) => {
      stopAnimation();
      setCubeState((prevState) => applyMoves(prevState, moves));
      setCubeVersion((prev) => prev + 1); // Increment version after applying moves
    },
    [stopAnimation],
  );

  /**
   * Sets the cube to a specific state instantly
   *
   * @param newState - The new cube state to apply
   */
  const setCubeToState = useCallback(
    (newState: CubeState) => {
      stopAnimation();
      setCubeState(newState);
      setCubeVersion((prev) => prev + 1); // Increment version to force recreation
    },
    [stopAnimation],
  );

  // Cleanup animation frame on component unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Update cube state when initialState changes (e.g., cube size change)
  useEffect(() => {
    setCubeState(initialState);
    setCubeVersion((prev) => prev + 1); // Increment version to force recreation
  }, [initialState]);

  // Calculate if the cube is busy (animating OR has queued moves)
  const isBusy = animationState.isAnimating || hasQueuedMoves;

  return {
    // Current cube state and manipulation functions
    cubeState,
    setCubeState,
    setCubeToState,
    cubeVersion, // Version counter for forcing component recreation

    // Animation state and control functions
    animationState,
    executeMove,
    executeMoves,
    stopAnimation,
    resetCube,
    applyCubeMoves,
    isAnimating: animationState.isAnimating,
    isBusy, // New property that stays true throughout entire sequences
  };
}
