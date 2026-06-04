/**
 * Compatibility re-exports for UI components (e.g. the orientation HUD).
 *
 * The canonical definitions now live in the framework-agnostic cube module;
 * this file keeps the older `@/types/cube-core` import path working.
 */

export type { CubeFace, CubeColor } from "../cube/model/faces";
export { DEFAULT_CUBE_COLORS, COLOR_MAP } from "../cube/model/faces";

/** Free-form move notation string (e.g. "R", "R'", "2L2"). */
export type MoveNotation = string;
