import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pause,
  Play,
  Square,
} from "lucide-react";
import { formatMove } from "../cube/moves/notation";
import type { SolutionPlayback } from "../app/hooks/use-solution-playback";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { cn } from "@/lib/utils";

interface SolutionPanelProps {
  playback: SolutionPlayback;
  isBusy: boolean;
}

export function SolutionPanel({ playback, isBusy }: SolutionPanelProps) {
  const {
    plan,
    mode,
    globalMoveIndex,
    totalMoves,
    activeSegmentIndex,
    currentMoveLabel,
    buildPlan,
    play,
    pause,
    stop,
    stepForward,
    stepBack,
    nextSegment,
    prevSegment,
    jumpToSegment,
    seekToMove,
  } = playback;

  const progress = totalMoves > 0 ? (globalMoveIndex / totalMoves) * 100 : 0;
  const starts: number[] = [];
  if (plan) {
    let off = 0;
    for (const seg of plan.segments) {
      starts.push(off);
      off += seg.moveCount;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Beginner Method</h3>
          <p className="text-xs text-muted-foreground">Cross → F2L → OLL → PLL</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => buildPlan()} disabled={isBusy}>
          Build plan
        </Button>
      </div>

      {!plan ? (
        <p className="text-sm text-muted-foreground">
          Scramble the cube or set a custom state, then build a plan to step through each stage.
        </p>
      ) : (
        <>
          <Accordion
            type="single"
            collapsible
            value={String(activeSegmentIndex)}
            onValueChange={(v) => v && jumpToSegment(Number(v))}
          >
            {plan.segments.map((seg, i) => {
              const segStart = starts[i] ?? 0;
              const done =
                seg.alreadyComplete ||
                globalMoveIndex >= segStart + seg.moveCount;
              const active = i === activeSegmentIndex;

              return (
                <AccordionItem key={seg.id} value={String(i)}>
                  <AccordionTrigger
                    className={cn(
                      "py-2 text-sm hover:no-underline",
                      active && "text-primary font-medium",
                    )}
                  >
                    <span className="flex flex-1 items-center gap-2 text-left">
                      {done ? (
                        <CheckCircle2 className="size-4 shrink-0 text-primary" />
                      ) : (
                        <span className="size-4 shrink-0 rounded-full border border-muted-foreground/40" />
                      )}
                      <span>{seg.title}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {seg.alreadyComplete ? "done" : `${seg.moveCount} moves`}
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground pb-3">
                    <p className="mb-2">{seg.description}</p>
                    {seg.moveCount > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {seg.moves.map((m, mi) => {
                          const globalIdx = segStart + mi;
                          return (
                            <button
                              key={mi}
                              type="button"
                              className={cn(
                                "rounded px-1.5 py-0.5 font-mono text-[10px] border",
                                globalIdx === globalMoveIndex
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border hover:bg-muted",
                              )}
                              onClick={() => seekToMove(globalIdx)}
                            >
                              {formatMove(m)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {currentMoveLabel ? (
                  <>
                    Next: <span className="font-mono text-foreground">{currentMoveLabel}</span>
                  </>
                ) : (
                  "Segment complete"
                )}
              </span>
              <span>
                {globalMoveIndex} / {totalMoves}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="grid grid-cols-4 gap-1">
            <Button size="sm" variant="outline" onClick={prevSegment} disabled={isBusy} title="Previous segment">
              <ChevronsLeft className="size-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={stepBack} disabled={isBusy || globalMoveIndex <= 0} title="Step back">
              <ChevronLeft className="size-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={stepForward} disabled={isBusy || globalMoveIndex >= totalMoves} title="Step forward">
              <ChevronRight className="size-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={nextSegment} disabled={isBusy} title="Next segment">
              <ChevronsRight className="size-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            {mode === "playing" ? (
              <Button size="sm" className="flex-1" onClick={pause} disabled={isBusy}>
                <Pause className="size-4 mr-1" /> Pause
              </Button>
            ) : (
              <Button size="sm" className="flex-1" onClick={play} disabled={isBusy || totalMoves === 0}>
                <Play className="size-4 mr-1" /> Play
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={stop} disabled={isBusy && mode === "idle"}>
              <Square className="size-4 mr-1" /> Stop
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
