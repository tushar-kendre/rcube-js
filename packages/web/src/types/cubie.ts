import { CubeColor, CubeFace } from "./cube-core";

/**
 * 3D position coordinates in cube space (x, y, z)
 * Coordinates range from 0 to (size-1) for each axis
 */
export type CubiePosition = [number, number, number];

/**
 * Cubie type classification based on position in an N×N×N cube
 */
export type CubieType = "corner" | "edge" | "center" | "wing" | "midEdge" | "innerCenter";

/**
 * Standard face encoding used in cubing algorithms
 * F=0, R=1, U=2, B=3, L=4, D=5
 */
export type FaceIndex = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Face mapping to standard algorithm notation
 */
export const FACE_TO_INDEX: Record<CubeFace, FaceIndex> = {
  front: 0,  // F
  right: 1,  // R  
  top: 2,    // U
  back: 3,   // B
  left: 4,   // L
  bottom: 5, // D
};

export const INDEX_TO_FACE: Record<FaceIndex, CubeFace> = {
  0: "front",
  1: "right", 
  2: "top",
  3: "back",
  4: "left",
  5: "bottom",
};

/**
 * Universal cubie representation that works for any N×N×N cube
 * This is the standard format used by cubing algorithms and solvers
 */
export interface Cubie {
  /** Unique identifier for this cubie (based on original position) */
  id: number;
  /** Current position index in the cube's piece array */
  position: number;
  /** Orientation value (meaning depends on cubie type) */
  orientation: number;
  /** Type of cubie based on how many stickers it has */
  type: CubieType;
  /** Layer positions this cubie belongs to (for N×N×N cubes) */
  layers: number[];
  
  // === RENDERING PROPERTIES (not used by algorithms) ===
  /** Current 3D grid position for rendering (x, y, z) */
  renderPosition: CubiePosition;
  /** Original solved 3D position for identification */
  originalRenderPosition: CubiePosition;
  /** Visible face colors for 3D rendering */
  colors: Partial<Record<CubeFace, CubeColor>>;
  /** 3x3 rotation matrix for smooth 3D animations */
  renderOrientation: number[];
}

/**
 * Complete state of an N×N×N cube using universal cubie representation
 * This works for any cube size and is compatible with standard algorithms:
 * - 2×2×2: 8 corner cubies only
 * - 3×3×3: 8 corners + 12 edges + 6 centers  
 * - 4×4×4: 8 corners + 24 edges + 24 centers
 * - 5×5×5: 8 corners + 12 edges + 48 centers + centers/wings
 * Compatible with Kociemba, CFOP, Roux, and other standard algorithms
 */
export interface CubieState {
  /** Dimension of the cube (2 for 2×2×2, 3 for 3×3×3, etc.) */
  size: number;
  
  /** All cubies in a flat array, indexed by position */
  cubies: Cubie[];
  
  /** Quick lookup map for cubies by their current render position */
  positionMap: Map<string, number>;
}

/**
 * Determines the cubie type based on its position in an N×N×N cube
 * @param x - X coordinate (0 to size-1)
 * @param y - Y coordinate (0 to size-1) 
 * @param z - Z coordinate (0 to size-1)
 * @param size - Cube dimension
 * @returns The type of cubie at this position
 */
export function getCubieType(x: number, y: number, z: number, size: number): CubieType {
  const max = size - 1;
  const isEdgeX = x === 0 || x === max;
  const isEdgeY = y === 0 || y === max;
  const isEdgeZ = z === 0 || z === max;
  
  const edgeCount = (isEdgeX ? 1 : 0) + (isEdgeY ? 1 : 0) + (isEdgeZ ? 1 : 0);
  
  if (edgeCount === 3) {
    return "corner";
  } else if (edgeCount === 2) {
    return "edge";
  } else if (edgeCount === 1) {
    return "center";
  } else {
    // Internal pieces for larger cubes
    if (size <= 3) return "center"; // Should not happen for 3x3
    return "innerCenter";
  }
}

/**
 * Generates all cubie positions for an N×N×N cube
 * @param size - Cube dimension
 * @returns Array of all cubie positions
 */
export function generateCubiePositions(size: number): CubiePosition[] {
  const positions: CubiePosition[] = [];
  
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        // Skip internal pieces that are not visible
        const isVisible = x === 0 || x === size - 1 || 
                         y === 0 || y === size - 1 || 
                         z === 0 || z === size - 1;
        if (isVisible) {
          positions.push([x, y, z]);
        }
      }
    }
  }
  
  return positions;
}

/**
 * Gets the visible faces for a cubie at the given position
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param z - Z coordinate
 * @param size - Cube dimension
 * @returns Array of visible faces
 */
export function getVisibleFaces(x: number, y: number, z: number, size: number): CubeFace[] {
  const max = size - 1;
  const faces: CubeFace[] = [];
  
  if (x === 0) faces.push("left");
  if (x === max) faces.push("right");
  if (y === 0) faces.push("bottom");
  if (y === max) faces.push("top");
  if (z === 0) faces.push("back");
  if (z === max) faces.push("front");
  
  return faces;
}

/**
 * Gets the layers that a cubie at the given position belongs to
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param z - Z coordinate
 * @param size - Cube dimension
 * @returns Array of layer indices this cubie belongs to
 */
export function getCubieLayers(x: number, y: number, z: number, size: number): number[] {
  const layers: number[] = [];
  
  // X-axis layers (Left-Right)
  layers.push(x);
  if (x !== size - 1 - x) layers.push(size - 1 - x);
  
  // Y-axis layers (Bottom-Top)
  layers.push(y);
  if (y !== size - 1 - y) layers.push(size - 1 - y);
  
  // Z-axis layers (Back-Front)
  layers.push(z);
  if (z !== size - 1 - z) layers.push(size - 1 - z);
  
  return [...new Set(layers)].sort();
}

/**
 * Move notation string for cubie-based operations
 * Same format as existing: 'R', 'R2', '2R', "3U'", etc.
 */
export type CubieMoveNotation = string;

/**
 * Parsed move details for cubie operations
 */
export interface CubieMove {
  /** Face or axis of rotation */
  face: CubeFace;
  /** Layer depth: 1 = outer face, 2 = next inner layer, etc. */
  layer: number;
  /** Wide move: affects multiple layers (e.g., 'r' vs 'R') */
  wide: boolean;
  /** Rotation direction (true for clockwise) */
  clockwise: boolean;
  /** Number of 90° turns (1 for normal, 2 for double moves) */
  turns: number;
  /** Signed rotation angle in radians */
  angle: number;
}

/**
 * Animation state for cubie-based animations
 */
export interface CubieAnimationState {
  /** Whether a move animation is currently in progress */
  isAnimating: boolean;
  /** The move currently being animated, if any */
  currentMove: CubieMove | null;
  /** Current rotation angle during animation */
  currentAngle: number;
  /** Target angle for the current animation */
  targetAngle: number;
  /** Animation progress from 0 to 1 */
  progress: number;
  /** List of cubie IDs that are currently being animated */
  animatingCubies: number[];
}

/**
 * Utility type for identifying cubie position in string format
 * Format: "x,y,z" where x, y, z are coordinates
 */
export type CubiePositionKey = string;

/**
 * Helper function to create a position key from coordinates
 */
export function createPositionKey(x: number, y: number, z: number): CubiePositionKey {
  return `${x},${y},${z}`;
}

/**
 * Helper function to parse a position key back to coordinates
 */
export function parsePositionKey(key: CubiePositionKey): CubiePosition {
  const [x, y, z] = key.split(',').map(Number);
  return [x, y, z];
}

/**
 * Helper function to create a position key from a CubiePosition
 */
export function positionToKey(position: CubiePosition): CubiePositionKey {
  return createPositionKey(position[0], position[1], position[2]);
}

/**
 * Default color mapping for each face in solved state
 * Same as existing implementation for consistency
 */
export const DEFAULT_CUBIE_COLORS: Record<CubeFace, CubeColor> = {
  front: "red",
  back: "orange", 
  left: "green",
  right: "blue",
  top: "white",
  bottom: "yellow",
};

/**
 * Creates a unique cubie ID based on its original position
 * @param x - Original X coordinate
 * @param y - Original Y coordinate
 * @param z - Original Z coordinate
 * @param size - Cube dimension
 * @returns Unique numeric ID for the cubie
 */
export function createCubieId(x: number, y: number, z: number, size: number): number {
  return x + y * size + z * size * size;
}

/**
 * Converts a cubie ID back to its original position
 * @param id - Cubie ID
 * @param size - Cube dimension  
 * @returns Original position coordinates
 */
export function cubieIdToPosition(id: number, size: number): CubiePosition {
  const z = Math.floor(id / (size * size));
  const y = Math.floor((id % (size * size)) / size);
  const x = id % size;
  return [x, y, z];
}
