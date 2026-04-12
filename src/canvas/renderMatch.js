export const drawField = (ctx, width, height, flash = 0) => {
  ctx.clearRect(0, 0, width, height);

  const grass = ctx.createLinearGradient(0, 0, 0, height);
  grass.addColorStop(0, '#0f7d3f');
  grass.addColorStop(1, '#0a5f2f');
  ctx.fillStyle = grass;
  ctx.fillRect(0, 0, width, height);

  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${flash * 0.12})`;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  for (let i = 1; i < 8; i += 1) {
    ctx.strokeStyle = i % 2 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
    ctx.beginPath();
    ctx.moveTo(20, 20 + ((height - 40) / 8) * i);
    ctx.lineTo(width - 20, 20 + ((height - 40) / 8) * i);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
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
  if (hasPossession) {
    ctx.fillStyle = `${token.color}66`;
    ctx.beginPath();
    ctx.arc(token.x, token.y, token.radius + 9, 0, Math.PI * 2);
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

export const drawBall = (ctx, ball) => {
  ball.trail?.forEach((point, index) => {
    ctx.fillStyle = `rgba(255,255,255,${0.16 + point.life * 0.22})`;
    ctx.beginPath();
    ctx.arc(point.x, point.y, Math.max(1.5, 4 - index * 0.35), 0, Math.PI * 2);
    ctx.fill();
  });

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
