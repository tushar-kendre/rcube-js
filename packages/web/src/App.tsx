import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import "./App.css";
import { Header } from "./components/header";
import { useCubePieceAnimation } from "./hooks/use-cube-piece-animation";
import { createSolvedCube } from "./lib/cube-piece-utils";
import { CubePiece, MoveNotation } from "./types/cube-pieces";

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

const RubiksCube = lazy(() =>
  import("./components/cube/rubiks-cube").then((module) => ({
    default: module.RubiksCube,
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
 *
 * Features:
 * - Interactive 3D cube visualization
 * - Move animation system
 * - Control panel for cube manipulation
 * - Responsive design with mobile support
 * - Performance optimization through lazy loading
 *
 * @returns JSX element containing the complete cube application
 */
function App() {
  // State for cube configuration
  const [cubeSize, setCubeSize] = useState(3);

  // Memoize initial state to prevent unnecessary recreations
  const initialState = useMemo(() => createSolvedCube(cubeSize), [cubeSize]);

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
  } = useCubePieceAnimation({
    initialState,
    animationDuration: 600,
    onMoveComplete: (move) => console.log(`Completed move: ${move}`),
    onSequenceComplete: () => console.log("Sequence completed!"),
  });

  /**
   * Handles cube piece click events for debugging and interaction
   *
   * @param piece - The clicked cube piece
   */
  const handlePieceClick = useCallback((piece: CubePiece) => {
    console.log(`Clicked ${piece.type} piece:`, piece);
    console.log(
      "Piece stickers:",
      piece.stickers.map((s) => `${s.face}: ${s.color}`),
    );
  }, []);

  /**
   * Executes a test sequence of moves for demonstration
   */
  const testMoves = useCallback(() => {
    const moves: MoveNotation[] = ["R", "U", "R'", "U'"];
    executeMoves(moves);
  }, [executeMoves]);

  /**
   * Handles cube size changes and triggers recreation
   *
   * @param newSize - The new cube dimension
   */
  const handleCubeSizeChange = useCallback((newSize: number) => {
    setCubeSize(newSize);
    // The cube will be recreated automatically when cubeSize changes
    // due to the useMemo dependency on initialState
  }, []);

  return (
    <>
      <Header />
      <div className="flex h-[calc(100vh-60px)] gap-4 p-4">
        <div className="flex-1 relative">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full bg-gradient-to-br from-background to-muted rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading 3D Cube...</p>
                </div>
              </div>
            }
          >
            <Canvas
              camera={{ position: [8, 8, 8], fov: 50 }}
              className="bg-gradient-to-br from-background to-muted"
            >
              <RubiksCube
                key={`cube-${cubeVersion}`}
                state={cubeState}
                onPieceClick={handlePieceClick}
                animationState={animationState}
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
            executeMove={executeMove}
            executeMoves={executeMoves}
            resetCube={resetCube}
            stopAnimation={stopAnimation}
            testSequence={testMoves}
            cubeSize={cubeSize}
            onCubeSizeChange={handleCubeSizeChange}
          />
        </Suspense>
      </div>
    </>
  );
}

export default App;
