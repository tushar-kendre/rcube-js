import { COLOR_MAP, CubeFace, DEFAULT_CUBE_COLORS } from "@/types/cube-core";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3 } from "three";

/**
 * Interface representing a visible face with its orientation info
 */
interface VisibleFace {
  face: CubeFace;
  label: string;
  color: string;
  position: "center" | "top" | "bottom" | "left" | "right";
  opacity: number;
}

/**
 * Props for camera tracker component (inside Canvas)
 */
interface CameraTrackerProps {
  onVisibleFacesUpdate: (faces: VisibleFace[]) => void;
}

/**
 * Props for the HUD display component (outside Canvas)
 */
interface FaceOrientationHUDProps {
  /** Whether the cube is currently busy (animating or executing sequences) */
  isAnimating?: boolean;
  /** List of currently visible faces */
  visibleFaces: VisibleFace[];
}

/**
 * Component that tracks camera position and calculates visible faces
 * Must be placed inside the Canvas component
 */
export function CameraTracker({ onVisibleFacesUpdate }: CameraTrackerProps) {
  const { camera } = useThree();
  const frameCount = useRef(0);

  /**
   * Determines which faces are visible and their relative positions from the camera's perspective
   */
  const updateVisibleFaces = () => {
    // Only update every 3 frames for performance
    frameCount.current++;
    if (frameCount.current % 3 !== 0) return;

    // Get camera position relative to cube center (0, 0, 0)
    const cameraPosition = camera.position.clone();
    
    // Calculate the forward vector (direction camera is looking)
    const forward = new Vector3(0, 0, -1);
    forward.applyQuaternion(camera.quaternion);
    
    // Calculate the up vector for camera orientation
    const up = new Vector3(0, 1, 0);
    up.applyQuaternion(camera.quaternion);
    
    // Calculate the right vector
    const right = new Vector3();
    right.crossVectors(forward, up);

    // Face normal vectors in world space
    const faceNormals: Record<CubeFace, Vector3> = {
      front: new Vector3(0, 0, 1),
      back: new Vector3(0, 0, -1),
      right: new Vector3(1, 0, 0),
      left: new Vector3(-1, 0, 0),
      top: new Vector3(0, 1, 0),
      bottom: new Vector3(0, -1, 0),
    };

    // Calculate which faces are visible (facing towards camera)
    const faces: VisibleFace[] = [];
    
    Object.entries(faceNormals).forEach(([faceName, normal]) => {
      const face = faceName as CubeFace;
      
      // Calculate dot product between face normal and direction to camera
      const directionToCamera = cameraPosition.clone().normalize();
      const dotProduct = normal.dot(directionToCamera);
      
      // Face is visible if it's facing the camera (dot product > 0)
      if (dotProduct > 0.1) { // Small threshold to avoid flickering
        // Calculate opacity based on how directly the face is facing the camera
        const opacity = Math.max(0.4, Math.min(1, dotProduct));
        
        // Determine position on screen based on face orientation relative to camera
        let position: VisibleFace["position"] = "center";
        
        // Project face normal to camera screen space to determine position
        const screenNormal = normal.clone();
        
        // Calculate relative position based on dot products with camera vectors
        const rightDot = screenNormal.dot(right);
        const upDot = screenNormal.dot(up);
        
        // Determine primary position based on strongest alignment
        if (Math.abs(rightDot) > Math.abs(upDot) && Math.abs(rightDot) > 0.3) {
          position = rightDot > 0 ? "right" : "left";
        } else if (Math.abs(upDot) > 0.3) {
          position = upDot > 0 ? "top" : "bottom";
        } else {
          position = "center";
        }
        
        // Get proper cube notation for face labels
        const getFaceLabel = (face: CubeFace): string => {
          switch (face) {
            case "front": return "F";
            case "back": return "B";
            case "right": return "R";
            case "left": return "L";
            case "top": return "U"; // Up
            case "bottom": return "D"; // Down
          }
        };
        
        faces.push({
          face,
          label: getFaceLabel(face),
          color: COLOR_MAP[DEFAULT_CUBE_COLORS[face]],
          position,
          opacity,
        });
      }
    });

    // Sort faces by opacity (most visible first)
    faces.sort((a, b) => b.opacity - a.opacity);
    
    onVisibleFacesUpdate(faces);
  };

  // Update visible faces on each frame
  useFrame(() => {
    updateVisibleFaces();
  });

  // This component doesn't render anything visible
  return null;
}

/**
 * HUD component that displays face orientation information
 * Must be placed outside the Canvas component
 */
export function FaceOrientationHUD({ isAnimating = false, visibleFaces }: FaceOrientationHUDProps) {
  // Don't show HUD during sequence execution to avoid distraction
  if (isAnimating) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Central face indicator */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        {visibleFaces
          .filter((f: VisibleFace) => f.position === "center")
          .slice(0, 1) // Show only the most prominent center face
          .map((face: VisibleFace) => (
            <div
              key={face.face}
              className="flex items-center justify-center w-16 h-16 rounded-full border-2 border-white/30 backdrop-blur-sm transition-all duration-200"
              style={{
                backgroundColor: `${face.color}40`, // 25% opacity
                borderColor: face.color,
                opacity: face.opacity,
              }}
            >
              <span 
                className="text-white font-bold text-lg drop-shadow-lg"
                style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
              >
                {face.label[0]}
              </span>
            </div>
          ))}
      </div>

      {/* Positional face indicators */}
      {visibleFaces
        .filter((f: VisibleFace) => f.position !== "center")
        .slice(0, 4) // Limit to prevent overcrowding
        .map((face: VisibleFace) => {
          // Calculate position based on face.position
          let positionClass = "";
          let transform = "";
          
          switch (face.position) {
            case "top":
              positionClass = "top-8 left-1/2";
              transform = "-translate-x-1/2";
              break;
            case "bottom":
              positionClass = "bottom-8 left-1/2";
              transform = "-translate-x-1/2";
              break;
            case "left":
              positionClass = "top-1/2 left-8";
              transform = "-translate-y-1/2";
              break;
            case "right":
              positionClass = "top-1/2 right-8";
              transform = "-translate-y-1/2";
              break;
          }

          return (
            <div
              key={face.face}
              className={`absolute ${positionClass} transform ${transform}`}
            >
              <div
                className="flex items-center justify-center w-12 h-12 rounded-lg border border-white/20 backdrop-blur-sm transition-all duration-200"
                style={{
                  backgroundColor: `${face.color}30`, // 19% opacity
                  borderColor: `${face.color}80`,
                  opacity: face.opacity * 0.8, // Slightly more transparent than center
                }}
              >
                <span 
                  className="text-white font-semibold text-sm drop-shadow-lg"
                  style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                >
                  {face.label[0]}
                </span>
              </div>
            </div>
          );
        })}

      {/* Face legend in bottom-left corner */}
      <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg p-3 border border-white/20">
        <h4 className="text-white text-xs font-semibold mb-2 opacity-80">Cube Faces</h4>
        <div className="grid grid-cols-2 gap-1 text-xs">
          {Object.entries(DEFAULT_CUBE_COLORS).map(([face, color]) => {
            const notation = face === "front" ? "F" : 
                           face === "back" ? "B" : 
                           face === "right" ? "R" : 
                           face === "left" ? "L" : 
                           face === "top" ? "U" : 
                           face === "bottom" ? "D" : face[0].toUpperCase();
            return (
              <div key={face} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-sm border border-white/30"
                  style={{ backgroundColor: COLOR_MAP[color] }}
                />
                <span className="text-white/80 capitalize">{notation}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
