import { useRef, memo } from 'react'
import { Mesh } from 'three'
import { CubePiece, Sticker, COLOR_MAP } from '@/types/cube-pieces'

interface CubePieceComponentProps {
  piece: CubePiece
  onClick?: (piece: CubePiece) => void
}

export function CubePieceComponent({ piece, onClick }: CubePieceComponentProps) {
  const meshRef = useRef<Mesh>(null)
  const [x, y, z] = piece.position
  
  // Create a stable but unique identifier that changes when stickers change
  const stickerHash = piece.stickers.map(s => `${s.face}:${s.color}`).join('-')
  const pieceStateKey = `${piece.id}-${piece.position.join(',')}-${stickerHash}`

  const handleClick = () => {
    onClick?.(piece)
  }

  // Create sticker meshes for each visible face
  const renderSticker = (sticker: Sticker, index: number) => {
    // Validate sticker data
    if (!sticker.face || !sticker.color) {
      return null
    }
    
    const color = COLOR_MAP[sticker.color]
    if (!color) {
      return null
    }
    
    // Position sticker slightly outside the main cube to avoid z-fighting
    let stickerPosition: [number, number, number] = [0, 0, 0]
    let stickerRotation: [number, number, number] = [0, 0, 0]
    
    const offset = 0.51
    
    switch (sticker.face) {
      case 'front':
        stickerPosition = [0, 0, offset]
        break
      case 'back':
        stickerPosition = [0, 0, -offset]
        stickerRotation = [0, Math.PI, 0]
        break
      case 'right':
        stickerPosition = [offset, 0, 0]
        stickerRotation = [0, Math.PI / 2, 0]
        break
      case 'left':
        stickerPosition = [-offset, 0, 0]
        stickerRotation = [0, -Math.PI / 2, 0]
        break
      case 'top':
        stickerPosition = [0, offset, 0]
        stickerRotation = [-Math.PI / 2, 0, 0]
        break
      case 'bottom':
        stickerPosition = [0, -offset, 0]
        stickerRotation = [Math.PI / 2, 0, 0]
        break
    }
    
    // Create stable key based on piece state
    const uniqueKey = `${piece.id}-${sticker.face}-${sticker.color}-${index}`
    
    return (
      <mesh 
        key={uniqueKey}
        position={stickerPosition}
        rotation={stickerRotation}
      >
        <planeGeometry args={[0.9, 0.9]} />
        {/* Force material recreation with unique key based on piece state */}
        <meshLambertMaterial 
          key={`${uniqueKey}-material`}
          color={color}
          transparent={false}
          opacity={1}
        />
      </mesh>
    )
  }

  return (
    <group key={`${piece.id}-${pieceStateKey}`} position={[x, y, z]} onClick={handleClick}>
      {/* Main cube body (black) */}
      <mesh ref={meshRef}>
        <boxGeometry args={[1, 1, 1]} />
        <meshLambertMaterial color="#000000" />
      </mesh>
      
      {/* Stickers */}
      {(() => {
        const validStickers = piece.stickers.filter((sticker) => {
          const isValid = sticker.face && sticker.color && COLOR_MAP[sticker.color]
          return isValid
        })
        
        return validStickers.map((sticker, index) => renderSticker(sticker, index))
      })()}
    </group>
  )
}

// Wrap with memo to prevent unnecessary re-renders
export const CubePieceComponentMemo = memo(CubePieceComponent, () => {
  // Always re-render to ensure fresh materials - this prevents caching issues
  return false
})
