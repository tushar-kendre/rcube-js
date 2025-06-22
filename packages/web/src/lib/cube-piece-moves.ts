import { CubeState, Move, MoveNotation, CubeFace, Sticker, CenterPiece, EdgePiece, CornerPiece } from '@/types/cube-pieces'
import { getPiecesInFaceLayer, getPiecesInLayer, rotatePosition, rotateStickerFace } from './cube-piece-utils'
 
/**
 * Parses move notation into a Move object
 */
export function parseMove(notation: MoveNotation): Move {
  // Matches optional layer prefix, face letter, optional '2' for double-turn, optional prime
  const match = notation.trim().toUpperCase().match(/^(\d*)([RLUDFB])(2)?(')?$/)
  if (!match) throw new Error(`Invalid move notation: ${notation}`)
  const [, layerStr, faceChar, doubleStr, primeStr] = match
  const layer = layerStr ? Math.max(1, Math.min(parseInt(layerStr, 10), Infinity)) : 1
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
  const isDouble = Boolean(doubleStr)
  const prime = Boolean(primeStr)
  let clockwise = !prime
  // Flip U/U' semantics per convention
  if (face === 'top' || face === 'bottom') {
    clockwise = !clockwise
  }
  const magnitude = isDouble ? Math.PI : Math.PI / 2
  return { face, layer, clockwise, angle: clockwise ? magnitude : -magnitude }
}
 
/**
 * Applies a move to the cube state by rotating pieces in the affected face layer
 */
export function applyMove(state: CubeState, move: Move): CubeState {
  // Handle 180° as two successive quarter-turns
  if (Math.abs(move.angle) === Math.PI) {
    const singleAngle = move.angle > 0 ? Math.PI/2 : -Math.PI/2
    const single: Move = { face: move.face, layer: move.layer, clockwise: move.angle > 0, angle: singleAngle }
    const intermediate = applyMove(state, single)
    return applyMove(intermediate, single)
  }
   
  // Get all pieces in the specified layer
  const layerPieces = move.layer === 1
    ? getPiecesInFaceLayer(state, move.face)
    : getPiecesInLayer(state, move.face, move.layer)
  
  // Create new state with deep copies including stickers
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
    const newPosition = rotatePosition(piece.position, move.face, move.clockwise)
    
    // Find the piece in the new state and update its position and stickers
    let targetPiece
    if (piece.type === 'center') {
      targetPiece = newState.centers.find(p => p.id === piece.id)
    } else if (piece.type === 'edge') {
      targetPiece = newState.edges.find(p => p.id === piece.id)
    } else {
      targetPiece = newState.corners.find(p => p.id === piece.id)
    }
    
    if (targetPiece) {
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
 * Applies a sequence of moves to the cube state
 */
export function applyMoves(state: CubeState, moves: MoveNotation[]): CubeState {
  return moves.reduce((currentState, moveNotation) => {
    const move = parseMove(moveNotation)
    return applyMove(currentState, move)
  }, state)
}

/**
 * Generates a scramble sequence
 */
export function generateScramble(length: number = 20): MoveNotation[] {
  const moves: MoveNotation[] = ['R', "R'", 'L', "L'", 'U', "U'", 'D', "D'", 'F', "F'", 'B', "B'"]
  const scramble: MoveNotation[] = []
  
  for (let i = 0; i < length; i++) {
    let move: MoveNotation
    do {
      move = moves[Math.floor(Math.random() * moves.length)]
    } while (
      // Avoid consecutive moves on the same face
      scramble.length > 0 && 
      move.charAt(0) === scramble[scramble.length - 1].charAt(0)
    )
    scramble.push(move)
  }
  
  return scramble
}
