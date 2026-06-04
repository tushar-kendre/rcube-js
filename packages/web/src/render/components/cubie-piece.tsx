import { memo } from "react";
import { CubeFace } from "../../cube/model/faces";
import { VisualCubie } from "../../cube/model/state-visual";
import {
  FACE_NORMAL,
  FACE_ROTATION,
  bodyMaterial,
  cubieGeometry,
  getStickerMaterial,
  STICKER_OFFSET,
  stickerGeometry,
} from "../materials";

interface CubiePieceProps {
  cubie: VisualCubie;
  /** Offset that centers the cube around the origin. */
  center: number;
}

/**
 * Renders one cubie: a shared dark body plus a colored sticker plane for each
 * visible face. All geometries and materials are shared module singletons.
 */
function CubiePieceImpl({ cubie, center }: CubiePieceProps) {
  const [x, y, z] = cubie.gridPosition;
  const position: [number, number, number] = [x - center, y - center, z - center];

  return (
    <group position={position}>
      <mesh geometry={cubieGeometry} material={bodyMaterial} />
      {(Object.keys(cubie.stickerColors) as CubeFace[]).map((face) => {
        const color = cubie.stickerColors[face];
        if (!color) return null;
        const normal = FACE_NORMAL[face];
        return (
          <mesh
            key={face}
            geometry={stickerGeometry}
            material={getStickerMaterial(color)}
            position={[
              normal[0] * STICKER_OFFSET,
              normal[1] * STICKER_OFFSET,
              normal[2] * STICKER_OFFSET,
            ]}
            rotation={FACE_ROTATION[face]}
          />
        );
      })}
    </group>
  );
}

function sameStickers(
  a: VisualCubie["stickerColors"],
  b: VisualCubie["stickerColors"],
): boolean {
  const faces: CubeFace[] = ["front", "back", "left", "right", "top", "bottom"];
  return faces.every((f) => a[f] === b[f]);
}

export const CubiePiece = memo(CubiePieceImpl, (prev, next) => {
  return (
    prev.center === next.center &&
    prev.cubie.gridPosition[0] === next.cubie.gridPosition[0] &&
    prev.cubie.gridPosition[1] === next.cubie.gridPosition[1] &&
    prev.cubie.gridPosition[2] === next.cubie.gridPosition[2] &&
    sameStickers(prev.cubie.stickerColors, next.cubie.stickerColors)
  );
});
