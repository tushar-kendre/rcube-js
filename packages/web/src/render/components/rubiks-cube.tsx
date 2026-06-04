import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Group } from "three";
import { VisualCubieState } from "../../cube/model/state-visual";
import { AnimationDescriptor, easeOutCubic } from "../animation";
import { CubiePiece } from "./cubie-piece";

interface RubiksCubeProps {
  /** Committed visual state of the cube. */
  visual: VisualCubieState;
  /** Current layer rotation, or null when idle. */
  animation: AnimationDescriptor | null;
  /** Called once when the active rotation finishes. */
  onAnimationComplete: () => void;
}

/**
 * Renders the cube and animates the active layer rotation with `useFrame`.
 *
 * During a move, the affected cubies are reparented under a pivot group that
 * rotates each frame via a ref mutation; the rest render statically. React only
 * re-renders when the committed `visual` changes (once per completed move), not
 * every frame.
 */
export function RubiksCube({ visual, animation, onAnimationComplete }: RubiksCubeProps) {
  const center = (visual.size - 1) / 2;
  const pivotRef = useRef<Group>(null);
  const startTimeRef = useRef<number | null>(null);
  const activeMoveRef = useRef<number>(-1);
  const completedMoveRef = useRef<number>(-1);

  useFrame((state) => {
    const pivot = pivotRef.current;
    if (!animation || !pivot) return;

    // A new move: reset the pivot and the animation clock.
    if (activeMoveRef.current !== animation.moveId) {
      activeMoveRef.current = animation.moveId;
      startTimeRef.current = state.clock.elapsedTime;
      pivot.rotation.set(0, 0, 0);
    }

    if (completedMoveRef.current === animation.moveId) return;

    const start = startTimeRef.current ?? state.clock.elapsedTime;
    const progress = Math.min(
      (state.clock.elapsedTime - start) / (animation.durationMs / 1000),
      1,
    );
    const value = animation.angle * easeOutCubic(progress);
    pivot.rotation.set(
      animation.axis === "x" ? value : 0,
      animation.axis === "y" ? value : 0,
      animation.axis === "z" ? value : 0,
    );

    if (progress >= 1) {
      completedMoveRef.current = animation.moveId;
      onAnimationComplete();
    }
  });

  const affected = animation?.affectedIds;

  return (
    <group>
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 12, 8]} intensity={0.7} />
      <directionalLight position={[-10, -8, -6]} intensity={0.25} />
      <pointLight position={[0, 0, 12]} intensity={0.3} />

      <group name="static-cubies">
        {visual.cubies.map((cubie) =>
          affected?.has(cubie.id) ? null : (
            <CubiePiece key={cubie.id} cubie={cubie} center={center} />
          ),
        )}
      </group>

      {animation && (
        <group ref={pivotRef} name="rotating-layer">
          {visual.cubies.map((cubie) =>
            affected?.has(cubie.id) ? (
              <CubiePiece key={cubie.id} cubie={cubie} center={center} />
            ) : null,
          )}
        </group>
      )}
    </group>
  );
}

export default RubiksCube;
