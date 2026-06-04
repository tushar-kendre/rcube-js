import { useCallback, useState } from "react";
import { toast } from "sonner";
import { toFacelets } from "../cube/convert/facelets";
import {
  cycleSticker,
  FACE_FOR_COLOR,
  faceLabel,
  faceToHex,
  NET_GRID,
  NetCell,
  solvedFacelets,
  validateFacelets,
} from "../cube/convert/net";
import { Face, FACE_COLOR } from "../cube/model/faces";
import { CubeState3x3 } from "../cube/model/state-3x3";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface CubeNetEditorProps {
  canEdit: boolean;
  getCanonicalState: () => CubeState3x3 | null;
  onApply: (state: CubeState3x3) => void;
  onApplied?: () => void;
}

function StickerCell({
  cell,
  colorFace,
  onCycle,
}: {
  cell: NetCell;
  colorFace: Face;
  onCycle: (index: number) => void;
}) {
  const locked = cell.isCenter;
  const colorName = FACE_COLOR[colorFace];

  return (
    <button
      type="button"
      aria-label={faceLabel(cell.face, cell.row, cell.col) + `, ${colorName}`}
      title={locked ? `${cell.face} center (fixed)` : `${colorName} → next color`}
      disabled={locked}
      onClick={() => onCycle(cell.index)}
      className={cn(
        "aspect-square w-full min-w-0 rounded-[3px] border border-black/20",
        locked
          ? "cursor-default outline outline-1 outline-foreground/30"
          : "cursor-pointer hover:brightness-110 active:scale-95",
      )}
      style={{ backgroundColor: faceToHex(colorFace) }}
    >
      {locked && (
        <span
          className="flex h-full w-full items-center justify-center text-[clamp(7px,2.5cqi,11px)] font-bold leading-none"
          style={{
            color: colorFace === "U" ? "#333" : "#fff",
            textShadow: colorFace === "U" ? "none" : "0 1px 1px rgba(0,0,0,0.45)",
          }}
        >
          {cell.face}
        </span>
      )}
    </button>
  );
}

export function CubeNetEditor({
  canEdit,
  getCanonicalState,
  onApply,
  onApplied,
}: CubeNetEditorProps) {
  const [facelets, setFacelets] = useState<Face[]>(() => solvedFacelets());

  const handleCycle = useCallback((index: number) => {
    setFacelets((prev) => cycleSticker(prev, index));
  }, []);

  const handleReset = () => setFacelets(solvedFacelets());

  const handleCopyFromCube = () => {
    const state = getCanonicalState();
    if (!state) {
      toast.error("Copy requires a 3×3 cube.");
      return;
    }
    setFacelets(toFacelets(state));
    toast.message("Copied the 3D cube into the net.");
  };

  const handleApply = () => {
    const result = validateFacelets(facelets);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    onApply(result.state);
    toast.success("Cube state loaded.");
    onApplied?.();
  };

  if (!canEdit) {
    return (
      <p className="text-sm text-muted-foreground">
        Custom states are available for 3×3 cubes only. Switch to size 3 to paint a scramble.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Unfolded view — <strong className="text-foreground">U</strong> top (white),{" "}
        <strong className="text-foreground">F</strong> front (red),{" "}
        <strong className="text-foreground">L</strong> left (green). Click stickers to cycle
        color; centers (lettered) stay fixed.
      </p>

      {/* 12 columns: middle band is L+F+R+B (4×3). U/D centered over F. */}
      <div className="w-full rounded-lg border bg-muted/20 p-2 [container-type:inline-size]">
        <div
          className="mx-auto grid w-full max-w-[min(100%,300px)] gap-[2px]"
          style={{ gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}
        >
          {NET_GRID.flatMap((row, ri) =>
            row.map((cell, ci) =>
              cell ? (
                <StickerCell
                  key={`${ri}-${ci}-${cell.index}`}
                  cell={cell}
                  colorFace={facelets[cell.index]}
                  onCycle={handleCycle}
                />
              ) : (
                <div key={`e-${ri}-${ci}`} className="aspect-square min-w-0" aria-hidden />
              ),
            ),
          )}
        </div>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          L · F · R · B (middle row)
        </p>
      </div>

      <div className="flex flex-wrap gap-1">
        {(["white", "yellow", "red", "orange", "green", "blue"] as const).map((c) => (
          <span
            key={c}
            className="inline-flex items-center gap-1 rounded border px-1.5 py-px text-[9px] text-muted-foreground"
          >
            <span
              className="size-2 shrink-0 rounded-sm border border-black/15"
              style={{ backgroundColor: faceToHex(FACE_FOR_COLOR[c]) }}
            />
            {c}
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <Button size="sm" className="w-full" onClick={handleCopyFromCube}>
          Copy from cube
        </Button>
        <div className="flex gap-1.5">
          <Button size="sm" className="flex-1" onClick={handleApply}>
            Apply
          </Button>
          <Button size="sm" variant="secondary" className="flex-1" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
