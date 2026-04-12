import { useEffect, useMemo, useRef, useState } from 'react';
import { elapsedMsToMinute } from '../lib/timeMapping';
import { createLiveMatchEngine, stepLiveMatch } from '../lib/liveSimulationEngine';

const emptyVisual = {
  phase: 'kickoff',
  possession: 'home',
  flash: 0,
  home: { x: 250, y: 265, radius: 23, color: '#fff', accent: '#ccc', vx: 0, vy: 0, side: 'home' },
  away: { x: 650, y: 265, radius: 23, color: '#fff', accent: '#ccc', vx: 0, vy: 0, side: 'away' },
  ball: { x: 450, y: 265, radius: 6, trail: [] }
};

export const useSimulation = ({ mode, scriptedEvents, durationSec, homeTeam, awayTeam, randomSeed = 0 }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [activeEvent, setActiveEvent] = useState(null);
  const [score, setScore] = useState({ home: 0, away: 0 });
  const [visualState, setVisualState] = useState(emptyVisual);

  const rafRef = useRef(0);
  const startRef = useRef(0);
  const lastFrameRef = useRef(0);
  const eventQueueRef = useRef([]);
  const engineRef = useRef(null);

  const durationMs = useMemo(() => durationSec * 1000, [durationSec]);

  const initEngine = () => {
    engineRef.current = createLiveMatchEngine({ homeTeam, awayTeam, scriptedEvents, mode });
    setVisualState({ ...emptyVisual, ...engineRef.current && {
      home: engineRef.current.home,
      away: engineRef.current.away,
      ball: engineRef.current.ball,
      possession: engineRef.current.possession,
      phase: engineRef.current.phase
    } });
    setScore({ home: 0, away: 0 });
  };

  useEffect(() => {
    initEngine();
  }, [mode, scriptedEvents, durationSec, homeTeam, awayTeam, randomSeed]);

  useEffect(() => {
    if (!isRunning) return undefined;

    const tick = (now) => {
      if (!startRef.current) {
        startRef.current = now;
        lastFrameRef.current = now;
      }

      const frameDt = Math.min((now - lastFrameRef.current) / 1000, 0.08);
      lastFrameRef.current = now;

      const currentElapsed = now - startRef.current;
      const clampedElapsed = Math.min(currentElapsed, durationMs);
      setElapsedMs(clampedElapsed);

      const minute = elapsedMsToMinute(clampedElapsed, durationSec);
      const step = stepLiveMatch({
        engine: engineRef.current,
        dt: Math.max(frameDt, 0.016),
        minute,
        homeTeam,
        awayTeam
      });

      setVisualState(step.visual);
      setScore({ ...step.score });

      if (step.emittedEvents.length) {
        eventQueueRef.current = [...eventQueueRef.current, ...step.emittedEvents];
      }

      if (currentElapsed >= durationMs) {
        setIsRunning(false);
        setIsFinished(true);
        return;
      }

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafRef.current);
  }, [isRunning, durationMs, durationSec, homeTeam, awayTeam]);

  useEffect(() => {
    if (activeEvent || eventQueueRef.current.length === 0) return undefined;
    const [next, ...rest] = eventQueueRef.current;
    eventQueueRef.current = rest;
    setActiveEvent(next);
  }, [activeEvent, elapsedMs]);

  useEffect(() => {
    if (!activeEvent) return undefined;
    const t = setTimeout(() => setActiveEvent(null), activeEvent.type === 'goal' ? 2100 : 1400);
    return () => clearTimeout(t);
  }, [activeEvent]);

  const start = () => {
    setIsFinished(false);
    setIsRunning(true);
    setActiveEvent(null);
    eventQueueRef.current = [];
    startRef.current = 0;
    lastFrameRef.current = 0;
    initEngine();
  };

  const reset = () => {
    setIsRunning(false);
    setIsFinished(false);
    setElapsedMs(0);
    setActiveEvent(null);
    eventQueueRef.current = [];
    startRef.current = 0;
    lastFrameRef.current = 0;
    window.cancelAnimationFrame(rafRef.current);
    initEngine();
  };

  const currentMinute = elapsedMsToMinute(elapsedMs, durationSec);

  return {
    isRunning,
    isFinished,
    elapsedMs,
    currentMinute,
    score,
    activeEvent,
    visualState,
    start,
    reset
  };
};
