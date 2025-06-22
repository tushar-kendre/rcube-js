import { useRef } from 'react'
import { Group } from 'three'
import { useFrame } from '@react-three/fiber'
import { CubePieceComponentMemo as CubePieceComponent } from './cube-piece'
import { CubeState, CubePiece, AnimationState } from '@/types/cube-pieces'
import { isPieceInFaceLayer, isPieceInLayer } from '@/lib/cube-piece-utils'

interface RubiksCubeProps {
  state: CubeState
  onPieceClick?: (piece: CubePiece) => void
  animationState?: AnimationState
  cubeVersion?: number // Add version for forced recreation
}

export function RubiksCube({ 
  state, 
  onPieceClick,
  animationState,
  cubeVersion = 0
}: RubiksCubeProps) {
  const groupRef = useRef<Group>(null)
  const faceGroupRef = useRef<Group>(null)

  const allPieces = [...state.centers, ...state.edges, ...state.corners]
  
  const handlePieceClick = (piece: CubePiece) => {
    if (animationState?.isAnimating) return
    onPieceClick?.(piece)
  }

  // Apply rotation animations
  useFrame(() => {
    if (animationState?.isAnimating && animationState.currentMove && faceGroupRef.current) {
      const move = animationState.currentMove
      const angle = animationState.currentAngle
      
      // Reset rotation
      faceGroupRef.current.rotation.set(0, 0, 0)
      
      // Apply rotation based on face
      switch (move.face) {
        case 'right':
          faceGroupRef.current.rotation.x = angle
          break
        case 'left':
          faceGroupRef.current.rotation.x = -angle
          break
        case 'top':
          faceGroupRef.current.rotation.y = angle
          break
        case 'bottom':
          faceGroupRef.current.rotation.y = -angle
          break
        case 'front':
          faceGroupRef.current.rotation.z = -angle
          break
        case 'back':
          faceGroupRef.current.rotation.z = angle
          break
      }
    }
  })

  // Split pieces into static and rotating
  const staticPieces: CubePiece[] = []
  const rotatingPieces: CubePiece[] = []

  if (animationState?.isAnimating && animationState.currentMove) {
    const { face, layer } = animationState.currentMove
    allPieces.forEach(piece => {
      const inLayer = layer === 1
        ? isPieceInFaceLayer(piece.position, face, state.size)
        : isPieceInLayer(piece.position, face, state.size, layer)
      if (inLayer) {
        rotatingPieces.push(piece)
      } else {
        staticPieces.push(piece)
      }
    })
  } else {
    staticPieces.push(...allPieces)
  }

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      
      {/* Static pieces */}
      {staticPieces.map(piece => (
        <CubePieceComponent
          key={`${piece.id}-v${cubeVersion}`}
          piece={piece}
          onClick={handlePieceClick}
        />
      ))}
      
      {/* Rotating pieces */}
      {animationState?.isAnimating && (
        <group ref={faceGroupRef}>
          {rotatingPieces.map(piece => (
            <CubePieceComponent
              key={`${piece.id}-v${cubeVersion}`}
              piece={piece}
              onClick={handlePieceClick}
            />
          ))}
        </group>
      )}
    </group>
  )
}
