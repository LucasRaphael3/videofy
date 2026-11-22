import { getSupportedMimeType } from './videoProcessor';

/**
 * Creates a synthetic video cut for immediate demo testing
 */
export async function createSampleVideoCut({
  title = 'Clip 01 - Hook',
  durationSeconds = 3,
  bgColors = ['#1e1b4b', '#4338ca', '#312e81'],
  aspectRatio = '9:16', // '9:16' | '16:9'
}) {
  return new Promise((resolve) => {
    const width = aspectRatio === '9:16' ? 540 : 960;
    const height = aspectRatio === '9:16' ? 960 : 540;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const stream = canvas.captureStream(30);
    const mimeType = getSupportedMimeType();
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunks, { type: mimeType });
      const file = new File([blob], `${title.toLowerCase().replace(/\s+/g, '_')}.${ext}`, {
        type: mimeType,
      });
      canvas.remove();
      resolve(file);
    };

    recorder.start(100);

    const startTime = performance.now();
    const totalMs = durationSeconds * 1000;

    // Particle field for motion
    const particles = Array.from({ length: 24 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      speedX: (Math.random() - 0.5) * 3,
      speedY: Math.random() * 2 + 1,
      radius: Math.random() * 8 + 4,
      color: `hsla(${Math.random() * 60 + 200}, 80%, 70%, 0.6)`,
    }));

    function frame(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / totalMs);

      // 1. Dynamic Gradient Background
      const angle = (progress * Math.PI * 2);
      const grad = ctx.createLinearGradient(
        width / 2 + Math.cos(angle) * (width / 2),
        height / 2 + Math.sin(angle) * (height / 2),
        width / 2 - Math.cos(angle) * (width / 2),
        height / 2 - Math.sin(angle) * (height / 2)
      );
      grad.addColorStop(0, bgColors[0]);
      grad.addColorStop(0.5, bgColors[1]);
      grad.addColorStop(1, bgColors[2]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // 2. Animated Floating Particles
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.y > height) p.y = 0;
        if (p.x > width) p.x = 0;
        if (p.x < 0) p.x = width;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });

      // 3. Central Card Graphic
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(1 + Math.sin(progress * Math.PI * 4) * 0.04, 1 + Math.sin(progress * Math.PI * 4) * 0.04);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const cardW = width * 0.75;
      const cardH = height * 0.35;
      ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);
      ctx.fill();
      ctx.stroke();

      // Title Text
      ctx.font = `bold ${Math.round(width * 0.065)}px 'Inter', sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, 0, -cardH * 0.18);

      // Subtitle
      ctx.font = `500 ${Math.round(width * 0.038)}px 'Inter', sans-serif`;
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`Raw Cut [${aspectRatio}]`, 0, 0);

      // Timer ring
      ctx.beginPath();
      ctx.arc(0, cardH * 0.24, 22, -Math.PI / 2, (-Math.PI / 2) + (progress * Math.PI * 2));
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 5;
      ctx.stroke();

      ctx.font = `bold ${Math.round(width * 0.032)}px 'Inter', sans-serif`;
      ctx.fillStyle = '#c7d2fe';
      ctx.fillText(`${(durationSeconds - (elapsed / 1000)).toFixed(1)}s`, 0, cardH * 0.24);

      ctx.restore();

      if (elapsed < totalMs) {
        requestAnimationFrame(frame);
      } else {
        recorder.stop();
      }
    }

    requestAnimationFrame(frame);
  });
}

/**
 * Loads a bundle of 3 diverse sample cuts for immediate test
 */
export async function generateSampleBatch() {
  const file1 = await createSampleVideoCut({
    title: 'Cut 01 - Gameplay Viral',
    durationSeconds: 3,
    bgColors: ['#0f172a', '#3b82f6', '#1e1b4b'],
    aspectRatio: '9:16',
  });

  const file2 = await createSampleVideoCut({
    title: 'Cut 02 - Podcast Clip',
    durationSeconds: 3,
    bgColors: ['#311042', '#a855f7', '#180728'],
    aspectRatio: '9:16',
  });

  const file3 = await createSampleVideoCut({
    title: 'Cut 03 - Tutorial Snippet',
    durationSeconds: 3,
    bgColors: ['#022c22', '#10b981', '#064e3b'],
    aspectRatio: '9:16',
  });

  return [file1, file2, file3];
}
