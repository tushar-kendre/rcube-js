import { CubeColor, CubeFace, MoveNotation } from "../types/cube-core";
import {
  createCubieId,
  Cubie,
  CubieMove,
  CubieMoveNotation,
  CubiePosition,
  CubieState,
  DEFAULT_CUBIE_COLORS,
  FACE_TO_INDEX,
  generateCubiePositions,
  getCubieLayers,
  getCubieType,
  getVisibleFaces,
  positionToKey,
} from "../types/cubie";

/**
 * Creates a solved N×N×N cube in the cubie representation
 * @param size - Cube dimension (2, 3, 4, 5, etc.)
 * @returns Complete solved cubie state
 */
export function createSolvedCubieState(size: number): CubieState {
  const positions = generateCubiePositions(size);
  const cubies: Cubie[] = [];
  const positionMap = new Map<string, number>();

  positions.forEach((pos, index) => {
    const [x, y, z] = pos;
    const type = getCubieType(x, y, z, size);
    const visibleFaces = getVisibleFaces(x, y, z, size);
    const layers = getCubieLayers(x, y, z, size);
    const id = createCubieId(x, y, z, size);

    // Assign colors based on face positions
    const colors: Partial<Record<CubeFace, CubeColor>> = {};
    visibleFaces.forEach(face => {
      colors[face] = DEFAULT_CUBIE_COLORS[face];
    });

    const cubie: Cubie = {
      id,
      position: index, // Current position in array
      orientation: 0, // Solved orientation
      type,
      layers,
      renderPosition: pos,
      originalRenderPosition: [...pos] as CubiePosition,
      colors,
      renderOrientation: [1, 0, 0, 0, 1, 0, 0, 0, 1], // Identity matrix
    };

    cubies.push(cubie);
    positionMap.set(positionToKey(pos), index);
  });

  const state: CubieState = {
    size,
    cubies,
    positionMap,
  };

  return state;
}

/**
 * Parses a move notation string into a CubieMove object
 * Supports basic layer moves: R, R', R2, 2R, 3R, etc.
 * @param notation - Move notation string
 * @param size - Cube size for multi-layer moves
 * @returns Parsed move object
 */
export function parseCubieMove(notation: string, _size: number): CubieMove {
  const cleanNotation = notation.trim();
  let face: CubeFace;
  let layer = 1;
  let clockwise = true;
  let turns = 1;

  // Parse the notation
  let remaining = cleanNotation;

  // Check for prime (')
  if (remaining.endsWith("'") || remaining.endsWith("i")) {
    clockwise = false;
    remaining = remaining.slice(0, -1);
  }

  // Check for double move (2)
  if (remaining.endsWith('2')) {
    turns = 2;
    remaining = remaining.slice(0, -1);
  }

  // Check for layer number at the beginning (e.g., "2R", "3F")
  const layerMatch = remaining.match(/^(\d+)(.+)$/);
  if (layerMatch) {
    layer = parseInt(layerMatch[1]);
    remaining = layerMatch[2];
  }

  // Get the face
  const baseFace = remaining.toUpperCase();
  const faceMap: Record<string, CubeFace> = {
    'F': 'front',
    'B': 'back',
    'R': 'right',
    'L': 'left',
    'U': 'top',
    'D': 'bottom',
  };
  
  if (!(baseFace in faceMap)) {
    throw new Error(`Unknown move notation: ${notation}`);
  }
  face = faceMap[baseFace];

  const angle = (clockwise ? -1 : 1) * turns * Math.PI / 2;

  return {
    face,
    layer,
    wide: false, // We don't use wide moves
    clockwise,
    turns,
    angle,
  };
}



/**
 * Gets all possible moves for a given cube size (similar to cube-controls)
 * @param size - Cube size
 * @returns Array of all possible move notations
 */
export function getAllPossibleMoves(size: number): string[] {
  const moves: string[] = [];
  const faces = ['R', 'L', 'U', 'D', 'F', 'B'];
  const modifiers = ['', "'", '2'];
  
  faces.forEach(face => {
    // Layer 1 moves (standard face moves)
    modifiers.forEach(modifier => {
      moves.push(`${face}${modifier}`);
    });
    
    // Multi-layer moves (2R, 3R, etc.) up to size-1
    for (let layer = 2; layer < size; layer++) {
      modifiers.forEach(modifier => {
        moves.push(`${layer}${face}${modifier}`);
      });
    }
  });
  
  return moves;
}

/**
 * Gets all cubies that should be affected by a move
 * @param state - Current cube state
 * @param move - The move to execute
 * @returns Array of cubie indices that will be rotated
 */
export function getAffectedCubies(state: CubieState, move: CubieMove): number[] {
  const { face, layer } = move;
  const { size } = state;
  const affected: number[] = [];

  state.cubies.forEach((cubie, index) => {
    const [x, y, z] = cubie.renderPosition;
    let shouldAffect = false;

    // Determine if this cubie is in the affected layer
    switch (face) {
      case 'right':
        shouldAffect = x === size - layer;
        break;
      case 'left':
        shouldAffect = x === layer - 1;
        break;
      case 'top':
        shouldAffect = y === size - layer;
        break;
      case 'bottom':
        shouldAffect = y === layer - 1;
        break;
      case 'front':
        shouldAffect = z === size - layer;
        break;
      case 'back':
        shouldAffect = z === layer - 1;
        break;
    }

    if (shouldAffect) {
      affected.push(index);
    }
  });

  return affected;
}

/**
 * Rotates a position around an axis by 90 degrees
 * @param pos - Position to rotate
 * @param face - Face/axis of rotation
 * @param size - Cube size
 * @param clockwise - Rotation direction
 * @returns New rotated position
 */
export function rotatePosition(
  pos: CubiePosition,
  face: CubeFace,
  size: number,
  clockwise: boolean
): CubiePosition {
  const [x, y, z] = pos;
  const max = size - 1;

  switch (face) {
    case 'right':
    case 'left': // X-axis rotation
      if (clockwise === (face === 'right')) { // Inverted condition for right face
        return [x, z, max - y];
      } else {
        return [x, max - z, y];
      }
    case 'top':
    case 'bottom': // Y-axis rotation
      if (clockwise === (face === 'top')) {
        return [max - z, y, x];
      } else {
        return  [z, y, max - x];
      }
    case 'front':
    case 'back': // Z-axis rotation
      if (clockwise === (face === 'front')) {
        return [y, max - x, z];
      } else {
        return [max - y, x, z];
      }
    default:
      return pos;
  }
}

/**
 * Calculates the new orientation for a cubie after a move
 * @param cubie - The cubie being moved
 * @param move - The move being executed
 * @returns New orientation value
 */
export function calculateNewOrientation(cubie: Cubie, move: CubieMove): number {
  const { type } = cubie;
  const { face, clockwise, turns } = move;

  // Orientation changes depend on cubie type and move axis
  if (type === 'corner') {
    // Corners have 3-fold symmetry (0, 1, 2)
    const isXYZ = ['right', 'left', 'top', 'bottom', 'front', 'back'].includes(face);
    if (isXYZ) {
      const orientationChange = clockwise ? turns : -turns;
      return (cubie.orientation + orientationChange + 3) % 3;
    }
  } else if (type === 'edge') {
    // Edges have 2-fold symmetry (0, 1)
    const faceAxis = getFaceAxis(face);
    const cubieAxes = getCubieAxes(cubie);
    
    // Edge flips when move axis is perpendicular to one of its sticker faces
    if (cubieAxes.some(axis => axis !== faceAxis && isPerpendicularAxis(axis, faceAxis))) {
      return (cubie.orientation + turns) % 2;
    }
  }

  return cubie.orientation;
}

/**
 * Gets the axis for a face
 */
function getFaceAxis(face: CubeFace): 'x' | 'y' | 'z' {
  switch (face) {
    case 'right':
    case 'left':
      return 'x';
    case 'top':
    case 'bottom':
      return 'y';
    case 'front':
    case 'back':
      return 'z';
    default:
      return 'x';
  }
}

/**
 * Gets the axes that a cubie spans (based on its visible faces)
 */
function getCubieAxes(cubie: Cubie): ('x' | 'y' | 'z')[] {
  const axes: ('x' | 'y' | 'z')[] = [];
  const faces = Object.keys(cubie.colors) as CubeFace[];
  
  faces.forEach(face => {
    const axis = getFaceAxis(face);
    if (!axes.includes(axis)) {
      axes.push(axis);
    }
  });
  
  return axes;
}

/**
 * Checks if two axes are perpendicular
 */
function isPerpendicularAxis(axis1: 'x' | 'y' | 'z', axis2: 'x' | 'y' | 'z'): boolean {
  return axis1 !== axis2;
}

/**
 * Executes a single move on the cube state
 * @param state - Current cube state
 * @param move - Move to execute
 * @returns New cube state after the move
 */
export function executeCubieMove(state: CubieState, move: CubieMove): CubieState {
  const newState: CubieState = {
    ...state,
    cubies: [...state.cubies],
    positionMap: new Map(state.positionMap),
  };

  const affectedIndices = getAffectedCubies(state, move);
  const { turns } = move;

  // Apply the move for each 90-degree turn
  for (let turn = 0; turn < turns; turn++) {
    const originalCubies = affectedIndices.map(i => ({ ...newState.cubies[i] }));

    affectedIndices.forEach((cubieIndex, i) => {
      const cubie = newState.cubies[cubieIndex];
      const originalCubie = originalCubies[i];

      // Calculate new position after rotation
      const newRenderPos = rotatePosition(
        originalCubie.renderPosition,
        move.face,
        state.size,
        move.clockwise
      );

      // Update cubie position and orientation
      cubie.renderPosition = newRenderPos;
      cubie.orientation = calculateNewOrientation(originalCubie, move);

      // Update 3D rotation matrix
      const rotationMatrix = createRotationMatrix(move.face, move.clockwise);
      cubie.renderOrientation = multiplyMatrix3x3(rotationMatrix, originalCubie.renderOrientation);

      // Keep original colors - rendering will use orientation to determine display
      // cubie.colors remains unchanged from original solved state
    });

    // For multiple turns, use the updated state for the next iteration
    if (turn < turns - 1) {
      originalCubies.forEach((_, i) => {
        originalCubies[i] = { ...newState.cubies[affectedIndices[i]] };
      });
    }
  }

  // Rebuild the entire position map to ensure consistency
  newState.positionMap.clear();
  newState.cubies.forEach((cubie, index) => {
    const key = positionToKey(cubie.renderPosition);
    newState.positionMap.set(key, index);
  });

  return newState;
}

/**
 * Executes a move on a cubie state for solver algorithms
 * This function is designed for solvers and does not affect any rendered state or animations
 * @param state - The cubie state to execute the move on
 * @param moveNotation - Move notation string (e.g., "R", "U'", "F2", "2R")
 * @returns New cubie state after the move (original state is not modified)
 */
export function executeSolverMove(
  state: CubieState,
  moveNotation: CubieMoveNotation
): CubieState {
  const move = parseCubieMove(moveNotation, state.size);
  return executeCubieMove(state, move);
}

/**
 * Executes a sequence of moves on a cubie state for solver algorithms
 * This function is designed for solvers and does not affect any rendered state or animations
 * @param state - The cubie state to execute the moves on
 * @param moveNotations - Array of move notation strings
 * @returns New cubie state after all moves (original state is not modified)
 */
export function executeSolverMoveSequence(
  state: CubieState,
  moveNotations: CubieMoveNotation[]
): CubieState {
  return moveNotations.reduce((currentState, moveNotation) => {
    return executeSolverMove(currentState, moveNotation);
  }, state);
}

/**
 * Creates a deep copy of a cubie state for solver algorithms
 * This is useful when you need to test moves without affecting the original state
 * @param state - The cubie state to copy
 * @returns Deep copy of the cubie state
 */
export function copyCubieState(state: CubieState): CubieState {
  return {
    size: state.size,
    cubies: state.cubies.map(cubie => ({
      ...cubie,
      renderPosition: [...cubie.renderPosition] as CubiePosition,
      originalRenderPosition: [...cubie.originalRenderPosition] as CubiePosition,
      colors: { ...cubie.colors },
      renderOrientation: [...cubie.renderOrientation],
    })),
    positionMap: new Map(state.positionMap),
  };
}

/**
 * Tests if a sequence of moves can be applied to a cubie state without errors
 * This is useful for validating move sequences before execution
 * @param state - The cubie state to test on
 * @param moveNotations - Array of move notation strings to test
 * @returns Object with success boolean and error message if any
 */
export function validateMoveSequence(
  state: CubieState,
  moveNotations: CubieMoveNotation[]
): { success: boolean; error?: string; invalidMove?: string } {
  try {
    for (const moveNotation of moveNotations) {
      // Try to parse the move - this will throw if invalid
      parseCubieMove(moveNotation, state.size);
    }
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { 
      success: false, 
      error: errorMessage,
      invalidMove: moveNotations.find(move => {
        try {
          parseCubieMove(move, state.size);
          return false;
        } catch {
          return true;
        }
      })
    };
  }
}

/**
 * Converts cube state to face matrices for use with standard algorithms
 * @param state - Current cube state
 * @returns 6 face matrices in standard format (F, R, U, B, L, D)
 */
export function cubieStateToFaceMatrices(state: CubieState): number[][] {
  const { size } = state;
  const faces: number[][] = Array(6).fill(null).map(() => 
    Array(size * size).fill(0)
  );

  // Process each cubie and directly determine which faces it contributes to
  state.cubies.forEach(cubie => {
    const [x, y, z] = cubie.renderPosition;
    
    // Only check faces that this cubie could potentially have stickers on
    // Determine which faces this cubie is actually on
    const potentialFaces: CubeFace[] = [];
    if (x === 0) potentialFaces.push('left');
    if (x === size - 1) potentialFaces.push('right');
    if (y === 0) potentialFaces.push('bottom');
    if (y === size - 1) potentialFaces.push('top');
    if (z === 0) potentialFaces.push('back');
    if (z === size - 1) potentialFaces.push('front');
    
    potentialFaces.forEach(face => {
      // Use the orientation-aware display color function
      const displayColor = getCubieDisplayColor(cubie, face, size);
      
      if (displayColor) {
        const faceIndex = FACE_TO_INDEX[face];
        let matrixIndex: number;

        // Calculate the index in the face matrix based on position
        switch (face) {
          case 'front':
            matrixIndex = (size - 1 - y) * size + x;
            break;
          case 'back':
            matrixIndex = (size - 1 - y) * size + (size - 1 - x);
            break;
          case 'right':
            matrixIndex = (size - 1 - y) * size + (size - 1 - z);
            break;
          case 'left':
            matrixIndex = (size - 1 - y) * size + z;
            break;
          case 'top':
            matrixIndex = z * size + x;
            break;
          case 'bottom':
            matrixIndex = (size - 1 - z) * size + x;
            break;
          default:
            return;
        }

        // Convert color to number for algorithm compatibility
        const colorNum = colorToNumber(displayColor);
        faces[faceIndex][matrixIndex] = colorNum;
      }
    });
  });

  return faces;
}

/**
 * Converts a color to a number for algorithm compatibility
 */
function colorToNumber(color: CubeColor): number {
  const colorMap: Record<CubeColor, number> = {
    white: 0,
    red: 1,
    blue: 2,
    orange: 3,
    green: 4,
    yellow: 5,
  };
  return colorMap[color] ?? 0;
}

/**
 * Gets a cubie at a specific render position
 * @param state - Cube state
 * @param position - Position to look up
 * @returns Cubie at that position, or null if none found
 */
export function getCubieAtPosition(
  state: CubieState,
  position: CubiePosition
): Cubie | null {
  const key = positionToKey(position);
  const index = state.positionMap.get(key);
  return index !== undefined ? state.cubies[index] : null;
}

/**
 * Checks if the cube is in a solved state
 * @param state - Cube state to check
 * @returns True if solved, false otherwise
 */
export function isCubieSolved(state: CubieState): boolean {
  return state.cubies.every(cubie => {
    // Check if cubie is in its original position
    const originalPos = cubie.originalRenderPosition;
    const currentPos = cubie.renderPosition;
    
    const positionMatch = originalPos[0] === currentPos[0] &&
                         originalPos[1] === currentPos[1] &&
                         originalPos[2] === currentPos[2];
    
    // Check if orientation is correct
    const orientationCorrect = cubie.orientation === 0;
    
    return positionMatch && orientationCorrect;
  });
}

/**
 * Converts legacy MoveNotation to CubieMoveNotation
 * @param move - Legacy move notation
 * @returns Cubie move notation string
 */
export function legacyMoveTocubieMove(move: MoveNotation): CubieMoveNotation {
  // For now, they should be the same format
  return move;
}

/**
 * Gets the color that should be displayed on a specific face of a cubie
 * based on its original colors, current position, and orientation
 * @param cubie - The cubie to get the color for
 * @param face - The face to get the color for
 * @param cubeSize - The size of the cube (N for NxNxN)
 * @returns The color that should be displayed on that face, or null if no color
 */
export function getCubieDisplayColor(cubie: Cubie, face: CubeFace, cubeSize: number): CubeColor | null {
  // Check if this face should have a sticker (is visible)
  const [x, y, z] = cubie.renderPosition;
  const visibleFaces = getVisibleFaces(x, y, z, cubeSize);
  
  if (!visibleFaces.includes(face)) {
    return null; // This face should not have a sticker
  }
  
  // Map the current face to the original face based on orientation
  const originalFace = mapCurrentFaceToOriginal(cubie, face);
  
  if (originalFace && cubie.colors[originalFace]) {
    return cubie.colors[originalFace];
  }
  
  // Fallback: if we can't find a mapping, try the direct face
  return cubie.colors[face] || null;
}

/**
 * Maps a current face to the original face based on cubie orientation and the moves applied
 * Uses the renderOrientation matrix to determine the mapping
 */
function mapCurrentFaceToOriginal(cubie: Cubie, currentFace: CubeFace): CubeFace | null {
  // Get the current face normal vector
  const currentNormal = getFaceNormal(currentFace);
  
  // Apply the inverse of the render orientation to get the original face normal
  const invMatrix = invertMatrix3x3(cubie.renderOrientation);
  const originalNormal = multiplyMatrixVector(invMatrix, currentNormal);
  
  // Convert the original normal back to a face
  return normalToFace(originalNormal);
}

/**
 * Gets the normal vector for a face
 */
function getFaceNormal(face: CubeFace): [number, number, number] {
  switch (face) {
    case 'right': return [1, 0, 0];
    case 'left': return [-1, 0, 0];
    case 'top': return [0, 1, 0];
    case 'bottom': return [0, -1, 0];
    case 'front': return [0, 0, 1];
    case 'back': return [0, 0, -1];
    default: return [0, 0, 0];
  }
}

/**
 * Converts a normal vector back to a face
 */
function normalToFace(normal: [number, number, number]): CubeFace | null {
  const [x, y, z] = normal;
  const tolerance = 0.5; // Threshold for determining direction
  
  if (Math.abs(x) > tolerance) {
    return x > 0 ? 'right' : 'left';
  } else if (Math.abs(y) > tolerance) {
    return y > 0 ? 'top' : 'bottom';
  } else if (Math.abs(z) > tolerance) {
    return z > 0 ? 'front' : 'back';
  }
  
  return null;
}

/**
 * Multiplies a 3x3 matrix by a 3D vector
 */
function multiplyMatrixVector(matrix: number[], vector: [number, number, number]): [number, number, number] {
  const [x, y, z] = vector;
  return [
    matrix[0] * x + matrix[1] * y + matrix[2] * z,
    matrix[3] * x + matrix[4] * y + matrix[5] * z,
    matrix[6] * x + matrix[7] * y + matrix[8] * z
  ];
}

/**
 * Inverts a 3x3 matrix represented as a flat array
 */
function invertMatrix3x3(matrix: number[]): number[] {
  const [a, b, c, d, e, f, g, h, i] = matrix;
  
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  
  if (Math.abs(det) < 1e-10) {
    // Matrix is not invertible, return identity
    return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  }
  
  const invDet = 1 / det;
  
  return [
    (e * i - f * h) * invDet,
    (c * h - b * i) * invDet,
    (b * f - c * e) * invDet,
    (f * g - d * i) * invDet,
    (a * i - c * g) * invDet,
    (c * d - a * f) * invDet,
    (d * h - e * g) * invDet,
    (b * g - a * h) * invDet,
    (a * e - b * d) * invDet
  ];
}

/**
 * Creates a 3D rotation matrix for a 90-degree rotation around an axis
 * @param face - Face/axis of rotation
 * @param clockwise - Rotation direction when looking at the face
 * @returns 3x3 rotation matrix as a flat array [m11, m12, m13, m21, m22, m23, m31, m32, m33]
 */
export function createRotationMatrix(face: CubeFace, clockwise: boolean): number[] {
  switch (face) {
    case 'right': // Rotate around positive X-axis (inverted for correct R move direction)
      if (clockwise) {
        return [1, 0, 0, 0, 0, 1, 0, -1, 0];
      } else {
        return [1, 0, 0, 0, 0, -1, 0, 1, 0];
      }
    case 'left': // Rotate around negative X-axis (opposite of right)
      if (clockwise) {
        return [1, 0, 0, 0, 0, -1, 0, 1, 0] ;
      } else {
        return [1, 0, 0, 0, 0, 1, 0, -1, 0];
      }
    case 'top': // Rotate around positive Y-axis
      if (clockwise) {
        return [0, 0, -1, 0, 1, 0, 1, 0, 0];
      } else {
        return [0, 0, 1, 0, 1, 0, -1, 0, 0] ;
      }
    case 'bottom': // Rotate around negative Y-axis (opposite of top)
      if (clockwise) {
        return [0, 0, 1, 0, 1, 0, -1, 0, 0];
      } else {
        return [0, 0, -1, 0, 1, 0, 1, 0, 0];
      }
    case 'front': // Rotate around positive Z-axis
      if (clockwise) {
        return [0, 1, 0, -1, 0, 0, 0, 0, 1];
      } else {
        return [0, -1, 0, 1, 0, 0, 0, 0, 1];
      }
    case 'back': // Rotate around negative Z-axis (opposite of front)
      if (clockwise) {
        return [0, -1, 0, 1, 0, 0, 0, 0, 1];
      } else {
        return [0, 1, 0, -1, 0, 0, 0, 0, 1];
      }
    default:
      return [1, 0, 0, 0, 1, 0, 0, 0, 1]; // Identity matrix
  }
}

/**
 * Multiplies two 3x3 matrices represented as flat arrays
 * @param a - First matrix [m11, m12, m13, m21, m22, m23, m31, m32, m33]
 * @param b - Second matrix
 * @returns Result matrix a * b
 */
export function multiplyMatrix3x3(a: number[], b: number[]): number[] {
  const result = new Array(9);
  
  // Matrix multiplication: C[i][j] = sum(A[i][k] * B[k][j])
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) {
        sum += a[i * 3 + k] * b[k * 3 + j];
      }
      result[i * 3 + j] = sum;
    }
  }
  
  return result;
}


