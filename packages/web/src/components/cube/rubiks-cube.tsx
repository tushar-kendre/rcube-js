import { isPieceInFaceLayer, isPieceInLayer } from "@/lib/cube-piece-utils";
import { AnimationState, CubePiece, CubeState } from "@/types/cube-pieces";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Group } from "three";
import { CubePieceComponentMemo as CubePieceComponent } from "./cube-piece";

/**
 * Props interface for the RubiksCube component
 */
interface RubiksCubeProps {
  /** Current state of the cube containing all piece positions and colors */
  state: CubeState;
  /** Optional callback function triggered when a cube piece is clicked */
  onPieceClick?: (piece: CubePiece) => void;
  /** Current animation state for face rotations */
  animationState?: AnimationState;
  /** Version number used to force cube recreation during animations */
  cubeVersion?: number;
}

/**
 * Main Rubik's Cube 3D component that renders all cube pieces and handles animations
 *
 * @param state - Current cube state with piece positions and colors
 * @param onPieceClick - Optional callback when a piece is clicked
 * @param animationState - Current animation state for face rotations
 * @param cubeVersion - Version counter to force component recreation
 * @returns JSX element representing the complete 3D Rubik's cube
 */
export function RubiksCube({
  state,
  onPieceClick,
  animationState,
  cubeVersion = 0,
}: RubiksCubeProps) {
  // Refs for 3D object manipulation
  const groupRef = useRef<Group>(null);
  const faceGroupRef = useRef<Group>(null);

  // Combine all cube pieces into a single array for processing
  const allPieces = [...state.centers, ...state.edges, ...state.corners];

  /**
   * Handles cube piece click events, preventing interaction during animations
   *
   * @param piece - The cube piece that was clicked
   */
  const handlePieceClick = (piece: CubePiece) => {
    // Prevent interaction during animations
    if (animationState?.isAnimating) return;
    onPieceClick?.(piece);
  };

  // Apply rotation animations
  useFrame(() => {
    if (
      animationState?.isAnimating &&
      animationState.currentMove &&
      faceGroupRef.current
    ) {
      const move = animationState.currentMove;
      const angle = animationState.currentAngle;

      // Reset rotation to prevent accumulation
      faceGroupRef.current.rotation.set(0, 0, 0);

      // Apply rotation based on the face being moved
      switch (move.face) {
        case "right":
          faceGroupRef.current.rotation.x = angle;
          break;
        case "left":
          faceGroupRef.current.rotation.x = -angle;
          break;
        case "top":
          faceGroupRef.current.rotation.y = angle;
          break;
        case "bottom":
          faceGroupRef.current.rotation.y = -angle;
          break;
        case "front":
          faceGroupRef.current.rotation.z = -angle;
          break;
        case "back":
          faceGroupRef.current.rotation.z = angle;
          break;
      }
    }
  });

  // Split pieces into static and rotating groups for animation optimization
  const staticPieces: CubePiece[] = [];
  const rotatingPieces: CubePiece[] = [];

  if (animationState?.isAnimating && animationState.currentMove) {
    const { face, layer } = animationState.currentMove;
    allPieces.forEach((piece) => {
      // Determine if piece is in the rotating layer
      const inLayer =
        layer === 1
          ? isPieceInFaceLayer(piece.position, face, state.size)
          : isPieceInLayer(piece.position, face, state.size, layer);
      if (inLayer) {
        rotatingPieces.push(piece);
      } else {
        staticPieces.push(piece);
      }
    });
  } else {
    // No animation in progress - all pieces are static
    staticPieces.push(...allPieces);
  }

  return (
    <group ref={groupRef}>
      {/* Basic lighting setup for the 3D scene */}
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />

      {/* Render static pieces (not currently being animated) */}
      {staticPieces.map((piece) => (
        <CubePieceComponent
          key={`${piece.id}-v${cubeVersion}`}
          piece={piece}
          onClick={handlePieceClick}
        />
      ))}

      {/* Render rotating pieces in a separate group for animation */}
      {animationState?.isAnimating && (
        <group ref={faceGroupRef}>
          {rotatingPieces.map((piece) => (
            <CubePieceComponent
              key={`${piece.id}-v${cubeVersion}`}
              piece={piece}
              onClick={handlePieceClick}
            />
          ))}
        </group>
      )}
    </group>
  );
}
