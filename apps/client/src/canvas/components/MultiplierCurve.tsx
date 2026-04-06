import { extend, useTick } from '@pixi/react';
import { Graphics } from 'pixi.js';
import { useCallback, useRef } from 'react';
import { GamePhase } from '@crash/shared';
import { useGameStore } from '../../store/game-store.js';
import {
  calculateViewport,
  getMultiplierAtTime,
  worldToScreen,
} from '../utils/curve-math.js';

extend({ Graphics });

interface MultiplierCurveProps {
  width: number;
  height: number;
}

export function MultiplierCurve({ width, height }: MultiplierCurveProps) {
  const graphicsRef = useRef<Graphics | null>(null);

  const tick = useCallback(() => {
    const g = graphicsRef.current;
    if (!g) return;

    const { phase, multiplier, roundStartedAt, setRocketPosition } =
      useGameStore.getState();

    const isFlying = phase === GamePhase.FLYING;
    const isCrashed = phase === GamePhase.CRASHED;

    if (!isFlying && !isCrashed) {
      g.clear();
      return;
    }

    const elapsedMs =
      roundStartedAt != null ? Date.now() - roundStartedAt : 0;

    const viewport = calculateViewport(multiplier, Math.max(elapsedMs, 1000), width, height);

    g.clear();

    const steps = 120;
    const color = isCrashed ? 0xef4444 : 0x22d3ee;
    
    // Draw area under curve
    g.beginPath();
    const startPoint = worldToScreen(0, 1.0, viewport, width, height);
    g.moveTo(startPoint.x, height); // Start from bottom
    g.lineTo(startPoint.x, startPoint.y);

    let lastX = startPoint.x;
    let lastY = startPoint.y;

    for (let i = 1; i <= steps; i++) {
      const t = (i / steps) * elapsedMs;
      const m = getMultiplierAtTime(t);
      if (m > multiplier + 0.05) break;
      const { x, y } = worldToScreen(t, m, viewport, width, height);
      g.lineTo(x, y);
      lastX = x;
      lastY = y;
    }
    g.lineTo(lastX, height);
    g.lineTo(startPoint.x, height);
    
    // Transparent fill for the area
    g.setFillStyle({ color, alpha: 0.15 });
    g.fill();

    // Draw main glowing line (thicker, lower alpha)
    g.setStrokeStyle({ width: 8, color, alpha: 0.3 });
    g.beginPath();
    g.moveTo(startPoint.x, startPoint.y);
    for (let i = 1; i <= steps; i++) {
      const t = (i / steps) * elapsedMs;
      const m = getMultiplierAtTime(t);
      if (m > multiplier + 0.05) break;
      const { x, y } = worldToScreen(t, m, viewport, width, height);
      g.lineTo(x, y);
    }
    g.stroke();

    // Draw main sharp line
    g.setStrokeStyle({ width: 3, color, alpha: 1 });
    g.beginPath();
    g.moveTo(startPoint.x, startPoint.y);
    for (let i = 1; i <= steps; i++) {
      const t = (i / steps) * elapsedMs;
      const m = getMultiplierAtTime(t);
      if (m > multiplier + 0.05) break;
      const { x, y } = worldToScreen(t, m, viewport, width, height);
      g.lineTo(x, y);
    }
    g.stroke();

    if (isFlying) {
      g.setFillStyle({ color: 0xffffff, alpha: 1 });
      g.circle(lastX, lastY, 4);
      g.fill();
      
      // Rocket position update
      setRocketPosition({ x: lastX, y: lastY });
    }
  }, [width, height]);

  useTick(tick);

  const drawCallback = useCallback((g: Graphics) => {
    graphicsRef.current = g;
  }, []);

  return <pixiGraphics draw={drawCallback} />;
}
