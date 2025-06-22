export type CubeFace = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom'
export type CubeColor = 'white' | 'yellow' | 'red' | 'orange' | 'blue' | 'green'
export type PieceType = 'center' | 'edge' | 'corner'

// 3D position in cube space
export type Position3D = [number, number, number]

// Sticker represents a colored face on a piece
export interface Sticker {
  face: CubeFace
  color: CubeColor
}

// Base piece interface
export interface CubePiece {
  id: string
  type: PieceType
  position: Position3D
  stickers: Sticker[]
  // Original position for solved state reference
  originalPosition: Position3D
}

// Specialized piece types
export interface CenterPiece extends CubePiece {
  type: 'center'
  stickers: [Sticker] // Centers have exactly 1 sticker
}

export interface EdgePiece extends CubePiece {
  type: 'edge'
  stickers: [Sticker, Sticker] // Edges have exactly 2 stickers
}

export interface CornerPiece extends CubePiece {
  type: 'corner'
  stickers: [Sticker, Sticker, Sticker] // Corners have exactly 3 stickers
}

// Cube state - just positions of pieces
export interface CubeState {
  size: number
  centers: CenterPiece[]
  edges: EdgePiece[]
  corners: CornerPiece[]
}

/**
 * A move notation string, e.g. 'R', 'R2', '2R', "3U'", etc.
 * Parsed dynamically based on cube size.
 */
export type MoveNotation = string

/**
 * Parsed move details.
 * 'layer' is 1 for outermost, 2 for next inner, etc.
 */
export interface Move {
  face: CubeFace         // Face or axis of rotation
  layer: number          // Depth layer: 1 = outer face, etc.
  clockwise: boolean     // Rotation direction
  angle: number          // Signed angle in radians
}

export interface AnimationState {
  isAnimating: boolean
  currentMove: Move | null
  currentAngle: number
  targetAngle: number
  progress: number
}

// Default colors for each face
export const DEFAULT_CUBE_COLORS: Record<CubeFace, CubeColor> = {
  front: 'red',
  back: 'orange',
  left: 'green',
  right: 'blue',
  top: 'white',
  bottom: 'yellow'
}

export const COLOR_MAP: Record<CubeColor, string> = {
  white: '#ffffff',
  yellow: '#ffff00',
  red: '#ff0000',
  orange: '#ff8800',
  blue: '#0000ff',
  green: '#00ff00'
}
