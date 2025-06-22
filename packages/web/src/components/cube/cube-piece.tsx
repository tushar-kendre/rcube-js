import { COLOR_MAP, CubePiece, Sticker } from "@/types/cube-pieces";
import { memo, useRef } from "react";
import { Mesh } from "three";

/**
 * Props interface for the CubePieceComponent
 */
interface CubePieceComponentProps {
  /** The cube piece data containing position and stickers */
  piece: CubePiece;
  /** Optional click handler for piece interaction */
  onClick?: (piece: CubePiece) => void;
}

/**
 * Individual cube piece component that renders a 3D piece with colored stickers
 *
 * Handles:
 * - 3D geometry positioning
 * - Sticker placement and coloring
 * - Click interaction
 * - Performance optimization through memoization
 *
 * @param piece - The cube piece data with position and sticker information
 * @param onClick - Optional callback when the piece is clicked
 * @returns JSX element representing the 3D cube piece
 */
export function CubePieceComponent({
  piece,
  onClick,
}: CubePieceComponentProps) {
  const meshRef = useRef<Mesh>(null);
  const [x, y, z] = piece.position;

  // Create a stable but unique identifier that changes when stickers change
  const stickerHash = piece.stickers
    .map((s) => `${s.face}:${s.color}`)
    .join("-");
  const pieceStateKey = `${piece.id}-${piece.position.join(",")}-${stickerHash}`;

  /**
   * Handles click events on the cube piece
   */
  const handleClick = () => {
    onClick?.(piece);
  };

  /**
   * Renders a single colored sticker on a face of the cube piece
   *
   * @param sticker - Sticker data containing face and color information
   * @param index - Index for React key prop
   * @returns JSX element for the sticker or null if invalid
   */
  const renderSticker = (sticker: Sticker, index: number) => {
    // Validate sticker data
    if (!sticker.face || !sticker.color) {
      return null;
    }

    const color = COLOR_MAP[sticker.color];
    if (!color) {
      return null;
    }

    // Position sticker slightly outside the main cube to avoid z-fighting
    let stickerPosition: [number, number, number] = [0, 0, 0];
    let stickerRotation: [number, number, number] = [0, 0, 0];

    const offset = 0.51; // Small offset to prevent visual artifacts

    // Calculate position and rotation based on which face the sticker is on
    switch (sticker.face) {
      case "front":
        stickerPosition = [0, 0, offset];
        break;
      case "back":
        stickerPosition = [0, 0, -offset];
        stickerRotation = [0, Math.PI, 0];
        break;
      case "right":
        stickerPosition = [offset, 0, 0];
        stickerRotation = [0, Math.PI / 2, 0];
        break;
      case "left":
        stickerPosition = [-offset, 0, 0];
        stickerRotation = [0, -Math.PI / 2, 0];
        break;
      case "top":
        stickerPosition = [0, offset, 0];
        stickerRotation = [-Math.PI / 2, 0, 0];
        break;
      case "bottom":
        stickerPosition = [0, -offset, 0];
        stickerRotation = [Math.PI / 2, 0, 0];
        break;
    }

    // Create stable key based on piece state
    const uniqueKey = `${piece.id}-${sticker.face}-${sticker.color}-${index}`;

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
    );
  };

  return (
    <group
      key={`${piece.id}-${pieceStateKey}`}
      position={[x, y, z]}
      onClick={handleClick}
    >
      {/* Main cube body (black) */}
      <mesh ref={meshRef}>
        <boxGeometry args={[1, 1, 1]} />
        <meshLambertMaterial color="#000000" />
      </mesh>

      {/* Stickers */}
      {(() => {
        const validStickers = piece.stickers.filter((sticker) => {
          const isValid =
            sticker.face && sticker.color && COLOR_MAP[sticker.color];
          return isValid;
        });

        return validStickers.map((sticker, index) =>
          renderSticker(sticker, index),
        );
      })()}
    </group>
  );
}

// Wrap with memo to prevent unnecessary re-renders
export const CubePieceComponentMemo = memo(CubePieceComponent, () => {
  // Always re-render to ensure fresh materials - this prevents caching issues
  return false;
});
