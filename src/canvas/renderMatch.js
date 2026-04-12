export const drawField = (ctx, width, height, flash = 0, pulse = 0) => {
  ctx.clearRect(0, 0, width, height);

  const grass = ctx.createLinearGradient(0, 0, width, height);
  grass.addColorStop(0, '#1ca153');
  grass.addColorStop(0.5, '#138645');
  grass.addColorStop(1, '#0f733b');
  ctx.fillStyle = grass;
  ctx.fillRect(0, 0, width, height);

  // subtle bright pitch bands (no dark artifacts)
  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  for (let i = 0; i < 6; i += 1) {
    if (i % 2 === 0) {
      ctx.fillRect(20, 20 + ((height - 40) / 6) * i, width - 40, (height - 40) / 6);
    }
  }

  if (pulse > 0) {
    const centerGlow = ctx.createRadialGradient(width / 2, height / 2, 30, width / 2, height / 2, width * 0.8);
    centerGlow.addColorStop(0, `rgba(255,255,255,${pulse * 0.16})`);
    centerGlow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = centerGlow;
    ctx.fillRect(0, 0, width, height);
  }

  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${flash * 0.12})`;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  ctx.beginPath();
  ctx.moveTo(width / 2, 20);
  ctx.lineTo(width / 2, height - 20);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 55, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeRect(20, height / 2 - 80, 70, 160);
  ctx.strokeRect(width - 90, height / 2 - 80, 70, 160);

  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.strokeRect(8, height / 2 - 55, 12, 110);
  ctx.strokeRect(width - 20, height / 2 - 55, 12, 110);
};

export const drawToken = (ctx, token, logoImage, hasPossession) => {
  const glowStrength = hasPossession ? Math.max(0.35, token.possessionGlow || 0.4) : (token.possessionGlow || 0) * 0.5;

  if (glowStrength > 0.08) {
    ctx.fillStyle = `${token.color}${Math.floor(90 * glowStrength).toString(16).padStart(2, '0')}`;
    ctx.beginPath();
    ctx.arc(token.x, token.y, token.radius + 9 + glowStrength * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = token.color;
  ctx.beginPath();
  ctx.arc(token.x, token.y, token.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = token.accent;
  ctx.lineWidth = 2;
  ctx.stroke();

  if (logoImage && logoImage.complete) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(token.x, token.y, token.radius - 3, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImage, token.x - token.radius + 3, token.y - token.radius + 3, (token.radius - 3) * 2, (token.radius - 3) * 2);
    ctx.restore();
  }
};

export const drawImpacts = (ctx, impacts = []) => {
  impacts.forEach((impact) => {
    const alpha = impact.life * (0.2 + impact.intensity * 0.45);
    ctx.strokeStyle = `rgba(255,240,170,${alpha})`;
    ctx.lineWidth = 2 + impact.intensity * 2;
    ctx.beginPath();
    ctx.arc(impact.x, impact.y, 8 + (1 - impact.life) * 24 * impact.intensity, 0, Math.PI * 2);
    ctx.stroke();
  });
};

export const drawBall = (ctx, ball, burst = 0) => {
  const topSpeed = Math.max(0, ...ball.trail.map((point) => point.speed || 0));

  ball.trail?.forEach((point, index) => {
    const speedFactor = Math.min(1, (point.speed || 0) / 250);
    const alpha = 0.12 + point.life * (0.2 + speedFactor * 0.35);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(point.x, point.y, Math.max(1.5, 4.8 - index * 0.27 + speedFactor), 0, Math.PI * 2);
    ctx.fill();
  });

  if (topSpeed > 165 || burst > 0.15) {
    ctx.strokeStyle = `rgba(190,230,255,${0.16 + Math.min(0.32, burst * 0.4)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(ball.x - ball.vx * 0.05, ball.y - ball.vy * 0.05);
    ctx.stroke();
  }

  ctx.fillStyle = '#f8f8ff';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#101010';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.arc(ball.x + 1, ball.y - 1, ball.radius * 0.45, 0, Math.PI * 2);
  ctx.fill();
};
