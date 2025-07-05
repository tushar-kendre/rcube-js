import { useMemo, useRef } from "react";
import { Group, Mesh } from "three";
import { getCubieDisplayColor } from "../../lib/cubie-utils";
import { CubeColor, CubeFace } from "../../types/cube-core";
import { Cubie, getVisibleFaces } from "../../types/cubie";

interface CubiePieceProps {
  /** The cubie data to render */
  cubie: Cubie;
  /** Position in 3D space relative to cube center */
  position: [number, number, number];
  /** Size of the cube (N for NxNxN) */
  cubeSize: number;
  /** Click handler */
  onClick?: (cubie: Cubie) => void;
}

/**
 * Individual cubie piece component for 3D rendering
 * Renders a single cubie with its stickers
 */
export function CubiePiece({
  cubie,
  position,
  cubeSize,
  onClick,
}: CubiePieceProps) {
  const meshRef = useRef<Mesh>(null);
  const groupRef = useRef<Group>(null);

  /**
   * Color mapping from cube colors to hex values
   */
  const colorMap: Record<CubeColor, string> = useMemo(() => ({
    white: "#ffffff",
    red: "#ff4444",
    blue: "#4444ff", 
    orange: "#ff8800",
    green: "#44ff44",
    yellow: "#ffff44",
  }), []);

  /**
   * Face normal vectors for sticker positioning
   */
  const faceNormals: Record<CubeFace, [number, number, number]> = useMemo(() => ({
    front: [0, 0, 1],
    back: [0, 0, -1],
    right: [1, 0, 0],
    left: [-1, 0, 0],
    top: [0, 1, 0],
    bottom: [0, -1, 0],
  }), []);

  /**
   * No individual piece animation - rotation is handled at the face level
   */

  /**
   * Renders stickers for visible faces
   */
  const renderStickers = useMemo(() => {
    const stickers: JSX.Element[] = [];
    const [x, y, z] = cubie.renderPosition;
    const visibleFaces = getVisibleFaces(x, y, z, cubeSize);
    
    visibleFaces.forEach(face => {
      const color = getCubieDisplayColor(cubie, face, cubeSize);
      if (!color) return; // No sticker for this face
      
      const normal = faceNormals[face];
      const stickerColor = colorMap[color];
      
      // Calculate sticker position (slightly offset from cube face)
      const offset = 0.52; // Increased offset to prevent z-fighting
      const stickerPosition: [number, number, number] = [
        normal[0] * offset,
        normal[1] * offset,
        normal[2] * offset,
      ];

      // Calculate rotation for the sticker to face outward
      let rotation: [number, number, number] = [0, 0, 0];
      switch (face) {
        case 'front':
          rotation = [0, 0, 0];
          break;
        case 'back':
          rotation = [0, Math.PI, 0];
          break;
        case 'right':
          rotation = [0, Math.PI / 2, 0];
          break;
        case 'left':
          rotation = [0, -Math.PI / 2, 0];
          break;
        case 'top':
          rotation = [-Math.PI / 2, 0, 0];
          break;
        case 'bottom':
          rotation = [Math.PI / 2, 0, 0];
          break;
      }

      stickers.push(
        <mesh
          key={`sticker-${face}`}
          position={stickerPosition}
          rotation={rotation}
        >
          <planeGeometry args={[0.9, 0.9]} />
          <meshLambertMaterial 
            color={stickerColor}
            transparent={false}
          />
        </mesh>
      );
    });

    return stickers;
  }, [cubie, faceNormals, colorMap]);

  /**
   * Handle click events
   */
  const handleClick = () => {
    onClick?.(cubie);
  };

  return (
    <group 
      ref={groupRef}
      position={position}
    >
      {/* Main cube body */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'default';
        }}
      >
        <boxGeometry args={[0.95, 0.95, 0.95]} />
        <meshLambertMaterial 
          color="#2a2a2a" 
          transparent={false}
        />
      </mesh>

      {/* Stickers */}
      {renderStickers}
    </group>
  );
}

export default CubiePiece;
