import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { applyMoves } from "../../cube/moves/apply";
import { cloneState, CubeState3x3 } from "../../cube/model/state-3x3";
import { formatMove } from "../../cube/moves/notation";
import {
  buildSolutionPlan,
  flattenPlan,
  locateInPlan,
  SolutionPlan,
} from "../../solvers/plan";
import type { CubeController } from "./use-cube-controller";

export type PlaybackMode = "idle" | "playing" | "paused";

export interface SolutionPlayback {
  plan: SolutionPlan | null;
  mode: PlaybackMode;
  globalMoveIndex: number;
  totalMoves: number;
  activeSegmentIndex: number;
  currentMoveLabel: string | null;
  buildPlan: () => SolutionPlan | null;
  play: () => void;
  pause: () => void;
  stop: () => void;
  stepForward: () => void;
  stepBack: () => void;
  nextSegment: () => void;
  prevSegment: () => void;
  jumpToSegment: (index: number) => void;
  seekToMove: (globalIndex: number) => void;
}

function resetPlaybackRefs(refs: {
  lastExecuted: { current: number | null };
  stepPending: { current: boolean };
  prevBusy: { current: boolean };
}) {
  refs.lastExecuted.current = null;
  refs.stepPending.current = false;
  refs.prevBusy.current = false;
}

/** Tutorial playback over a segmented beginner-method plan. */
export function useSolutionPlayback(controller: CubeController): SolutionPlayback {
  const [plan, setPlan] = useState<SolutionPlan | null>(null);
  const [mode, setMode] = useState<PlaybackMode>("idle");
  const [globalMoveIndex, setGlobalMoveIndex] = useState(0);

  const initialStateRef = useRef<CubeState3x3 | null>(null);
  const segmentStartsRef = useRef<number[]>([]);
  const prevBusyRef = useRef(false);
  const stepPendingRef = useRef(false);
  /** Prevents re-executing the same move when isBusy and globalMoveIndex update in one tick. */
  const lastExecutedRef = useRef<number | null>(null);

  const totalMoves = plan?.totalMoves ?? 0;
  const allMoves = plan ? flattenPlan(plan) : [];
  const safeIndex = totalMoves === 0 ? 0 : Math.min(globalMoveIndex, totalMoves - 1);
  const { segmentIndex: activeSegmentIndex } = plan
    ? locateInPlan(plan, safeIndex)
    : { segmentIndex: 0 };

  const currentMoveLabel =
    globalMoveIndex < allMoves.length ? formatMove(allMoves[globalMoveIndex]) : null;

  const rebuildSnapshots = useCallback((p: SolutionPlan, start: CubeState3x3) => {
    const starts: number[] = [];
    let offset = 0;
    for (const seg of p.segments) {
      starts.push(offset);
      offset += seg.moveCount;
    }
    segmentStartsRef.current = starts;
    initialStateRef.current = cloneState(start);
  }, []);

  const applyPosition = useCallback(
    (index: number) => {
      const initial = initialStateRef.current;
      if (!initial || !plan) return;
      controller.stop();
      const moves = allMoves.slice(0, index);
      if (moves.length === 0) {
        controller.loadState(initial);
      } else {
        controller.loadState(applyMoves(cloneState(initial), moves));
      }
      setGlobalMoveIndex(index);
      resetPlaybackRefs({
        lastExecuted: lastExecutedRef,
        stepPending: stepPendingRef,
        prevBusy: prevBusyRef,
      });
    },
    [allMoves, controller, plan],
  );

  const buildPlan = useCallback(() => {
    if (controller.isBusy) {
      toast.error("Wait for the cube to finish moving before building a plan.");
      return null;
    }
    controller.stop();
    const state = controller.getCanonicalState();
    if (!state) {
      toast.error("Tutorial playback requires a 3×3 cube.");
      return null;
    }
    const p = buildSolutionPlan(state);
    setPlan(p);
    rebuildSnapshots(p, state);
    controller.loadState(state);
    setGlobalMoveIndex(0);
    setMode("idle");
    resetPlaybackRefs({
      lastExecuted: lastExecutedRef,
      stepPending: stepPendingRef,
      prevBusy: prevBusyRef,
    });
    toast.success(`Plan built — ${p.totalMoves} moves in ${p.segments.length} stages.`);
    return p;
  }, [controller, rebuildSnapshots]);

  const play = useCallback(() => {
    if (!plan) return;
    if (globalMoveIndex >= totalMoves) {
      applyPosition(0);
    }
    lastExecutedRef.current = null;
    setMode("playing");
  }, [applyPosition, globalMoveIndex, plan, totalMoves]);

  const pause = useCallback(() => setMode("paused"), []);

  const stop = useCallback(() => {
    setMode("idle");
    controller.stop();
    if (initialStateRef.current) {
      controller.loadState(initialStateRef.current);
      setGlobalMoveIndex(0);
    }
    resetPlaybackRefs({
      lastExecuted: lastExecutedRef,
      stepPending: stepPendingRef,
      prevBusy: prevBusyRef,
    });
  }, [controller]);

  const stepForward = useCallback(() => {
    if (!plan || globalMoveIndex >= totalMoves) return;
    setMode("paused");
    stepPendingRef.current = true;
    lastExecutedRef.current = globalMoveIndex;
    controller.executeMove(formatMove(allMoves[globalMoveIndex]));
  }, [allMoves, controller, globalMoveIndex, plan, totalMoves]);

  const stepBack = useCallback(() => {
    if (!plan || globalMoveIndex <= 0) return;
    setMode("paused");
    applyPosition(globalMoveIndex - 1);
  }, [applyPosition, globalMoveIndex, plan]);

  const jumpToSegment = useCallback(
    (index: number) => {
      if (!plan) return;
      setMode("paused");
      applyPosition(segmentStartsRef.current[index] ?? 0);
    },
    [applyPosition, plan],
  );

  const nextSegment = useCallback(() => {
    if (!plan) return;
    jumpToSegment(Math.min(activeSegmentIndex + 1, plan.segments.length - 1));
  }, [activeSegmentIndex, jumpToSegment, plan]);

  const prevSegment = useCallback(() => {
    jumpToSegment(Math.max(0, activeSegmentIndex - 1));
  }, [activeSegmentIndex, jumpToSegment]);

  const seekToMove = useCallback(
    (index: number) => {
      if (!plan) return;
      setMode("paused");
      applyPosition(Math.max(0, Math.min(index, totalMoves)));
    },
    [applyPosition, plan, totalMoves],
  );

  // When a move finishes, advance the index (never re-fire the same move here).
  useEffect(() => {
    const wasBusy = prevBusyRef.current;
    prevBusyRef.current = controller.isBusy;
    if (!wasBusy || controller.isBusy) return;

    if (stepPendingRef.current) {
      stepPendingRef.current = false;
      setGlobalMoveIndex((i) => i + 1);
      return;
    }

    if (mode !== "playing") return;

    setGlobalMoveIndex((prev) => {
      const next = prev + 1;
      if (!plan) return next;

      const prevLoc = locateInPlan(plan, prev);
      const nextLoc = locateInPlan(plan, Math.min(next, Math.max(0, totalMoves - 1)));
      if (nextLoc.segmentIndex > prevLoc.segmentIndex && next <= totalMoves) {
        const seg = plan.segments[prevLoc.segmentIndex];
        setMode("paused");
        toast.success(`${seg.title} complete — press Play to continue.`);
      }
      if (next >= totalMoves && totalMoves > 0) {
        setMode("idle");
        toast.success("Tutorial complete — cube solved!");
      }
      return next;
    });
  }, [controller.isBusy, mode, plan, totalMoves]);

  // While playing, enqueue exactly one move per index (guarded by lastExecutedRef).
  useEffect(() => {
    if (mode !== "playing" || !plan || controller.isBusy) return;
    if (globalMoveIndex >= totalMoves) return;
    if (lastExecutedRef.current === globalMoveIndex) return;

    lastExecutedRef.current = globalMoveIndex;
    controller.executeMove(formatMove(allMoves[globalMoveIndex]));
  }, [mode, plan, controller.isBusy, globalMoveIndex, totalMoves, allMoves, controller]);

  return {
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
  };
}
