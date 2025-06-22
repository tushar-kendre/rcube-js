// Core cube face identifiers
export type CubeFace = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom'

// Standard Rubik's cube colors
export type CubeColor = 'white' | 'yellow' | 'red' | 'orange' | 'blue' | 'green'

// Types of cube pieces based on number of visible faces
export type PieceType = 'center' | 'edge' | 'corner'

// 3D position coordinates in cube space (x, y, z)
export type Position3D = [number, number, number]

/**
 * Represents a colored sticker on a cube piece face
 */
export interface Sticker {
  /** Which face of the cube this sticker is on */
  face: CubeFace
  /** The color of this sticker */
  color: CubeColor
}

/**
 * Base interface for all cube pieces
 */
export interface CubePiece {
  /** Unique identifier for this piece */
  id: string
  /** Type of piece (center, edge, or corner) */
  type: PieceType
  /** Current 3D position in cube space */
  position: Position3D
  /** Array of colored stickers on visible faces */
  stickers: Sticker[]
  /** Original position in solved state for reference */
  originalPosition: Position3D
}

/**
 * Center piece - has one visible face
 */
export interface CenterPiece extends CubePiece {
  type: 'center'
  stickers: [Sticker] // Centers have exactly 1 sticker
}

/**
 * Edge piece - has two visible faces
 */
export interface EdgePiece extends CubePiece {
  type: 'edge'
  stickers: [Sticker, Sticker] // Edges have exactly 2 stickers
}

/**
 * Corner piece - has three visible faces
 */
export interface CornerPiece extends CubePiece {
  type: 'corner'
  stickers: [Sticker, Sticker, Sticker] // Corners have exactly 3 stickers
}

/**
 * Complete state of the cube containing all pieces
 */
export interface CubeState {
  /** Dimension of the cube (3 for standard 3x3x3) */
  size: number
  /** Array of all center pieces */
  centers: CenterPiece[]
  /** Array of all edge pieces */
  edges: EdgePiece[]
  /** Array of all corner pieces */
  corners: CornerPiece[]
}

/**
 * Move notation string representing cube rotations
 * Examples: 'R', 'R2', '2R', "3U'", etc.
 * Parsed dynamically based on cube size and notation standards
 */
export type MoveNotation = string

/**
 * Parsed move details containing rotation specifications
 * 'layer' is 1 for outermost face, 2 for next inner layer, etc.
 */
export interface Move {
  /** Face or axis of rotation */
  face: CubeFace
  /** Depth layer: 1 = outer face, 2 = inner layer, etc. */
  layer: number
  /** Rotation direction (true for clockwise) */
  clockwise: boolean
  /** Signed rotation angle in radians */
  angle: number
}

/**
 * Animation state for tracking move progress
 */
export interface AnimationState {
  /** Whether a move animation is currently in progress */
  isAnimating: boolean
  /** The move currently being animated, if any */
  currentMove: Move | null
  /** Current rotation angle during animation */
  currentAngle: number
  /** Target angle for the current animation */
  targetAngle: number
  /** Animation progress from 0 to 1 */
  progress: number
}

/**
 * Default color mapping for each face in solved state
 */
export const DEFAULT_CUBE_COLORS: Record<CubeFace, CubeColor> = {
  front: 'red',
  back: 'orange',
  left: 'green',
  right: 'blue',
  top: 'white',
  bottom: 'yellow'
}

/**
 * Color mapping from cube colors to hex color codes for rendering
 */
export const COLOR_MAP: Record<CubeColor, string> = {
  white: '#ffffff',
  yellow: '#ffff00',
  red: '#ff0000',
  orange: '#ff8800',
  blue: '#0000ff',
  green: '#00ff00'
}
