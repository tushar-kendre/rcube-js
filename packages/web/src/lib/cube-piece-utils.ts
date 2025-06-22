import { 
  CubeState, 
  CenterPiece, 
  EdgePiece, 
  CornerPiece, 
  Position3D, 
  Sticker, 
  CubeFace, 
  DEFAULT_CUBE_COLORS 
} from '@/types/cube-pieces'

/**
 * Creates a solved cube state with pieces in their correct positions
 */
export function createSolvedCube(size: number = 3): CubeState {
  const centers: CenterPiece[] = []
  const edges: EdgePiece[] = []
  const corners: CornerPiece[] = []
  
  const offset = (size - 1) / 2
  
  // Generate all possible positions
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        const position: Position3D = [x - offset, y - offset, z - offset]
        const [px, py, pz] = position
        
        // Determine which faces this position touches
        const stickers: Sticker[] = []
        
        if (px === -offset) stickers.push({ face: 'left', color: DEFAULT_CUBE_COLORS.left })
        if (px === offset) stickers.push({ face: 'right', color: DEFAULT_CUBE_COLORS.right })
        if (py === -offset) stickers.push({ face: 'bottom', color: DEFAULT_CUBE_COLORS.bottom })
        if (py === offset) stickers.push({ face: 'top', color: DEFAULT_CUBE_COLORS.top })
        if (pz === -offset) stickers.push({ face: 'back', color: DEFAULT_CUBE_COLORS.back })
        if (pz === offset) stickers.push({ face: 'front', color: DEFAULT_CUBE_COLORS.front })
        
        // Skip internal pieces (no stickers)
        if (stickers.length === 0) continue
        
        const pieceId = `${x}-${y}-${z}`
        
        // Create appropriate piece type based on number of stickers
        if (stickers.length === 1) {
          centers.push({
            id: pieceId,
            type: 'center',
            position,
            originalPosition: [...position],
            stickers: [stickers[0]]
          })
        } else if (stickers.length === 2) {
          edges.push({
            id: pieceId,
            type: 'edge',
            position,
            originalPosition: [...position],
            stickers: [stickers[0], stickers[1]]
          })
        } else if (stickers.length === 3) {
          corners.push({
            id: pieceId,
            type: 'corner',
            position,
            originalPosition: [...position],
            stickers: [stickers[0], stickers[1], stickers[2]]
          })
        }
      }
    }
  }
  
  return { size, centers, edges, corners }
}

/**
 * Scrambles the cube by moving pieces to random positions
 * (This is a simplified scramble - real scrambling should use valid moves)
 */
export function scrambleCube(state: CubeState): CubeState {
  const { edges, corners } = state
  
  // Scramble edges
  const scrambledEdges = [...edges]
  for (let i = scrambledEdges.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[scrambledEdges[i].position, scrambledEdges[j].position] = 
     [scrambledEdges[j].position, scrambledEdges[i].position]
  }
  
  // Scramble corners  
  const scrambledCorners = [...corners]
  for (let i = scrambledCorners.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[scrambledCorners[i].position, scrambledCorners[j].position] = 
     [scrambledCorners[j].position, scrambledCorners[i].position]
  }
  
  return {
    ...state,
    edges: scrambledEdges,
    corners: scrambledCorners
  }
}

/**
 * Checks if a piece is in a specific face layer
 */
export function isPieceInFaceLayer(position: Position3D, face: CubeFace, size: number): boolean {
  const [x, y, z] = position
  const offset = (size - 1) / 2
  
  switch (face) {
    case 'right': return Math.abs(x - offset) < 0.001
    case 'left': return Math.abs(x + offset) < 0.001
    case 'top': return Math.abs(y - offset) < 0.001
    case 'bottom': return Math.abs(y + offset) < 0.001
    case 'front': return Math.abs(z - offset) < 0.001
    case 'back': return Math.abs(z + offset) < 0.001
    default: return false
  }
}

/**
 * Gets all pieces that are in a specific face layer
 */
export function getPiecesInFaceLayer(state: CubeState, face: CubeFace) {
  const allPieces = [...state.centers, ...state.edges, ...state.corners]
  return allPieces.filter(piece => isPieceInFaceLayer(piece.position, face, state.size))
}

/**
 * Checks if a piece is in a specific layer for a given face
 */
export function isPieceInLayer(
  position: Position3D,
  face: CubeFace,
  size: number,
  layer: number
): boolean {
  const [x, y, z] = position
  const offset = (size - 1) / 2
  const depth = offset - (layer - 1)

  switch (face) {
    case 'right': return Math.abs(x - depth) < 0.001
    case 'left': return Math.abs(x + depth) < 0.001
    case 'top': return Math.abs(y - depth) < 0.001
    case 'bottom': return Math.abs(y + depth) < 0.001
    case 'front': return Math.abs(z - depth) < 0.001
    case 'back': return Math.abs(z + depth) < 0.001
    default: return false
  }
}

/**
 * Gets all pieces that are in a specific layer for a face
 */
export function getPiecesInLayer(state: CubeState, face: CubeFace, layer: number) {
  const allPieces = [...state.centers, ...state.edges, ...state.corners]
  return allPieces.filter(piece => isPieceInLayer(piece.position, face, state.size, layer))
}

/**
 * Rotates a position around a face axis
 */
export function rotatePosition(position: Position3D, face: CubeFace, clockwise: boolean): Position3D {
  const [x, y, z] = position
  
  switch (face) {
    case 'right':
    case 'left':
      // Rotate around X-axis
      return clockwise !== (face === 'left') 
        ? [x, -z, y] 
        : [x, z, -y]
        
    case 'top':
    case 'bottom':
      // Rotate around Y-axis  
      return clockwise !== (face === 'bottom')
        ? [z, y, -x]
        : [-z, y, x]
        
    case 'front': // F moves - rotation around Z-axis
      if (clockwise) {
        // front clockwise: rotate (x,y) -> (y, -x)
        return [y, -x, z]
      } else {
        // front counterclockwise: rotate (x,y) -> (-y, x)
        return [-y, x, z]
      }

    case 'back': // B moves - rotation around Z-axis
      if (clockwise) {
        // back clockwise: rotate (x,y) -> (-y, x)
        return [-y, x, z]
      } else {
        // back counterclockwise: rotate (x,y) -> (y, -x)
        return [y, -x, z]
      }
        
    default:
      return position
  }
}

/**
 * Rotates a sticker face when a piece is rotated
 */
export function rotateStickerFace(face: CubeFace, rotationFace: CubeFace, clockwise: boolean): CubeFace {
  // When a piece rotates, its stickers need to maintain their relative positions
  // This mapping shows how sticker faces change when pieces rotate around different axes
  
  switch (rotationFace) {
    case 'right': // R moves - rotation around X-axis
      if (clockwise) {
        switch (face) {
          case 'front': return 'bottom'
          case 'bottom': return 'back'
          case 'back': return 'top'
          case 'top': return 'front'
          case 'right': return 'right' // stays same
          case 'left': return 'left'   // stays same
          default: return face
        }
      } else { // R'
        switch (face) {
          case 'front': return 'top'
          case 'top': return 'back'
          case 'back': return 'bottom'
          case 'bottom': return 'front'
          case 'right': return 'right'
          case 'left': return 'left'
          default: return face
        }
      }
      
    case 'left': // L moves - rotation around X-axis (opposite direction)
      if (clockwise) {
        switch (face) {
          case 'front': return 'top'
          case 'top': return 'back'
          case 'back': return 'bottom'
          case 'bottom': return 'front'
          case 'right': return 'right'
          case 'left': return 'left'
          default: return face
        }
      } else { // L'
        switch (face) {
          case 'front': return 'bottom'
          case 'bottom': return 'back'
          case 'back': return 'top'
          case 'top': return 'front'
          case 'right': return 'right'
          case 'left': return 'left'
          default: return face
        }
      }
      
    case 'top': // U moves - rotation around Y-axis
      if (clockwise) {
        switch (face) {
          case 'front': return 'right'
          case 'right': return 'back'
          case 'back': return 'left'
          case 'left': return 'front'
          case 'top': return 'top'
          case 'bottom': return 'bottom'
          default: return face
        }
      } else { // U'
        switch (face) {
          case 'front': return 'left'
          case 'left': return 'back'
          case 'back': return 'right'
          case 'right': return 'front'
          case 'top': return 'top'
          case 'bottom': return 'bottom'
          default: return face
        }
      }
      
    case 'bottom': // D moves - rotation around Y-axis (opposite direction)
      if (clockwise) {
        switch (face) {
          case 'front': return 'left'
          case 'left': return 'back'
          case 'back': return 'right'
          case 'right': return 'front'
          case 'top': return 'top'
          case 'bottom': return 'bottom'
          default: return face
        }
      } else { // D'
        switch (face) {
          case 'front': return 'right'
          case 'right': return 'back'
          case 'back': return 'left'
          case 'left': return 'front'
          case 'top': return 'top'
          case 'bottom': return 'bottom'
          default: return face
        }
      }
      
    case 'front': // F moves - rotation around Z-axis
      if (clockwise) {
        switch (face) {
          case 'top': return 'right'
          case 'right': return 'bottom'
          case 'bottom': return 'left'
          case 'left': return 'top'
          case 'front': return 'front'
          case 'back': return 'back'
          default: return face
        }
      } else { // F'
        switch (face) {
          case 'top': return 'left'
          case 'left': return 'bottom'
          case 'bottom': return 'right'
          case 'right': return 'top'
          case 'front': return 'front'
          case 'back': return 'back'
          default: return face
        }
      }
      
    case 'back': // B moves - rotation around Z-axis (opposite direction)
      if (clockwise) {
        switch (face) {
          case 'top': return 'left'
          case 'left': return 'bottom'
          case 'bottom': return 'right'
          case 'right': return 'top'
          case 'front': return 'front'
          case 'back': return 'back'
          default: return face
        }
      } else { // B'
        switch (face) {
          case 'top': return 'right'
          case 'right': return 'bottom'
          case 'bottom': return 'left'
          case 'left': return 'top'
          case 'front': return 'front'
          case 'back': return 'back'
          default: return face
        }
      }
      
    default:
      // Fallback for invalid rotation face
      return face
  }
}

/**
 * Checks if the cube is in solved state
 */
export function isSolved(state: CubeState): boolean {
  const allPieces = [...state.centers, ...state.edges, ...state.corners]
  return allPieces.every(piece => 
    piece.position[0] === piece.originalPosition[0] &&
    piece.position[1] === piece.originalPosition[1] &&
    piece.position[2] === piece.originalPosition[2]
  )
}

/**
 * Creates a cube state with one F move already applied (hardcoded positions)
 * This helps test if the black sticker issue is in the rendering or move logic
 */
export function createCubeWithFMove(size: number = 3): CubeState {
  const centers: CenterPiece[] = []
  const edges: EdgePiece[] = []
  const corners: CornerPiece[] = []
  
  const offset = (size - 1) / 2
  
  // Generate all positions and apply F move logic
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        const position: Position3D = [x - offset, y - offset, z - offset]
        const [px, py, pz] = position
        
        // Determine stickers for this position after F move
        const stickers: Sticker[] = []
        
        // If this is on the front face (pz === offset), apply F move rotation logic
        if (pz === offset) {
          // Front face pieces have rotated clockwise
          // For front face, we need to rotate the sticker colors according to F move
          
          // Left side becomes top, top becomes right, right becomes bottom, bottom becomes left
          if (px === -offset) stickers.push({ face: 'left', color: DEFAULT_CUBE_COLORS.bottom }) // was bottom
          if (px === offset) stickers.push({ face: 'right', color: DEFAULT_CUBE_COLORS.top }) // was top
          if (py === -offset) stickers.push({ face: 'bottom', color: DEFAULT_CUBE_COLORS.right }) // was right
          if (py === offset) stickers.push({ face: 'top', color: DEFAULT_CUBE_COLORS.left }) // was left
          
          // Front face itself doesn't change color
          stickers.push({ face: 'front', color: DEFAULT_CUBE_COLORS.front })
        } else {
          // Non-front face pieces remain the same
          if (px === -offset) stickers.push({ face: 'left', color: DEFAULT_CUBE_COLORS.left })
          if (px === offset) stickers.push({ face: 'right', color: DEFAULT_CUBE_COLORS.right })
          if (py === -offset) stickers.push({ face: 'bottom', color: DEFAULT_CUBE_COLORS.bottom })
          if (py === offset) stickers.push({ face: 'top', color: DEFAULT_CUBE_COLORS.top })
          if (pz === -offset) stickers.push({ face: 'back', color: DEFAULT_CUBE_COLORS.back })
        }
        
        // Skip internal pieces
        if (stickers.length === 0) continue
        
        const pieceId = `${x}-${y}-${z}`
        
        // Create appropriate piece type
        if (stickers.length === 1) {
          centers.push({
            id: pieceId,
            type: 'center',
            position,
            originalPosition: [...position],
            stickers: stickers as [Sticker]
          })
        } else if (stickers.length === 2) {
          edges.push({
            id: pieceId,
            type: 'edge',
            position,
            originalPosition: [...position],
            stickers: stickers as [Sticker, Sticker]
          })
        } else if (stickers.length === 3) {
          corners.push({
            id: pieceId,
            type: 'corner',
            position,
            originalPosition: [...position],
            stickers: stickers as [Sticker, Sticker, Sticker]
          })
        }
      }
    }
  }
  
  return {
    size,
    centers,
    edges,
    corners
  }
}


