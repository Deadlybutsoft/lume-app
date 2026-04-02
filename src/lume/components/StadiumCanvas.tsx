import { useRef, useEffect, useState, useMemo } from 'react';
import { isPixelActive } from '../utils/lightUtils';
import { EVENT_CONFIGS } from '../constants';
import type { LightMode, SectionTarget } from '../types';

interface StadiumCanvasProps {
  mode: LightMode;
  color: string;
  message?: string;
  target?: SectionTarget;
  layout?: 'SPORT' | 'CONCERT';
  musicIntensity?: number;
  textStartTime?: number;
}

interface SeatPosition {
  id: string;
  r: number;
  c: number;
  x: number;
  y: number;
}

export function StadiumCanvas({
  mode,
  color,
  message = '',
  target = 'ALL',
  layout = 'SPORT',
  musicIntensity = 0,
  textStartTime = 0
}: StadiumCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // 1. Calculate Geometry (LUME-NOW High-Fidelity Logic)
  const seats = useMemo(() => {
    const config = EVENT_CONFIGS[layout || 'SPORT'];
    const { rows: totalRows, cols: totalCols } = config;
    const calculatedSeats: SeatPosition[] = [];

    const straightLength = 300;
    const innerRadius = 80;
    const rowSpacing = 4.5;
    const straightCols = Math.floor(totalCols / 6);
    const curveCols = Math.floor(totalCols / 3);

    const isConcert = layout === 'CONCERT';
    const fieldRows = isConcert ? 16 : 0;

    for (let r = 0; r < totalRows; r++) {
      if (isConcert && r < fieldRows) {
        // Field layout (Concert)
        const startX = -120, endX = 120, startY = -60, endY = 60;
        for (let c = 0; c < totalCols; c++) {
          const x = startX + (c / (totalCols - 1)) * (endX - startX);
          const y = startY + (r / (fieldRows - 1)) * (endY - startY);
          if (Math.sqrt(x * x + y * y) > 25) { // Stage void
            calculatedSeats.push({ id: `${r}-${c}`, r, c, x, y });
          }
        }
      } else {
        // Stands layout
        const standR = r - fieldRows;
        const radius = innerRadius + (standR * rowSpacing);
        for (let c = 0; c < totalCols; c++) {
          let x = 0, y = 0;
          if (c < straightCols) { // Bottom Straight
            x = -straightLength / 2 + (c / (straightCols - 1) * straightLength);
            y = radius;
          } else if (c < straightCols + curveCols) { // Right Curve
            const angle = (Math.PI / 2) + ((c - straightCols) / (curveCols - 1) * -Math.PI);
            x = (straightLength / 2) + (radius * Math.cos(angle));
            y = radius * Math.sin(angle);
          } else if (c < (straightCols * 2) + curveCols) { // Top Straight
            x = (straightLength / 2) - ((c - (straightCols + curveCols)) / (straightCols - 1) * straightLength);
            y = -radius;
          } else { // Left Curve
            const angle = (-Math.PI / 2) + ((c - ((straightCols * 2) + curveCols)) / (curveCols - 1) * -Math.PI);
            x = (-straightLength / 2) + (radius * Math.cos(angle));
            y = radius * Math.sin(angle);
          }
          calculatedSeats.push({ id: `${r}-${c}`, r, c, x, y });
        }
      }
    }
    return calculatedSeats;
  }, [layout]);

  // 2. Responsive Handler
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 3. Animation State Ref (Performance)
  const stateRef = useRef({ mode, color, message, target, layout, musicIntensity, textStartTime });
  useEffect(() => {
    stateRef.current = { mode, color, message, target, layout, musicIntensity, textStartTime };
  }, [mode, color, message, target, layout, musicIntensity, textStartTime]);

  // 4. Drawing Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const scale = Math.min(dimensions.width / 600, dimensions.height / 400) * 0.9;

    let animId: number;
    const render = (time: number) => {
      const { mode, color, message, target, layout, musicIntensity, textStartTime } = stateRef.current;
      const config = EVENT_CONFIGS[layout || 'SPORT'];
      const { rows, cols } = config;

      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // Draw Stadium Markings
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(scale, scale);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-150, -80, 300, 160, 10);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -80); ctx.lineTo(0, 80); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.stroke();

      if (layout === 'CONCERT') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; ctx.stroke();
      }
      ctx.restore();

      // Draw Pixels
      seats.forEach(seat => {
        const active = isPixelActive(
          seat.r, seat.c, rows, cols, mode, time,
          target, message, textStartTime, musicIntensity
        );

        const px = centerX + (seat.x * scale);
        const py = centerY + (seat.y * scale);

        if (active) {
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(px, py, 1.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.beginPath();
          ctx.arc(px, py, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [seats, dimensions]);

  return (
    <div ref={containerRef} className="w-full h-full relative select-none">
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      <div className="absolute inset-0 pointer-events-none text-[9px] font-black font-outfit text-white/10 uppercase tracking-[0.4em]">
        <div className="absolute top-4 left-1/2 -translate-x-1/2">North End</div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">South End</div>
        <div className="absolute left-6 top-1/2 -translate-y-1/2 -rotate-90">West Stand</div>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 rotate-90">East Stand</div>
      </div>
    </div>
  );
}