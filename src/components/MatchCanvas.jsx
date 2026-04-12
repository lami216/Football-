import { useEffect, useMemo, useRef } from 'react';
import { drawField, drawToken } from '../canvas/renderMatch';

const makeToken = (team, isHome, width, height) => ({
  x: isHome ? width * 0.3 : width * 0.7,
  y: height * 0.5,
  vx: (Math.random() - 0.5) * 1.3,
  vy: (Math.random() - 0.5) * 1.2,
  radius: 22,
  color: team.primaryColor,
  accent: team.secondaryColor,
  side: isHome ? 'home' : 'away'
});

export default function MatchCanvas({ homeTeam, awayTeam, activeEvent, isRunning, finished }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const homeImage = useMemo(() => Object.assign(new Image(), { src: homeTeam.logo }), [homeTeam.logo]);
  const awayImage = useMemo(() => Object.assign(new Image(), { src: awayTeam.logo }), [awayTeam.logo]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');

    const width = canvas.width;
    const height = canvas.height;
    const tokens = [makeToken(homeTeam, true, width, height), makeToken(awayTeam, false, width, height)];

    const animate = () => {
      drawField(ctx, width, height);
      tokens.forEach((token) => {
        token.vx += (Math.random() - 0.5) * 0.12;
        token.vy += (Math.random() - 0.5) * 0.12;

        if (activeEvent && activeEvent.team === token.side) {
          const targetX = token.side === 'home' ? width - 45 : 45;
          token.vx += (targetX - token.x) * 0.0009;
          token.vy += (height / 2 - token.y) * 0.0006;
        }

        token.vx = Math.max(-2.2, Math.min(2.2, token.vx));
        token.vy = Math.max(-2.1, Math.min(2.1, token.vy));
        token.x += token.vx;
        token.y += token.vy;

        const minX = token.side === 'home' ? 30 : width * 0.45;
        const maxX = token.side === 'home' ? width * 0.55 : width - 30;

        if (token.x < minX || token.x > maxX) token.vx *= -1;
        if (token.y < 30 || token.y > height - 30) token.vy *= -1;

        const img = token.side === 'home' ? homeImage : awayImage;
        const burst = activeEvent && activeEvent.team === token.side && activeEvent.type !== 'yellow_card' && activeEvent.type !== 'red_card';
        drawToken(ctx, token, img, burst);
      });

      if (!finished) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [homeTeam, awayTeam, activeEvent, homeImage, awayImage, finished, isRunning]);

  return <canvas ref={canvasRef} className="match-canvas" width={900} height={530} />;
}
