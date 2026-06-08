import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Group, Matrix4, Quaternion, Vector3 } from "three";
import { VisualCubieState } from "../../cube/model/state-visual";
import { Mat3, IDENTITY, toMatrixElements } from "../../cube/moves/orientation";
import { AnimationDescriptor, easeOutCubic } from "../animation";
import { CubiePiece } from "./cubie-piece";

interface RubiksCubeProps {
  /** Committed visual state of the cube. */
  visual: VisualCubieState;
  /** Committed whole-cube orientation (root group rotation). */
  orientation?: Mat3;
  /** Current layer rotation, or null when idle. */
  animation: AnimationDescriptor | null;
  /** Called once when the active rotation finishes. */
  onAnimationComplete: () => void;
}

/** Builds a quaternion from a 3x3 integer orientation matrix. */
function quaternionFromMat3(o: Mat3): Quaternion {
  const m = toMatrixElements(o);
  const mat = new Matrix4();
  // Matrix4.set is row-major; embed the 3x3 rotation into the upper-left block.
  mat.set(
    m[0], m[1], m[2], 0,
    m[3], m[4], m[5], 0,
    m[6], m[7], m[8], 0,
    0, 0, 0, 1,
  );
  return new Quaternion().setFromRotationMatrix(mat);
}

const AXIS_VECTOR: Record<"x" | "y" | "z", Vector3> = {
  x: new Vector3(1, 0, 0),
  y: new Vector3(0, 1, 0),
  z: new Vector3(0, 0, 1),
};

/**
 * Renders the cube and animates the active rotation with `useFrame`.
 *
 * All cubies live under a root group rotated by the committed orientation, so a
 * canonical-frame layer turn still looks correct after the cube has been
 * reoriented. Layer turns reparent the affected cubies under a pivot group that
 * rotates each frame; a whole-cube rotation (x/y/z) instead spins the root group
 * itself from the committed orientation toward the next one. React only
 * re-renders when the committed `visual`/`orientation` changes (once per move).
 */
export function RubiksCube({
  visual,
  orientation = IDENTITY,
  animation,
  onAnimationComplete,
}: RubiksCubeProps) {
  const center = (visual.size - 1) / 2;
  const rootRef = useRef<Group>(null);
  const pivotRef = useRef<Group>(null);
  const startTimeRef = useRef<number | null>(null);
  const activeMoveRef = useRef<number>(-1);
  const completedMoveRef = useRef<number>(-1);

  const baseQuat = useMemo(() => quaternionFromMat3(orientation), [orientation]);

  useFrame((state) => {
    const root = rootRef.current;
    if (!root) return;

    if (!animation) {
      root.quaternion.copy(baseQuat);
      return;
    }

    if (activeMoveRef.current !== animation.moveId) {
      activeMoveRef.current = animation.moveId;
      startTimeRef.current = state.clock.elapsedTime;
      pivotRef.current?.rotation.set(0, 0, 0);
      root.quaternion.copy(baseQuat);
    }

    if (completedMoveRef.current === animation.moveId) return;

    const start = startTimeRef.current ?? state.clock.elapsedTime;
    const progress = Math.min(
      (state.clock.elapsedTime - start) / (animation.durationMs / 1000),
      1,
    );
    const value = animation.angle * easeOutCubic(progress);

    if (animation.wholeCube) {
      const delta = new Quaternion().setFromAxisAngle(AXIS_VECTOR[animation.axis], value);
      root.quaternion.copy(delta).multiply(baseQuat);
    } else {
      root.quaternion.copy(baseQuat);
      pivotRef.current?.rotation.set(
        animation.axis === "x" ? value : 0,
        animation.axis === "y" ? value : 0,
        animation.axis === "z" ? value : 0,
      );
    }

    if (progress >= 1) {
      completedMoveRef.current = animation.moveId;
      onAnimationComplete();
    }
  });

  const affected = animation?.affectedIds;
  const usePivot = animation && !animation.wholeCube;

  return (
    <group>
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 12, 8]} intensity={0.7} />
      <directionalLight position={[-10, -8, -6]} intensity={0.25} />
      <pointLight position={[0, 0, 12]} intensity={0.3} />

      <group ref={rootRef}>
        <group name="static-cubies">
          {visual.cubies.map((cubie) =>
            usePivot && affected?.has(cubie.id) ? null : (
              <CubiePiece key={cubie.id} cubie={cubie} center={center} />
            ),
          )}
        </group>

        {usePivot && (
          <group ref={pivotRef} name="rotating-layer">
            {visual.cubies.map((cubie) =>
              affected?.has(cubie.id) ? (
                <CubiePiece key={cubie.id} cubie={cubie} center={center} />
              ) : null,
            )}
          </group>
        )}
      </group>
    </group>
  );
}

export default RubiksCube;
