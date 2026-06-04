import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface CubeControlsProps {
  isBusy: boolean;
  executeMove: (notation: string) => void;
  executeMoves: (notations: string[]) => void;
  scramble: (length?: number) => void;
  solveCube: () => void;
  canSolve: boolean;
  reset: () => void;
  stop: () => void;
  size: number;
  onSizeChange: (size: number) => void;
  onTutorialStart?: () => void;
}

const baseFaces = ["R", "L", "U", "D", "F", "B"];

function movesForSize(size: number): string[] {
  const moves: string[] = [];
  baseFaces.forEach((face) => moves.push(face, `${face}'`));

  if (size > 3) {
    const maxInnerLayer = size - Math.floor(size / 2);
    for (let layer = 2; layer <= maxInnerLayer; layer++) {
      baseFaces.forEach((face) =>
        moves.push(`${layer}${face}`, `${layer}${face}'`),
      );
    }
  }
  return moves;
}

export default function CubeControls({
  isBusy,
  executeMove,
  executeMoves,
  scramble,
  solveCube,
  canSolve,
  reset,
  stop,
  size,
  onSizeChange,
  onTutorialStart,
}: CubeControlsProps) {
  const [customSeq, setCustomSeq] = useState("");
  const [scrambleLen, setScrambleLen] = useState(20);
  const [inputSize, setInputSize] = useState(size.toString());

  useEffect(() => {
    setInputSize(size.toString());
  }, [size]);

  const handleCustomExecute = () => {
    const seq = customSeq.trim().split(/\s+/).filter(Boolean);
    if (seq.length > 0) executeMoves(seq);
  };

  const handleSetSize = () => {
    const next = parseInt(inputSize, 10);
    if (!Number.isNaN(next) && next >= 2) onSizeChange(next);
  };

  const moves = movesForSize(size);
  const gridCols =
    moves.length > 18 ? "grid-cols-6" : moves.length > 12 ? "grid-cols-5" : "grid-cols-4";

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4">
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <Label htmlFor="cube-size">Cube size (≥2)</Label>
          <div className="flex gap-2">
            <Input
              id="cube-size"
              type="number"
              min={2}
              value={inputSize}
              onChange={(e) => setInputSize(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSetSize()}
              disabled={isBusy}
            />
            <Button
              onClick={handleSetSize}
              disabled={
                isBusy ||
                parseInt(inputSize, 10) < 2 ||
                Number.isNaN(parseInt(inputSize, 10))
              }
            >
              Set
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Current: {size}×{size}×{size}
          </p>
        </div>

        <div className={`grid gap-1.5 ${gridCols}`}>
          {moves.map((m) => (
            <Tooltip key={m}>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="default"
                  className="text-xs px-1"
                  onClick={() => executeMove(m)}
                  disabled={isBusy}
                >
                  {m}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{m}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="custom-seq">Custom sequence</Label>
          <Input
            id="custom-seq"
            value={customSeq}
            onChange={(e) => setCustomSeq(e.target.value)}
            disabled={isBusy}
            placeholder="e.g. R U R' U'"
          />
          <Button
            className="w-full"
            variant="secondary"
            onClick={handleCustomExecute}
            disabled={isBusy}
          >
            Execute sequence
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="scramble-len">Scramble length</Label>
          <Input
            id="scramble-len"
            type="number"
            min={1}
            value={scrambleLen}
            onChange={(e) => setScrambleLen(Number(e.target.value))}
            disabled={isBusy}
          />
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => scramble(scrambleLen)}
            disabled={isBusy}
          >
            Scramble
          </Button>
        </div>

        <Separator />

        <div className="space-y-2">
          {canSolve && (
            <>
              <Button
                className="w-full font-semibold"
                onClick={solveCube}
                disabled={isBusy}
              >
                Solve cube
              </Button>
              {onTutorialStart && (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={onTutorialStart}
                  disabled={isBusy}
                >
                  Solve with tutorial
                </Button>
              )}
            </>
          )}
          <Button
            className="w-full"
            variant="destructive"
            onClick={reset}
            disabled={isBusy}
          >
            Reset
          </Button>
          <Button className="w-full" variant="secondary" onClick={stop} disabled={!isBusy}>
            Stop
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
