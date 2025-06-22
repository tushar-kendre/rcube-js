import { CenterPiece, CornerPiece, CubeFace, CubeState, EdgePiece, Move, MoveNotation, Sticker } from '@/types/cube-pieces'
import { getPiecesInFaceLayer, getPiecesInLayer, rotatePosition, rotateStickerFace } from './cube-piece-utils'
 
/**
 * Parses move notation string into a structured Move object
 * 
 * Supports standard cube notation:
 * - Face letters: R, L, U, D, F, B (right, left, up, down, front, back)
 * - Modifiers: ' (prime/counterclockwise), 2 (double turn)
 * - Layer notation: 2R, 3U, etc. (for larger cubes)
 * 
 * @param notation - Move notation string (e.g., "R", "U'", "F2", "2R")
 * @returns Parsed Move object with face, layer, direction, and angle
 * @throws Error if notation is invalid
 */
export function parseMove(notation: MoveNotation): Move {
  // Regex matches: optional layer number, face letter, optional '2', optional prime
  const match = notation.trim().toUpperCase().match(/^(\d*)([RLUDFB])(2)?(')?$/)
  if (!match) throw new Error(`Invalid move notation: ${notation}`)
  
  const [, layerStr, faceChar, doubleStr, primeStr] = match
  
  // Parse layer number (default to 1 for face layer)
  const layer = layerStr ? Math.max(1, Math.min(parseInt(layerStr, 10), Infinity)) : 1
  
  // Convert face character to CubeFace enum
  let face: CubeFace
  switch (faceChar) {
    case 'R': face = 'right'; break
    case 'L': face = 'left'; break
    case 'U': face = 'top'; break
    case 'D': face = 'bottom'; break
    case 'F': face = 'front'; break
    case 'B': face = 'back'; break
    default: throw new Error(`Invalid move notation: ${notation}`)
  }
  
  // Parse modifiers
  const isDouble = Boolean(doubleStr)
  const prime = Boolean(primeStr)
  let clockwise = !prime
  
  // Apply special semantics for top and bottom faces (inverted rotation direction)
  if (face === 'top' || face === 'bottom') {
    clockwise = !clockwise
  }
  
  // Calculate rotation angle
  const magnitude = isDouble ? Math.PI : Math.PI / 2
  return { face, layer, clockwise, angle: clockwise ? magnitude : -magnitude }
}
 
/**
 * Applies a move to the cube state by rotating pieces in the affected face layer
 * 
 * This function handles the core logic of cube manipulation:
 * - Identifies pieces in the rotating layer
 * - Rotates their positions around the face axis
 * - Updates sticker orientations to match new positions
 * - Handles double moves (180°) by applying two quarter turns
 * 
 * @param state - Current cube state
 * @param move - The move to apply (face, layer, direction, angle)
 * @returns New cube state with the move applied
 */
export function applyMove(state: CubeState, move: Move): CubeState {
  // Handle 180° moves as two successive quarter-turns for accuracy
  if (Math.abs(move.angle) === Math.PI) {
    const singleAngle = move.angle > 0 ? Math.PI/2 : -Math.PI/2
    const single: Move = { face: move.face, layer: move.layer, clockwise: move.angle > 0, angle: singleAngle }
    const intermediate = applyMove(state, single)
    return applyMove(intermediate, single)
  }
   
  // Get all pieces in the specified layer that will be affected by this move
  const layerPieces = move.layer === 1
    ? getPiecesInFaceLayer(state, move.face)
    : getPiecesInLayer(state, move.face, move.layer)
  
  // Create new state with deep copies of all pieces including stickers
  const newState: CubeState = {
    size: state.size,
    centers: state.centers.map(piece => ({ 
      ...piece, 
      position: [...piece.position],
      stickers: piece.stickers.map(sticker => ({ ...sticker })) as [Sticker]
    })),
    edges: state.edges.map(piece => ({ 
      ...piece, 
      position: [...piece.position],
      stickers: piece.stickers.map(sticker => ({ ...sticker })) as [Sticker, Sticker]
    })),
    corners: state.corners.map(piece => ({ 
      ...piece, 
      position: [...piece.position],
      stickers: piece.stickers.map(sticker => ({ ...sticker })) as [Sticker, Sticker, Sticker]
    }))
  }
  
  // Update positions and sticker orientations of affected pieces
  layerPieces.forEach(piece => {
    // Calculate new position after rotation
    const newPosition = rotatePosition(piece.position, move.face, move.clockwise)
    
    // Find the corresponding piece in the new state and update it
    let targetPiece
    if (piece.type === 'center') {
      targetPiece = newState.centers.find(p => p.id === piece.id)
    } else if (piece.type === 'edge') {
      targetPiece = newState.edges.find(p => p.id === piece.id)
    } else {
      targetPiece = newState.corners.find(p => p.id === piece.id)
    }
    
    if (targetPiece) {
      // Update the piece position
      targetPiece.position = newPosition
      
      // Rotate the stickers to match the new orientation
      const rotatedStickers = targetPiece.stickers.map(sticker => {
        const newFace = rotateStickerFace(sticker.face, move.face, move.clockwise)
        
        return {
          ...sticker,
          face: newFace
        }
      })
      
      // Safely assign rotated stickers with proper type handling
      if (piece.type === 'center' && rotatedStickers.length === 1) {
        (targetPiece as CenterPiece).stickers = [rotatedStickers[0]]
      } else if (piece.type === 'edge' && rotatedStickers.length === 2) {
        (targetPiece as EdgePiece).stickers = [rotatedStickers[0], rotatedStickers[1]]
      } else if (piece.type === 'corner' && rotatedStickers.length === 3) {
        (targetPiece as CornerPiece).stickers = [rotatedStickers[0], rotatedStickers[1], rotatedStickers[2]]
      }
    }
  })
  
  return newState
}

/**
 * Applies a sequence of moves to the cube state sequentially
 * 
 * @param state - Starting cube state
 * @param moves - Array of move notations to apply in order
 * @returns Final cube state after all moves are applied
 */
export function applyMoves(state: CubeState, moves: MoveNotation[]): CubeState {
  return moves.reduce((currentState, moveNotation) => {
    const move = parseMove(moveNotation)
    return applyMove(currentState, move)
  }, state)
}

/**
 * Generates a random scramble sequence for the cube
 * 
 * Creates a sequence of random valid moves while avoiding
 * consecutive moves on the same face to ensure good mixing.
 * 
 * @param length - Number of moves in the scramble (default: 20)
 * @returns Array of move notations representing the scramble
 */
export function generateScramble(length: number = 20): MoveNotation[] {
  const moves: MoveNotation[] = ['R', "R'", 'L', "L'", 'U', "U'", 'D', "D'", 'F', "F'", 'B', "B'"]
  const scramble: MoveNotation[] = []
  
  for (let i = 0; i < length; i++) {
    let move: MoveNotation
    do {
      // Select a random move from available moves
      move = moves[Math.floor(Math.random() * moves.length)]
    } while (
      // Avoid consecutive moves on the same face for better scrambling
      scramble.length > 0 && 
      move.charAt(0) === scramble[scramble.length - 1].charAt(0)
    )
    scramble.push(move)
  }
  
  return scramble
}
