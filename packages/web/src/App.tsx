import { Suspense, lazy, useState } from "react";
import { useCubeController } from "./app/hooks/use-cube-controller";
import { useSolutionPlayback } from "./app/hooks/use-solution-playback";
import { CameraTracker, FaceOrientationHUD } from "./components/face-orientation-hud";
import { Header } from "./components/header";
import { CubeFace } from "./types/cube-core";

const Canvas = lazy(() =>
  import("@react-three/fiber").then((m) => ({ default: m.Canvas })),
);

const OrbitControls = lazy(() =>
  import("@react-three/drei").then((m) => ({ default: m.OrbitControls })),
);

const RubiksCube = lazy(() =>
  import("./render/components/rubiks-cube").then((m) => ({ default: m.RubiksCube })),
);

const CubeSidebar = lazy(() =>
  import("./components/cube-sidebar").then((m) => ({ default: m.CubeSidebar })),
);

interface VisibleFace {
  face: CubeFace;
  label: string;
  color: string;
  position: "center" | "top" | "bottom" | "left" | "right";
  opacity: number;
}

function App() {
  const [visibleFaces, setVisibleFaces] = useState<VisibleFace[]>([]);
  const controller = useCubeController({ initialSize: 3, durationMs: 300 });
  const playback = useSolutionPlayback(controller);

  const {
    visual,
    animation,
    isBusy,
    isAnimating,
    onAnimationComplete,
  } = controller;

  return (
    <>
      <Header />
      <div className="flex h-[calc(100vh-60px)] gap-4 p-4">
        <div className="relative min-w-0 flex-1">
          <FaceOrientationHUD isAnimating={isBusy} visibleFaces={visibleFaces} />

          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center rounded-lg bg-gradient-to-br from-background to-muted">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
                  <p className="text-muted-foreground">Loading 3D cube…</p>
                </div>
              </div>
            }
          >
            <Canvas
              camera={{ position: [8, 8, 8], fov: 50 }}
              className="rounded-lg bg-gradient-to-br from-background to-muted"
            >
              <CameraTracker onVisibleFacesUpdate={setVisibleFaces} />
              <RubiksCube
                visual={visual}
                animation={animation}
                onAnimationComplete={onAnimationComplete}
              />
              <OrbitControls
                enablePan={false}
                enableZoom
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
            <div className="w-80 rounded-lg border bg-card p-4">
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="space-y-2">
                  <div className="h-8 rounded bg-muted" />
                  <div className="h-8 rounded bg-muted" />
                </div>
              </div>
            </div>
          }
        >
          <CubeSidebar {...controller} playback={playback} />
        </Suspense>
      </div>
    </>
  );
}

export default App;
