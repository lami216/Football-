import { useEffect, useMemo, useRef } from 'react';
import { drawBall, drawField, drawToken } from '../canvas/renderMatch';

export default function MatchCanvas({ homeTeam, awayTeam, visualState }) {
  const canvasRef = useRef(null);
  const homeImage = useMemo(() => Object.assign(new Image(), { src: homeTeam.logo }), [homeTeam.logo]);
  const awayImage = useMemo(() => Object.assign(new Image(), { src: awayTeam.logo }), [awayTeam.logo]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    drawField(ctx, width, height, visualState.flash);
    drawToken(ctx, visualState.home, homeImage, visualState.possession === 'home');
    drawToken(ctx, visualState.away, awayImage, visualState.possession === 'away');
    drawBall(ctx, visualState.ball);
  }, [visualState, homeImage, awayImage]);

  return <canvas ref={canvasRef} className="match-canvas" width={900} height={530} />;
}
