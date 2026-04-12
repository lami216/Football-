import { useEffect, useMemo, useRef, useState } from 'react';
import { elapsedMsToMinute } from '../lib/timeMapping';
import { buildTimeline, getScoreFromEvents } from '../lib/simulationEngine';

export const useSimulation = ({ mode, scriptedEvents, autoEvents, durationSec }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [activeEvent, setActiveEvent] = useState(null);

  const rafRef = useRef(0);
  const startRef = useRef(0);
  const offsetRef = useRef(0);
  const nextEventRef = useRef(0);

  const timeline = useMemo(
    () => buildTimeline({ mode, scriptedEvents, autoEvents, durationSec }),
    [mode, scriptedEvents, autoEvents, durationSec]
  );

  useEffect(() => {
    if (!isRunning) return undefined;

    const totalMs = durationSec * 1000;

    const tick = (now) => {
      if (!startRef.current) startRef.current = now;
      const currentElapsed = now - startRef.current + offsetRef.current;
      setElapsedMs(currentElapsed);

      while (timeline[nextEventRef.current] && timeline[nextEventRef.current].triggerMs <= currentElapsed) {
        setActiveEvent(timeline[nextEventRef.current]);
        nextEventRef.current += 1;
      }

      if (currentElapsed >= totalMs) {
        setElapsedMs(totalMs);
        setIsRunning(false);
        setIsFinished(true);
        return;
      }

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafRef.current);
  }, [isRunning, durationSec, timeline]);

  useEffect(() => {
    if (!activeEvent) return undefined;
    const t = setTimeout(() => setActiveEvent(null), activeEvent.type === 'goal' ? 1700 : 1300);
    return () => clearTimeout(t);
  }, [activeEvent]);

  const start = () => {
    setIsFinished(false);
    setIsRunning(true);
    startRef.current = 0;
  };

  const reset = () => {
    setIsRunning(false);
    setIsFinished(false);
    setElapsedMs(0);
    setActiveEvent(null);
    nextEventRef.current = 0;
    startRef.current = 0;
    offsetRef.current = 0;
    window.cancelAnimationFrame(rafRef.current);
  };

  useEffect(() => {
    reset();
  }, [mode, scriptedEvents, autoEvents, durationSec]);

  const currentMinute = elapsedMsToMinute(elapsedMs, durationSec);
  const score = getScoreFromEvents(timeline, elapsedMs);

  return {
    timeline,
    isRunning,
    isFinished,
    elapsedMs,
    currentMinute,
    score,
    activeEvent,
    start,
    reset
  };
};
