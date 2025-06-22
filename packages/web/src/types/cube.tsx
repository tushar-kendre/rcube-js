export type CubeFace = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom'

export type CubeColor = 'white' | 'yellow' | 'red' | 'orange' | 'blue' | 'green'

export type PieceType = 'center' | 'edge' | 'corner'

export interface CubeFaceConfig {
  [key: string]: CubeColor[][]
}

export interface CubeConfig {
  front: CubeColor[][]
  back: CubeColor[][]
  left: CubeColor[][]
  right: CubeColor[][]
  top: CubeColor[][]
  bottom: CubeColor[][]
}

// New interfaces for piece-based representation
export interface CubePieceData {
  id: string
  type: PieceType
  position: [number, number, number]
  stickers: Partial<Record<CubeFace, CubeColor>>
}

export interface CubePieces {
  centers: CubePieceData[]
  edges: CubePieceData[]
  corners: CubePieceData[]
}

export interface CubeProps {
  size?: number
  config: CubeConfig
  onFaceClick?: (face: CubeFace, row: number, col: number) => void
  onPieceClick?: (piece: CubePieceData) => void
  animationSpeed?: number
}

export const DEFAULT_CUBE_COLORS: Record<CubeFace, CubeColor> = {
  front: 'red',
  back: 'orange',
  left: 'blue',
  right: 'green',
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