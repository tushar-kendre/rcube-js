import { useMemo } from "react";
import { Cubie, CubieAnimationState, CubieState } from "../../types/cubie";
import { CubiePiece } from "./cubie-piece";

interface CubieRubiksCubeProps {
  /** Current cube state using cubie representation */
  state: CubieState;
  /** Current animation state */
  animationState?: CubieAnimationState;
  /** Callback when a cubie is clicked */
  onCubieClick?: (cubie: Cubie) => void;
  /** Version number for forcing re-renders */
  cubeVersion: number;
}

/**
 * Cubie-based Rubik's Cube component for 3D rendering
 * This replaces the old piece-based cube with a new cubie-based implementation
 * that scales to any N×N×N cube size and is compatible with standard algorithms
 * 
 * Now supports smooth animations while maintaining the cubie-based data structure.
 */
export function CubieRubiksCube({
  state,
  animationState,
  onCubieClick,
  cubeVersion,
}: CubieRubiksCubeProps) {

  /**
   * Memoized cube center offset for centering the cube in 3D space
   * For an N×N×N cube, the center should be at ((N-1)/2, (N-1)/2, (N-1)/2)
   */
  const cubeCenter = useMemo(() => {
    const center = (state.size - 1) / 2;
    return [center, center, center] as const;
  }, [state.size]);

  /**
   * Renders all cubies from the current state with animation support
   */
  const renderCubies = useMemo(() => {
    // Group cubies by whether they're animating or not
    const animatingCubies = new Set(animationState?.animatingCubies || []);
    
    return (
      <>
        {/* Animated cubies - grouped together for proper rotation */}
        {animationState?.isAnimating && animationState.currentMove && (
          <group>
            {/* Apply rotation to the entire group of animating cubies */}
            <group
              rotation={(() => {
                const move = animationState.currentMove;
                const angle = animationState.currentAngle;
                
                // Apply rotation based on the move face
                // Note: The angle already contains direction info, so just apply it to the correct axis
                switch (move.face) {
                  case 'right':
                    // R moves rotate around positive X-axis
                    return [angle, 0, 0] as [number, number, number];
                  case 'left':
                    // L moves rotate around negative X-axis (opposite of R)
                    return [-angle, 0, 0] as [number, number, number];
                  case 'top':
                    // U moves rotate around positive Y-axis
                    return [0, angle, 0] as [number, number, number];
                  case 'bottom':
                    // D moves rotate around negative Y-axis (opposite of U)
                    return [0, -angle, 0] as [number, number, number];
                  case 'front':
                    // F moves rotate around positive Z-axis
                    return [0, 0, angle] as [number, number, number];
                  case 'back':
                    // B moves rotate around negative Z-axis (opposite of F)
                    return [0, 0, -angle] as [number, number, number];
                  default:
                    return [0, 0, 0] as [number, number, number];
                }
              })()}
            >
              {state.cubies.map((cubie, index) => {
                if (!animatingCubies.has(index)) return null;
                
                const [x, y, z] = cubie.renderPosition;
                const position: [number, number, number] = [
                  x - cubeCenter[0],
                  y - cubeCenter[1], 
                  z - cubeCenter[2],
                ];

                return (
                  <CubiePiece
                    key={`cubie-animated-${cubie.id}-v${cubeVersion}`}
                    cubie={cubie}
                    position={position}
                    cubeSize={state.size}
                    onClick={onCubieClick}
                  />
                );
              })}
            </group>
          </group>
        )}
        
        {/* Static cubies - not currently animating */}
        {state.cubies.map((cubie, index) => {
          if (animatingCubies.has(index)) return null;
          
          const [x, y, z] = cubie.renderPosition;
          const position: [number, number, number] = [
            x - cubeCenter[0],
            y - cubeCenter[1], 
            z - cubeCenter[2],
          ];

          return (
            <CubiePiece
              key={`cubie-static-${cubie.id}-v${cubeVersion}`}
              cubie={cubie}
              position={position}
              cubeSize={state.size}
              onClick={onCubieClick}
            />
          );
        })}
      </>
    );
  }, [state.cubies, cubeCenter, cubeVersion, onCubieClick, animationState]);

  return (
    <group>
      {/* Ambient lighting for better visibility */}
      <ambientLight intensity={0.6} />
      
      {/* Directional lights for depth and shadows */}
      <directionalLight
        position={[10, 10, 10]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight
        position={[-10, -10, -10]}
        intensity={0.3}
      />
      
      {/* Point light for additional illumination */}
      <pointLight position={[0, 0, 10]} intensity={0.4} />
      
      {/* All cube pieces */}
      <group name="cube-cubies">
        {renderCubies}
      </group>
    </group>
  );
}

export default CubieRubiksCube;
