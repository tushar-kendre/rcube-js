import {
  CenterPiece,
  CornerPiece,
  CubeFace,
  CubeState,
  DEFAULT_CUBE_COLORS,
  EdgePiece,
  Position3D,
  Sticker,
} from "@/types/cube-pieces";

/**
 * Creates a solved cube state with pieces in their correct positions and colors
 *
 * @param size - The dimension of the cube (default: 3 for a standard 3x3x3 cube)
 * @returns A complete cube state with all pieces in solved configuration
 */
export function createSolvedCube(size: number = 3): CubeState {
  // Initialize arrays for different piece types
  const centers: CenterPiece[] = [];
  const edges: EdgePiece[] = [];
  const corners: CornerPiece[] = [];

  // Calculate the offset from center for positioning pieces
  const offset = (size - 1) / 2;

  // Generate all possible positions in the cube
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        const position: Position3D = [x - offset, y - offset, z - offset];
        const [px, py, pz] = position;

        // Determine which faces this position touches based on its coordinates
        const stickers: Sticker[] = [];

        // Check each face boundary and assign appropriate sticker colors
        if (px === -offset)
          stickers.push({ face: "left", color: DEFAULT_CUBE_COLORS.left });
        if (px === offset)
          stickers.push({ face: "right", color: DEFAULT_CUBE_COLORS.right });
        if (py === -offset)
          stickers.push({ face: "bottom", color: DEFAULT_CUBE_COLORS.bottom });
        if (py === offset)
          stickers.push({ face: "top", color: DEFAULT_CUBE_COLORS.top });
        if (pz === -offset)
          stickers.push({ face: "back", color: DEFAULT_CUBE_COLORS.back });
        if (pz === offset)
          stickers.push({ face: "front", color: DEFAULT_CUBE_COLORS.front });

        // Skip internal pieces (no visible stickers)
        if (stickers.length === 0) continue;

        // Generate unique piece identifier based on position
        const pieceId = `${x}-${y}-${z}`;

        // Create appropriate piece type based on number of visible faces
        if (stickers.length === 1) {
          // Center piece - has one visible face
          centers.push({
            id: pieceId,
            type: "center",
            position,
            originalPosition: [...position],
            stickers: [stickers[0]],
          });
        } else if (stickers.length === 2) {
          // Edge piece - has two visible faces
          edges.push({
            id: pieceId,
            type: "edge",
            position,
            originalPosition: [...position],
            stickers: [stickers[0], stickers[1]],
          });
        } else if (stickers.length === 3) {
          // Corner piece - has three visible faces
          corners.push({
            id: pieceId,
            type: "corner",
            position,
            originalPosition: [...position],
            stickers: [stickers[0], stickers[1], stickers[2]],
          });
        }
      }
    }
  }

  return { size, centers, edges, corners };
}

/**
 * Scrambles the cube by randomly shuffling piece positions
 * Note: This is a simplified scramble for demonstration - real scrambling should use valid move sequences
 *
 * @param state - The current cube state to scramble
 * @returns A new cube state with pieces in scrambled positions
 */
export function scrambleCube(state: CubeState): CubeState {
  const { edges, corners } = state;

  // Scramble edge pieces using Fisher-Yates shuffle
  const scrambledEdges = [...edges];
  for (let i = scrambledEdges.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    // Swap positions of two edge pieces
    [scrambledEdges[i].position, scrambledEdges[j].position] = [
      scrambledEdges[j].position,
      scrambledEdges[i].position,
    ];
  }

  // Scramble corner pieces using Fisher-Yates shuffle
  const scrambledCorners = [...corners];
  for (let i = scrambledCorners.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [scrambledCorners[i].position, scrambledCorners[j].position] = [
      scrambledCorners[j].position,
      scrambledCorners[i].position,
    ];
  }

  return {
    ...state,
    edges: scrambledEdges,
    corners: scrambledCorners,
  };
}

/**
 * Checks if a piece position is in a specific face layer
 *
 * @param position - 3D position of the piece to check
 * @param face - The face to check against
 * @param size - Cube size for calculating layer boundaries
 * @returns true if the piece is in the specified face layer
 */
export function isPieceInFaceLayer(
  position: Position3D,
  face: CubeFace,
  size: number,
): boolean {
  const [x, y, z] = position;
  const offset = (size - 1) / 2;

  // Check if position matches the face boundary coordinate
  switch (face) {
    case "right":
      return Math.abs(x - offset) < 0.001;
    case "left":
      return Math.abs(x + offset) < 0.001;
    case "top":
      return Math.abs(y - offset) < 0.001;
    case "bottom":
      return Math.abs(y + offset) < 0.001;
    case "front":
      return Math.abs(z - offset) < 0.001;
    case "back":
      return Math.abs(z + offset) < 0.001;
    default:
      return false;
  }
}

/**
 * Gets all pieces that are in a specific face layer
 *
 * @param state - Current cube state
 * @param face - The face layer to retrieve pieces from
 * @returns Array of pieces in the specified face layer
 */
export function getPiecesInFaceLayer(state: CubeState, face: CubeFace) {
  // Combine all piece types into a single array
  const allPieces = [...state.centers, ...state.edges, ...state.corners];
  return allPieces.filter((piece) =>
    isPieceInFaceLayer(piece.position, face, state.size),
  );
}

/**
 * Checks if a piece is in a specific layer depth for a given face
 *
 * @param position - 3D position of the piece to check
 * @param face - The face direction to check layers from
 * @param size - Cube size for calculating layer boundaries
 * @param layer - Layer depth (1 = face layer, 2 = next inner layer, etc.)
 * @returns true if the piece is in the specified layer
 */
export function isPieceInLayer(
  position: Position3D,
  face: CubeFace,
  size: number,
  layer: number,
): boolean {
  const [x, y, z] = position;
  const offset = (size - 1) / 2;
  const depth = offset - (layer - 1);

  switch (face) {
    case "right":
      return Math.abs(x - depth) < 0.001;
    case "left":
      return Math.abs(x + depth) < 0.001;
    case "top":
      return Math.abs(y - depth) < 0.001;
    case "bottom":
      return Math.abs(y + depth) < 0.001;
    case "front":
      return Math.abs(z - depth) < 0.001;
    case "back":
      return Math.abs(z + depth) < 0.001;
    default:
      return false;
  }
}

/**
 * Gets all pieces that are in a specific layer for a face
 */
export function getPiecesInLayer(
  state: CubeState,
  face: CubeFace,
  layer: number,
) {
  const allPieces = [...state.centers, ...state.edges, ...state.corners];
  return allPieces.filter((piece) =>
    isPieceInLayer(piece.position, face, state.size, layer),
  );
}

/**
 * Rotates a position around a face axis
 */
export function rotatePosition(
  position: Position3D,
  face: CubeFace,
  clockwise: boolean,
): Position3D {
  const [x, y, z] = position;

  switch (face) {
    case "right":
    case "left":
      // Rotate around X-axis
      return clockwise !== (face === "left") ? [x, -z, y] : [x, z, -y];

    case "top":
    case "bottom":
      // Rotate around Y-axis
      return clockwise !== (face === "bottom") ? [z, y, -x] : [-z, y, x];

    case "front": // F moves - rotation around Z-axis
      if (clockwise) {
        // front clockwise: rotate (x,y) -> (y, -x)
        return [y, -x, z];
      } else {
        // front counterclockwise: rotate (x,y) -> (-y, x)
        return [-y, x, z];
      }

    case "back": // B moves - rotation around Z-axis
      if (clockwise) {
        // back clockwise: rotate (x,y) -> (-y, x)
        return [-y, x, z];
      } else {
        // back counterclockwise: rotate (x,y) -> (y, -x)
        return [y, -x, z];
      }

    default:
      return position;
  }
}

/**
 * Rotates a sticker face when a piece is rotated
 */
export function rotateStickerFace(
  face: CubeFace,
  rotationFace: CubeFace,
  clockwise: boolean,
): CubeFace {
  // When a piece rotates, its stickers need to maintain their relative positions
  // This mapping shows how sticker faces change when pieces rotate around different axes

  switch (rotationFace) {
    case "right": // R moves - rotation around X-axis
      if (clockwise) {
        switch (face) {
          case "front":
            return "bottom";
          case "bottom":
            return "back";
          case "back":
            return "top";
          case "top":
            return "front";
          case "right":
            return "right"; // stays same
          case "left":
            return "left"; // stays same
          default:
            return face;
        }
      } else {
        // R'
        switch (face) {
          case "front":
            return "top";
          case "top":
            return "back";
          case "back":
            return "bottom";
          case "bottom":
            return "front";
          case "right":
            return "right";
          case "left":
            return "left";
          default:
            return face;
        }
      }

    case "left": // L moves - rotation around X-axis (opposite direction)
      if (clockwise) {
        switch (face) {
          case "front":
            return "top";
          case "top":
            return "back";
          case "back":
            return "bottom";
          case "bottom":
            return "front";
          case "right":
            return "right";
          case "left":
            return "left";
          default:
            return face;
        }
      } else {
        // L'
        switch (face) {
          case "front":
            return "bottom";
          case "bottom":
            return "back";
          case "back":
            return "top";
          case "top":
            return "front";
          case "right":
            return "right";
          case "left":
            return "left";
          default:
            return face;
        }
      }

    case "top": // U moves - rotation around Y-axis
      if (clockwise) {
        switch (face) {
          case "front":
            return "right";
          case "right":
            return "back";
          case "back":
            return "left";
          case "left":
            return "front";
          case "top":
            return "top";
          case "bottom":
            return "bottom";
          default:
            return face;
        }
      } else {
        // U'
        switch (face) {
          case "front":
            return "left";
          case "left":
            return "back";
          case "back":
            return "right";
          case "right":
            return "front";
          case "top":
            return "top";
          case "bottom":
            return "bottom";
          default:
            return face;
        }
      }

    case "bottom": // D moves - rotation around Y-axis (opposite direction)
      if (clockwise) {
        switch (face) {
          case "front":
            return "left";
          case "left":
            return "back";
          case "back":
            return "right";
          case "right":
            return "front";
          case "top":
            return "top";
          case "bottom":
            return "bottom";
          default:
            return face;
        }
      } else {
        // D'
        switch (face) {
          case "front":
            return "right";
          case "right":
            return "back";
          case "back":
            return "left";
          case "left":
            return "front";
          case "top":
            return "top";
          case "bottom":
            return "bottom";
          default:
            return face;
        }
      }

    case "front": // F moves - rotation around Z-axis
      if (clockwise) {
        switch (face) {
          case "top":
            return "right";
          case "right":
            return "bottom";
          case "bottom":
            return "left";
          case "left":
            return "top";
          case "front":
            return "front";
          case "back":
            return "back";
          default:
            return face;
        }
      } else {
        // F'
        switch (face) {
          case "top":
            return "left";
          case "left":
            return "bottom";
          case "bottom":
            return "right";
          case "right":
            return "top";
          case "front":
            return "front";
          case "back":
            return "back";
          default:
            return face;
        }
      }

    case "back": // B moves - rotation around Z-axis (opposite direction)
      if (clockwise) {
        switch (face) {
          case "top":
            return "left";
          case "left":
            return "bottom";
          case "bottom":
            return "right";
          case "right":
            return "top";
          case "front":
            return "front";
          case "back":
            return "back";
          default:
            return face;
        }
      } else {
        // B'
        switch (face) {
          case "top":
            return "right";
          case "right":
            return "bottom";
          case "bottom":
            return "left";
          case "left":
            return "top";
          case "front":
            return "front";
          case "back":
            return "back";
          default:
            return face;
        }
      }

    default:
      // Fallback for invalid rotation face
      return face;
  }
}

/**
 * Checks if the cube is in solved state
 */
export function isSolved(state: CubeState): boolean {
  const allPieces = [...state.centers, ...state.edges, ...state.corners];
  return allPieces.every(
    (piece) =>
      piece.position[0] === piece.originalPosition[0] &&
      piece.position[1] === piece.originalPosition[1] &&
      piece.position[2] === piece.originalPosition[2],
  );
}

/**
 * Creates a cube state with one F move already applied (hardcoded positions)
 * This helps test if the black sticker issue is in the rendering or move logic
 */
export function createCubeWithFMove(size: number = 3): CubeState {
  const centers: CenterPiece[] = [];
  const edges: EdgePiece[] = [];
  const corners: CornerPiece[] = [];

  const offset = (size - 1) / 2;

  // Generate all positions and apply F move logic
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        const position: Position3D = [x - offset, y - offset, z - offset];
        const [px, py, pz] = position;

        // Determine stickers for this position after F move
        const stickers: Sticker[] = [];

        // If this is on the front face (pz === offset), apply F move rotation logic
        if (pz === offset) {
          // Front face pieces have rotated clockwise
          // For front face, we need to rotate the sticker colors according to F move

          // Left side becomes top, top becomes right, right becomes bottom, bottom becomes left
          if (px === -offset)
            stickers.push({ face: "left", color: DEFAULT_CUBE_COLORS.bottom }); // was bottom
          if (px === offset)
            stickers.push({ face: "right", color: DEFAULT_CUBE_COLORS.top }); // was top
          if (py === -offset)
            stickers.push({ face: "bottom", color: DEFAULT_CUBE_COLORS.right }); // was right
          if (py === offset)
            stickers.push({ face: "top", color: DEFAULT_CUBE_COLORS.left }); // was left

          // Front face itself doesn't change color
          stickers.push({ face: "front", color: DEFAULT_CUBE_COLORS.front });
        } else {
          // Non-front face pieces remain the same
          if (px === -offset)
            stickers.push({ face: "left", color: DEFAULT_CUBE_COLORS.left });
          if (px === offset)
            stickers.push({ face: "right", color: DEFAULT_CUBE_COLORS.right });
          if (py === -offset)
            stickers.push({
              face: "bottom",
              color: DEFAULT_CUBE_COLORS.bottom,
            });
          if (py === offset)
            stickers.push({ face: "top", color: DEFAULT_CUBE_COLORS.top });
          if (pz === -offset)
            stickers.push({ face: "back", color: DEFAULT_CUBE_COLORS.back });
        }

        // Skip internal pieces
        if (stickers.length === 0) continue;

        const pieceId = `${x}-${y}-${z}`;

        // Create appropriate piece type
        if (stickers.length === 1) {
          centers.push({
            id: pieceId,
            type: "center",
            position,
            originalPosition: [...position],
            stickers: stickers as [Sticker],
          });
        } else if (stickers.length === 2) {
          edges.push({
            id: pieceId,
            type: "edge",
            position,
            originalPosition: [...position],
            stickers: stickers as [Sticker, Sticker],
          });
        } else if (stickers.length === 3) {
          corners.push({
            id: pieceId,
            type: "corner",
            position,
            originalPosition: [...position],
            stickers: stickers as [Sticker, Sticker, Sticker],
          });
        }
      }
    }
  }

  return {
    size,
    centers,
    edges,
    corners,
  };
}

/**
 * Converts cube state to simplified 6 face matrices for solver algorithms
 * Each face is represented as a 2D array where each cell contains the color of that position
 * Matrix rows represent the actual visual rows of each face when viewed from outside the cube
 *
 * @param state - The current cube state
 * @returns Object containing 6 face matrices (front, back, left, right, top, bottom)
 */
export function cubeStateToFaceMatrices(state: CubeState): Record<CubeFace, string[][]> {
  const { size } = state;
  const offset = (size - 1) / 2;

  // Initialize face matrices with empty strings
  const faceMatrices: Record<CubeFace, string[][]> = {
    front: Array(size)
      .fill(null)
      .map(() => Array(size).fill("")),
    back: Array(size)
      .fill(null)
      .map(() => Array(size).fill("")),
    left: Array(size)
      .fill(null)
      .map(() => Array(size).fill("")),
    right: Array(size)
      .fill(null)
      .map(() => Array(size).fill("")),
    top: Array(size)
      .fill(null)
      .map(() => Array(size).fill("")),
    bottom: Array(size)
      .fill(null)
      .map(() => Array(size).fill("")),
  };

  /**
   * Converts 3D cube position to 2D face matrix coordinates
   * Each face is viewed from outside the cube, with consistent orientation:
   * - Row 0 is the top visual row of the face
   * - Column 0 is the left visual column of the face
   */
  const positionToFaceCoords = (position: Position3D, face: CubeFace): [number, number] => {
    const [x, y, z] = position;
    
    // Convert from cube coordinates (-offset to +offset) to array indices (0 to size-1)
    const arrayX = x + offset;
    const arrayY = y + offset;
    const arrayZ = z + offset;

    switch (face) {
      case "front": // Looking at the front face (z = +offset)
        // Visual layout: x increases left-to-right, y increases bottom-to-top
        // Matrix layout: row 0 = top, col 0 = left
        return [size - 1 - arrayY, arrayX]; // row = inverted Y, col = X
        
      case "back": // Looking at the back face (z = -offset) 
        // When looking from outside, x appears flipped (right becomes left)
        // Visual layout: -x increases left-to-right, y increases bottom-to-top
        return [size - 1 - arrayY, size - 1 - arrayX]; // row = inverted Y, col = inverted X
        
      case "left": // Looking at the left face (x = -offset)
        // Visual layout: z increases left-to-right, y increases bottom-to-top
        return [size - 1 - arrayY, arrayZ]; // row = inverted Y, col = Z
        
      case "right": // Looking at the right face (x = +offset)
        // When looking from outside, z appears flipped (front becomes left)
        // Visual layout: -z increases left-to-right, y increases bottom-to-top  
        return [size - 1 - arrayY, size - 1 - arrayZ]; // row = inverted Y, col = inverted Z
        
      case "top": // Looking down at the top face (y = +offset)
        // Visual layout: x increases left-to-right, z increases top-to-bottom
        return [arrayZ, arrayX]; // row = Z, col = X
        
      case "bottom": // Looking up at the bottom face (y = -offset)
        // When looking from below, z appears flipped (front becomes back)
        // Visual layout: x increases left-to-right, -z increases top-to-bottom
        return [size - 1 - arrayZ, arrayX]; // row = inverted Z, col = X
        
      default:
        return [0, 0];
    }
  };

  // Helper function to determine which sticker on a piece shows on a given face
  const getStickerColorForFace = (piece: any, targetFace: CubeFace): string | null => {
    const [x, y, z] = piece.position;
    
    // Check if piece is on the target face boundary
    switch (targetFace) {
      case "front":
        if (Math.abs(z - offset) < 0.001) {
          return piece.stickers.find((s: Sticker) => s.face === "front")?.color || null;
        }
        break;
      case "back":
        if (Math.abs(z + offset) < 0.001) {
          return piece.stickers.find((s: Sticker) => s.face === "back")?.color || null;
        }
        break;
      case "left":
        if (Math.abs(x + offset) < 0.001) {
          return piece.stickers.find((s: Sticker) => s.face === "left")?.color || null;
        }
        break;
      case "right":
        if (Math.abs(x - offset) < 0.001) {
          return piece.stickers.find((s: Sticker) => s.face === "right")?.color || null;
        }
        break;
      case "top":
        if (Math.abs(y - offset) < 0.001) {
          return piece.stickers.find((s: Sticker) => s.face === "top")?.color || null;
        }
        break;
      case "bottom":
        if (Math.abs(y + offset) < 0.001) {
          return piece.stickers.find((s: Sticker) => s.face === "bottom")?.color || null;
        }
        break;
    }
    
    return null;
  };

  // Process all pieces and extract sticker colors for each face
  const allPieces = [...state.centers, ...state.edges, ...state.corners];
  
  for (const piece of allPieces) {
    // Check each face to see if this piece has a sticker showing on it
    const faces: CubeFace[] = ['front', 'back', 'left', 'right', 'top', 'bottom'];
    
    for (const face of faces) {
      const color = getStickerColorForFace(piece, face);
      if (color) {
        const [row, col] = positionToFaceCoords(piece.position, face);
        
        // Ensure coordinates are within bounds
        if (row >= 0 && row < size && col >= 0 && col < size) {
          faceMatrices[face][row][col] = color;
        }
      }
    }
  }

  return faceMatrices;
}

/**
 * Applies a move directly to face matrices without modifying cube state
 * This is optimized for solver algorithms that work with the simplified matrix representation
 * Supports all move types: face moves, layer moves, and double moves for any cube size
 * 
 * @param faceMatrices - Current face matrices state
 * @param moveNotation - Move notation string (e.g., "R", "U'", "F2", "2R", "3L'", "4U2")
 * @returns New face matrices with the move applied
 */
export function applyMoveToFaceMatrices(
  faceMatrices: Record<CubeFace, string[][]>, 
  moveNotation: string
): Record<CubeFace, string[][]> {
  // Parse the move notation
  const match = moveNotation.trim().toUpperCase().match(/^(\d*)([RLUDFB])(2)?(')?$/);
  if (!match) throw new Error(`Invalid move notation: ${moveNotation}`);
  
  const [, layerStr, faceChar, doubleStr, primeStr] = match;
  const layer = layerStr ? parseInt(layerStr, 10) : 1;
  const isPrime = Boolean(primeStr);
  const isDouble = Boolean(doubleStr);
  
  // Convert face character to CubeFace
  let face: CubeFace;
  switch (faceChar) {
    case "R": face = "right"; break;
    case "L": face = "left"; break;
    case "U": face = "top"; break;
    case "D": face = "bottom"; break;
    case "F": face = "front"; break;
    case "B": face = "back"; break;
    default: throw new Error(`Invalid face: ${faceChar}`);
  }
  
  const size = faceMatrices.front.length; // Get cube size from matrix dimensions
  
  // Validate layer for cube size
  if (layer < 1 || layer > size) {
    throw new Error(`Invalid layer ${layer} for ${size}x${size}x${size} cube`);
  }
  
  // Deep clone the matrices to avoid mutation
  const newMatrices: Record<CubeFace, string[][]> = {
    front: faceMatrices.front.map(row => [...row]),
    back: faceMatrices.back.map(row => [...row]),
    left: faceMatrices.left.map(row => [...row]),
    right: faceMatrices.right.map(row => [...row]),
    top: faceMatrices.top.map(row => [...row]),
    bottom: faceMatrices.bottom.map(row => [...row]),
  };
  
  // Helper function to rotate a face matrix 90 degrees clockwise
  const rotateFaceClockwise = (matrix: string[][]): string[][] => {
    const matrixSize = matrix.length;
    const rotated = Array(matrixSize).fill(null).map(() => Array(matrixSize).fill(""));
    for (let i = 0; i < matrixSize; i++) {
      for (let j = 0; j < matrixSize; j++) {
        rotated[j][matrixSize - 1 - i] = matrix[i][j];
      }
    }
    return rotated;
  };
  
  // Helper function to rotate a face matrix 90 degrees counter-clockwise
  const rotateFaceCounterClockwise = (matrix: string[][]): string[][] => {
    const matrixSize = matrix.length;
    const rotated = Array(matrixSize).fill(null).map(() => Array(matrixSize).fill(""));
    for (let i = 0; i < matrixSize; i++) {
      for (let j = 0; j < matrixSize; j++) {
        rotated[matrixSize - 1 - j][i] = matrix[i][j];
      }
    }
    return rotated;
  };
  
  // Helper function to get the layer index (0-based) from the layer number (1-based)
  const getLayerIndex = (layerNum: number, faceType: CubeFace): number => {
    // Layer numbering maps differently for each face based on how we view them:
    // - For most faces, layer 1 is the outer face (index 0)
    // - For opposite faces that are viewed from the "inside out", numbering is different
    switch (faceType) {
      case "right":
      case "bottom": 
      case "back":
        return size - layerNum; // Layer 1 = index (size-1), Layer 2 = index (size-2), etc.
      case "left":
      case "top":
      case "front":
        return layerNum - 1; // Layer 1 = index 0, Layer 2 = index 1, etc.
      default:
        return layerNum - 1;
    }
  };
  
  // Apply the move based on face and direction
  const applyFaceMove = (clockwise: boolean) => {
    switch (face) {
      case "right": // R moves
        // If this is layer 1 (outer face), rotate the face itself
        if (layer === 1) {
          newMatrices.right = clockwise 
            ? rotateFaceClockwise(newMatrices.right)
            : rotateFaceCounterClockwise(newMatrices.right);
        }
        
        // Get the column index for this layer
        const rightColIndex = getLayerIndex(layer, "right");
        
        // Cycle the adjacent edges: front→top, top→back, back→bottom, bottom→front
        if (clockwise) {
          // R: front right column → top right column → back left column (reversed) → bottom right column → front right column
          const temp = newMatrices.front.map(row => row[rightColIndex]); // Extract column
          
          // front → top
          for (let i = 0; i < size; i++) {
            newMatrices.front[i][rightColIndex] = newMatrices.bottom[i][rightColIndex];
          }
          
          // bottom → back (reversed)
          for (let i = 0; i < size; i++) {
            newMatrices.bottom[i][rightColIndex] = newMatrices.back[size - 1 - i][size - 1 - rightColIndex];
          }
          
          // back → top (reversed)
          for (let i = 0; i < size; i++) {
            newMatrices.back[i][size - 1 - rightColIndex] = newMatrices.top[size - 1 - i][rightColIndex];
          }
          
          // top → front
          for (let i = 0; i < size; i++) {
            newMatrices.top[i][rightColIndex] = temp[i];
          }
        } else {
          // R': reverse the cycle
          const temp = newMatrices.front.map(row => row[rightColIndex]);
          
          // front → top
          for (let i = 0; i < size; i++) {
            newMatrices.front[i][rightColIndex] = newMatrices.top[i][rightColIndex];
          }
          
          // top → back (reversed)
          for (let i = 0; i < size; i++) {
            newMatrices.top[i][rightColIndex] = newMatrices.back[size - 1 - i][size - 1 - rightColIndex];
          }
          
          // back → bottom (reversed)
          for (let i = 0; i < size; i++) {
            newMatrices.back[i][size - 1 - rightColIndex] = newMatrices.bottom[size - 1 - i][rightColIndex];
          }
          
          // bottom → front
          for (let i = 0; i < size; i++) {
            newMatrices.bottom[i][rightColIndex] = temp[i];
          }
        }
        break;
        
      case "left": // L moves
        if (layer === 1) {
          newMatrices.left = clockwise 
            ? rotateFaceClockwise(newMatrices.left)
            : rotateFaceCounterClockwise(newMatrices.left);
        }
        
        const leftColIndex = getLayerIndex(layer, "left");
        
        if (clockwise) {
          // L: front→bottom, bottom→back, back→top, top→front
          const temp = newMatrices.front.map(row => row[leftColIndex]);
          
          // front → top
          for (let i = 0; i < size; i++) {
            newMatrices.front[i][leftColIndex] = newMatrices.top[i][leftColIndex];
          }
          
          // top → back (reversed)
          for (let i = 0; i < size; i++) {
            newMatrices.top[i][leftColIndex] = newMatrices.back[size - 1 - i][size - 1 - leftColIndex];
          }
          
          // back → bottom (reversed)
          for (let i = 0; i < size; i++) {
            newMatrices.back[i][size - 1 - leftColIndex] = newMatrices.bottom[size - 1 - i][leftColIndex];
          }
          
          // bottom → front
          for (let i = 0; i < size; i++) {
            newMatrices.bottom[i][leftColIndex] = temp[i];
          }
        } else {
          const temp = newMatrices.front.map(row => row[leftColIndex]);
          
          // front → bottom
          for (let i = 0; i < size; i++) {
            newMatrices.front[i][leftColIndex] = newMatrices.bottom[i][leftColIndex];
          }
          
          // bottom → back (reversed)
          for (let i = 0; i < size; i++) {
            newMatrices.bottom[i][leftColIndex] = newMatrices.back[size - 1 - i][size - 1 - leftColIndex];
          }
          
          // back → top (reversed)
          for (let i = 0; i < size; i++) {
            newMatrices.back[i][size - 1 - leftColIndex] = newMatrices.top[size - 1 - i][leftColIndex];
          }
          
          // top → front
          for (let i = 0; i < size; i++) {
            newMatrices.top[i][leftColIndex] = temp[i];
          }
        }
        break;
        
      case "top": // U moves
        if (layer === 1) {
          newMatrices.top = clockwise 
            ? rotateFaceClockwise(newMatrices.top)
            : rotateFaceCounterClockwise(newMatrices.top);
        }
        
        const topRowIndex = getLayerIndex(layer, "top");
        
        if (clockwise) {
          // U: front→left, left→back, back→right, right→front
          const temp = [...newMatrices.front[topRowIndex]];
          
          newMatrices.front[topRowIndex] = [...newMatrices.right[topRowIndex]];
          newMatrices.right[topRowIndex] = [...newMatrices.back[topRowIndex]];
          newMatrices.back[topRowIndex] = [...newMatrices.left[topRowIndex]];
          newMatrices.left[topRowIndex] = temp;
        } else {
          const temp = [...newMatrices.front[topRowIndex]];
          
          newMatrices.front[topRowIndex] = [...newMatrices.left[topRowIndex]];
          newMatrices.left[topRowIndex] = [...newMatrices.back[topRowIndex]];
          newMatrices.back[topRowIndex] = [...newMatrices.right[topRowIndex]];
          newMatrices.right[topRowIndex] = temp;
        }
        break;
        
      case "bottom": // D moves
        if (layer === 1) {
          newMatrices.bottom = clockwise 
            ? rotateFaceClockwise(newMatrices.bottom)
            : rotateFaceCounterClockwise(newMatrices.bottom);
        }
        
        const bottomRowIndex = getLayerIndex(layer, "bottom");
        
        if (clockwise) {
          // D: front→right, right→back, back→left, left→front
          const temp = [...newMatrices.front[bottomRowIndex]];
          
          newMatrices.front[bottomRowIndex] = [...newMatrices.left[bottomRowIndex]];
          newMatrices.left[bottomRowIndex] = [...newMatrices.back[bottomRowIndex]];
          newMatrices.back[bottomRowIndex] = [...newMatrices.right[bottomRowIndex]];
          newMatrices.right[bottomRowIndex] = temp;
        } else {
          const temp = [...newMatrices.front[bottomRowIndex]];
          
          newMatrices.front[bottomRowIndex] = [...newMatrices.right[bottomRowIndex]];
          newMatrices.right[bottomRowIndex] = [...newMatrices.back[bottomRowIndex]];
          newMatrices.back[bottomRowIndex] = [...newMatrices.left[bottomRowIndex]];
          newMatrices.left[bottomRowIndex] = temp;
        }
        break;
        
      case "front": // F moves
        if (layer === 1) {
          newMatrices.front = clockwise 
            ? rotateFaceClockwise(newMatrices.front)
            : rotateFaceCounterClockwise(newMatrices.front);
        }
        
        const frontSliceIndex = getLayerIndex(layer, "front");
        
        if (clockwise) {
          // F clockwise: top bottom row → right left column, right left column → bottom top row (reversed), 
          //              bottom top row → left right column (reversed), left right column → top bottom row
          const temp = [...newMatrices.top[size - 1 - frontSliceIndex]]; // bottom row of top face
          
          // top bottom row → right left column
          for (let i = 0; i < size; i++) {
            newMatrices.top[size - 1 - frontSliceIndex][i] = newMatrices.left[size - 1 - i][size - 1 - frontSliceIndex];
          }
          
          // left right column → bottom top row
          for (let i = 0; i < size; i++) {
            newMatrices.left[i][size - 1 - frontSliceIndex] = newMatrices.bottom[frontSliceIndex][i];
          }
          
          // bottom top row → right left column (reversed)
          for (let i = 0; i < size; i++) {
            newMatrices.bottom[frontSliceIndex][i] = newMatrices.right[size - 1 - i][frontSliceIndex];
          }
          
          // right left column → top bottom row
          for (let i = 0; i < size; i++) {
            newMatrices.right[i][frontSliceIndex] = temp[i];
          }
        } else {
          // F' counter-clockwise: reverse the cycle
          const temp = [...newMatrices.top[size - 1 - frontSliceIndex]];
          
          // top bottom row → right left column
          for (let i = 0; i < size; i++) {
            newMatrices.top[size - 1 - frontSliceIndex][i] = newMatrices.right[i][frontSliceIndex];
          }
          
          // right left column → bottom top row (reversed)
          for (let i = 0; i < size; i++) {
            newMatrices.right[i][frontSliceIndex] = newMatrices.bottom[frontSliceIndex][size - 1 - i];
          }
          
          // bottom top row → left right column
          for (let i = 0; i < size; i++) {
            newMatrices.bottom[frontSliceIndex][i] = newMatrices.left[i][size - 1 - frontSliceIndex];
          }
          
          // left right column → top bottom row (reversed)
          for (let i = 0; i < size; i++) {
            newMatrices.left[i][size - 1 - frontSliceIndex] = temp[size - 1 - i];
          }
        }
        break;
        
      case "back": // B moves
        if (layer === 1) {
          newMatrices.back = clockwise 
            ? rotateFaceClockwise(newMatrices.back)
            : rotateFaceCounterClockwise(newMatrices.back);
        }
        
        // For B moves, we need to use the correct layer indexing
        // Layer 1 should affect: top[0], bottom[2], left col 0, right col 2
        const backTopRowIndex = layer - 1;                    // Layer 1 → top[0]
        const backBottomRowIndex = size - layer;              // Layer 1 → bottom[2] for 3x3
        const backLeftColIndex = layer - 1;                   // Layer 1 → left col 0  
        const backRightColIndex = size - layer;               // Layer 1 → right col 2 for 3x3
        
        if (clockwise) {
          // B clockwise cycle: Right col → Top row → Left col → Bottom row → Right col
          const tempTopRow = [...newMatrices.top[backTopRowIndex]];
          const tempRightCol = newMatrices.right.map(row => row[backRightColIndex]);
          const tempBottomRow = [...newMatrices.bottom[backBottomRowIndex]];
          const tempLeftCol = newMatrices.left.map(row => row[backLeftColIndex]);
          
          // Right col → Top row (no reversal)
          for (let i = 0; i < size; i++) {
            newMatrices.top[backTopRowIndex][i] = tempRightCol[i];
          }
          
          // Bottom row → Right col (REVERSED)
          for (let i = 0; i < size; i++) {
            newMatrices.right[i][backRightColIndex] = tempBottomRow[size - 1 - i];
          }
          
          // Left col → Bottom row (no reversal)
          for (let i = 0; i < size; i++) {
            newMatrices.bottom[backBottomRowIndex][i] = tempLeftCol[i];
          }
          
          // Top row → Left col (REVERSED)
          for (let i = 0; i < size; i++) {
            newMatrices.left[i][backLeftColIndex] = tempTopRow[size - 1 - i];
          }
        } else {
          // B' counter-clockwise: reverse the cycle
          const tempTopRow = [...newMatrices.top[backTopRowIndex]];
          const tempRightCol = newMatrices.right.map(row => row[backRightColIndex]);
          const tempBottomRow = [...newMatrices.bottom[backBottomRowIndex]];
          const tempLeftCol = newMatrices.left.map(row => row[backLeftColIndex]);
          
          // Top row → Right col (REVERSED)
          for (let i = 0; i < size; i++) {
            newMatrices.right[i][backRightColIndex] = tempTopRow[size - 1 - i];
          }
          
          // Right col → Bottom row (no reversal)
          for (let i = 0; i < size; i++) {
            newMatrices.bottom[backBottomRowIndex][i] = tempRightCol[i];
          }
          
          // Bottom row → Left col (REVERSED)
          for (let i = 0; i < size; i++) {
            newMatrices.left[i][backLeftColIndex] = tempBottomRow[size - 1 - i];
          }
          
          // Left col → Top row (no reversal)
          for (let i = 0; i < size; i++) {
            newMatrices.top[backTopRowIndex][i] = tempLeftCol[i];
          }
        }
        break;
    }
  };
  
  // Apply the move(s)
  if (isDouble) {
    // Apply the move twice for double moves (e.g., R2, 2U2)
    applyFaceMove(true);
    applyFaceMove(true);
  } else {
    // Apply once, direction based on prime notation
    applyFaceMove(!isPrime);
  }
  
  return newMatrices;
}

/**
 * Applies a sequence of moves to face matrices
 * 
 * @param faceMatrices - Starting face matrices
 * @param moveSequence - Array of move notations or space-separated string
 * @returns Final face matrices after applying all moves
 */
export function applyMovesToFaceMatrices(
  faceMatrices: Record<CubeFace, string[][]>,
  moveSequence: string[] | string
): Record<CubeFace, string[][]> {
  // Convert string to array if needed
  const moves = typeof moveSequence === 'string' 
    ? moveSequence.trim().split(/\s+/).filter(move => move.length > 0)
    : moveSequence;
  
  return moves.reduce((currentMatrices, move) => {
    return applyMoveToFaceMatrices(currentMatrices, move);
  }, faceMatrices);
}
