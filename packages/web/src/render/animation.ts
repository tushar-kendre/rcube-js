/**
 * Description of an in-flight layer rotation, produced by the controller and
 * consumed by the renderer's `useFrame` animator.
 */

import { Axis } from "../cube/model/state-visual";

export interface AnimationDescriptor {
  /** Monotonically increasing id; a change signals a new move to animate. */
  moveId: number;
  /** Ids of the cubies that belong to the rotating layer. */
  affectedIds: Set<number>;
  /** Rotation axis. */
  axis: Axis;
  /** Signed target angle in radians. */
  angle: number;
  /** Animation duration in milliseconds. */
  durationMs: number;
}

/** Smooth ease-out used for layer rotations. */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
