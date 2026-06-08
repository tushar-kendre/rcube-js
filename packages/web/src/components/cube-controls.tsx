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
import { getSolver, SOLVE_METHODS, type SolveMethod } from "../solvers/registry";

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
  solveMethod: SolveMethod;
  onSolveMethodChange: (method: SolveMethod) => void;
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

/** Wide, slice, and rotation moves available for the current cube size. */
function fancyMovesForSize(size: number): string[] {
  const moves: string[] = ["x", "x'", "y", "y'", "z", "z'"];
  if (size % 2 === 1) {
    moves.push("M", "M'", "E", "E'", "S", "S'");
  }
  if (size >= 3) {
    baseFaces.forEach((face) => moves.push(`${face}w`, `${face}w'`));
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
  solveMethod,
  onSolveMethodChange,
}: CubeControlsProps) {
  const solver = getSolver(solveMethod);
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
  const fancyMoves = fancyMovesForSize(size);
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

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Rotations / slices / wide moves
          </Label>
          <div className="grid grid-cols-6 gap-1.5">
            {fancyMoves.map((m) => (
              <Tooltip key={m}>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
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
              <div className="space-y-1.5">
                <Label htmlFor="solve-method">Solve method</Label>
                <select
                  id="solve-method"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                  value={solveMethod}
                  onChange={(e) => onSolveMethodChange(e.target.value as SolveMethod)}
                  disabled={isBusy}
                >
                  {SOLVE_METHODS.map((id) => (
                    <option key={id} value={id}>
                      {getSolver(id).label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">{solver.subtitle}</p>
              </div>
              <Button
                className="w-full font-semibold"
                onClick={solveCube}
                disabled={isBusy}
              >
                Solve cube ({solver.label})
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
