import { useRef, useEffect, useCallback } from 'react';

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3',
  '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA',
];

export default function SpinWheel({ options, spinning, onSpinEnd }) {
  const canvasRef = useRef(null);
  const rotationRef = useRef(0);
  const animRef = useRef(null);

  const segmentAngle = (2 * Math.PI) / options.length;

  const draw = useCallback((rotation) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 4;

    ctx.clearRect(0, 0, size, size);

    options.forEach((option, i) => {
      const startAngle = rotation + i * segmentAngle;
      const endAngle = startAngle + segmentAngle;

      // Segment
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startAngle + segmentAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#1a1a2e';
      ctx.font = `bold ${Math.max(10, Math.min(14, 160 / options.length))}px "Inter", sans-serif`;
      ctx.fillText(truncate(option, 22), radius - 14, 5);
      ctx.restore();
    });

    // Centre circle
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Pointer (right side)
    ctx.beginPath();
    ctx.moveTo(size - 2, cy - 14);
    ctx.lineTo(size - 2, cy + 14);
    ctx.lineTo(size - 28, cy);
    ctx.closePath();
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [options, segmentAngle]);

  // Initial draw
  useEffect(() => {
    draw(rotationRef.current);
  }, [draw]);

  // Resize canvas for crisp rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const size = Math.min(parent.offsetWidth, 420);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    canvas.getContext('2d').scale(dpr, dpr);
    // redraw after resize — use logical size
    canvas.width = size;
    canvas.height = size;
    draw(rotationRef.current);
  }, [draw]);

  // Spin animation
  useEffect(() => {
    if (!spinning) return;

    const totalRotation = Math.PI * 2 * (5 + Math.random() * 5); // 5-10 full spins
    const duration = 4000;
    const start = performance.now();
    const startRotation = rotationRef.current;

    const animate = (now) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const ease = 1 - Math.pow(1 - t, 3);
      const currentRotation = startRotation + totalRotation * ease;

      rotationRef.current = currentRotation;
      draw(currentRotation);

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        // Determine winner — pointer is at angle 0 (right side)
        const normalisedRotation = ((currentRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        // The pointer points right (angle 0). Segments go clockwise from rotation.
        // We need to find which segment is at angle 0 (2*PI - normalisedRotation)
        const pointerAngle = (2 * Math.PI - normalisedRotation) % (2 * Math.PI);
        const winnerIndex = Math.floor(pointerAngle / segmentAngle) % options.length;
        onSpinEnd(options[winnerIndex]);
      }
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [spinning, draw, segmentAngle, options, onSpinEnd]);

  return (
    <div className="wheel-container">
      <canvas ref={canvasRef} className="wheel-canvas" />
    </div>
  );
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}
