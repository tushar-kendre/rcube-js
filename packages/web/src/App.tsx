import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import "./App.css";
import { CameraTracker, FaceOrientationHUD } from "./components/face-orientation-hud";
import { Header } from "./components/header";
import { useCubieAnimation } from "./hooks/use-cubie-animation";
import { createSolvedCubieState } from "./lib/cubie-utils";
import { WhiteCrossSolver } from "./lib/white-cross-solver";
import { CubeFace, MoveNotation } from "./types/cube-core";
import { Cubie, CubieMoveNotation } from "./types/cubie";

// Lazy load heavy 3D components for better performance and code splitting
const Canvas = lazy(() =>
  import("@react-three/fiber").then((module) => ({
    default: module.Canvas,
  })),
);

const OrbitControls = lazy(() =>
  import("@react-three/drei").then((module) => ({
    default: module.OrbitControls,
  })),
);

const CubieRubiksCube = lazy(() =>
  import("./components/cube/cubie-rubiks-cube").then((module) => ({
    default: module.CubieRubiksCube,
  })),
);

// Lazy load control panel to reduce initial bundle size
const CubeControls = lazy(() =>
  import("./components/cube-controls").then((module) => ({
    default: module.default,
  })),
);

/**
 * Main application component that orchestrates the 3D Rubik's cube interface
 * Now using the new cubie-based data structure for better algorithm compatibility
 *
 * Features:
 * - Interactive 3D cube visualization
 * - Move animation system
 * - Control panel for cube manipulation
 * - Responsive design with mobile support
 * - Performance optimization through lazy loading
 * - Scales to any N×N×N cube size
 *
 * @returns JSX element containing the complete cube application
 */
function App() {
  // State for cube configuration
  const [cubeSize, setCubeSize] = useState(3);
  // State for face orientation HUD
  const [visibleFaces, setVisibleFaces] = useState<Array<{
    face: CubeFace;
    label: string;
    color: string;
    position: "center" | "top" | "bottom" | "left" | "right";
    opacity: number;
  }>>([]);

  // Memoize initial state to prevent unnecessary recreations
  const initialState = useMemo(() => {
    return createSolvedCubieState(cubeSize);
  }, [cubeSize]);

  // Cube animation and state management hook
  const {
    cubeState,
    cubeVersion,
    animationState,
    executeMove,
    executeMoves,
    stopAnimation,
    resetCube,
    isAnimating,
    isBusy, // New property that stays true throughout entire sequences
  } = useCubieAnimation({
    initialState,
    animationDuration: 600, // 600ms animation duration for smoother moves
    onSequenceComplete: (updatedState) => {
      // If this was a white cross solve, validate the result
      if (cubeSize === 3) {
        const solver = new WhiteCrossSolver(updatedState);
        solver.validateSolution(updatedState);
      }
    },
  });

  /**
   * Handles cubie click events for debugging and interaction
   *
   * @param cubie - The clicked cubie
   */
  const handleCubieClick = useCallback((_cubie: Cubie) => {
    // Cubie click handler (could be used for debugging or interaction)
  }, []);

  /**
   * Execute move function
   */
  const executeWithLogging = useCallback((move: CubieMoveNotation | MoveNotation) => {
    executeMove(move);
  }, [executeMove]);

  /**
   * Execute moves function
   */
  const executeMovesWithLogging = useCallback((moves: (MoveNotation | CubieMoveNotation)[]) => {
    executeMoves(moves);
  }, [executeMoves]);

  /**
   * Executes a test sequence of moves for demonstration
   */
  const testMoves = useCallback(() => {
    const moves: (MoveNotation | CubieMoveNotation)[] = ["R", "U", "R'", "U'"];
    executeMovesWithLogging(moves);
  }, [executeMovesWithLogging]);

  /**
   * Reset cube function
   */
  const resetCubeWithLogging = useCallback(() => {
    resetCube();
  }, [resetCube]);

  /**
   * Handles cube size changes and triggers recreation
   *
   * @param newSize - The new cube dimension
   */
  const handleCubeSizeChange = useCallback((newSize: number) => {
    setCubeSize(newSize);
  }, []);

  /**
   * Tests the white cross solver on the current cube state
   */
  const solveWhiteCross = useCallback(() => {
    if (cubeSize !== 3) {
      console.error("White cross solver only works on 3x3 cubes");
      return;
    }

    try {
      const solver = new WhiteCrossSolver(cubeState);
      const solutionMoves = solver.solve();
      
      if (solutionMoves.length > 0) {
        executeMovesWithLogging(solutionMoves);
      }
      
    } catch (error) {
      console.error("Error solving white cross:", error);
    }
  }, [cubeState, cubeSize, executeMovesWithLogging]);

  return (
    <>
      <Header />
      <div className="flex h-[calc(100vh-60px)] gap-4 p-4">        <div className="flex-1 relative">
          {/* Face Orientation HUD */}
          <FaceOrientationHUD isAnimating={isBusy} visibleFaces={visibleFaces} />
          
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full bg-gradient-to-br from-background to-muted rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading 3D Cube...</p>
                </div>
              </div>
            }
          >            <Canvas
              camera={{ position: [8, 8, 8], fov: 50 }}
              className="bg-gradient-to-br from-background to-muted"
            >
              <CameraTracker onVisibleFacesUpdate={setVisibleFaces} />
              <CubieRubiksCube
                key={`cube-${cubeVersion}`}
                state={cubeState}
                animationState={animationState}
                onCubieClick={handleCubieClick}
                cubeVersion={cubeVersion}
              />
              <OrbitControls
                enablePan={false}
                enableZoom={true}
                enableRotate={!isAnimating}
                autoRotate={false}
                minDistance={3}
                maxDistance={20}
              />
            </Canvas>
          </Suspense>
        </div>

        <Suspense
          fallback={
            <div className="w-80 bg-card border rounded-lg p-4">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-8 bg-muted rounded"></div>
                  <div className="h-8 bg-muted rounded"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </div>
              </div>
            </div>
          }
        >
          <CubeControls
            isAnimating={isBusy} // Use isBusy to keep controls disabled throughout sequences
            canStopAnimation={isBusy} // Can stop when busy (animating or has queued moves)
            executeMove={executeWithLogging}
            executeMoves={executeMovesWithLogging}
            resetCube={resetCubeWithLogging}
            stopAnimation={stopAnimation}
            testSequence={testMoves}
            solveWhiteCross={solveWhiteCross}
            cubeSize={cubeSize}
            onCubeSizeChange={handleCubeSizeChange}
          />
        </Suspense>
      </div>
    </>
  );
}

export default App;
