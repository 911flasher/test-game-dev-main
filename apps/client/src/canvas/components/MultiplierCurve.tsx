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

interface Point {
  t: number;
  m: number;
}

export function MultiplierCurve({ width, height }: MultiplierCurveProps) {
  const graphicsRef = useRef<Graphics | null>(null);
  const pointsRef = useRef<Point[]>([]);

  const tick = useCallback(() => {
    const g = graphicsRef.current;
    if (!g) return;

    const { phase, multiplier, roundStartedAt, setRocketPosition } =
      useGameStore.getState();

    const isFlying = phase === GamePhase.FLYING;
    const isCrashed = phase === GamePhase.CRASHED;

    if (!isFlying && !isCrashed) {
      g.clear();
      pointsRef.current = [];
      return;
    }

    const elapsedMs =
      roundStartedAt != null ? Date.now() - roundStartedAt : 0;

    if (isFlying) {
      // Add initial point
      if (pointsRef.current.length === 0) {
        pointsRef.current.push({ t: 0, m: 1.0 });
      }
      
      const lastPoint = pointsRef.current[pointsRef.current.length - 1];
      // Only push new points if enough time has passed (approx 60fps = 16ms)
      if (elapsedMs - lastPoint.t >= 16) {
        pointsRef.current.push({ t: elapsedMs, m: getMultiplierAtTime(elapsedMs) });
      }
      // Also ensure we have a point exactly at the current multiplier/time for smooth head
      // but don't commit it to the array permanently unless it meets the 16ms rule.
    }

    const viewport = calculateViewport(multiplier, Math.max(elapsedMs, 1000), width, height);

    g.clear();

    const color = isCrashed ? 0xef4444 : 0x22d3ee;

    // Build the render points for this frame
    const renderPoints = pointsRef.current.slice();
    if (isFlying) {
       // Append the exact current head to avoid jitter
       renderPoints.push({ t: elapsedMs, m: multiplier });
    }

    if (renderPoints.length === 0) return;

    // Batch convert world coordinates to screen coordinates once
    const screenPoints = renderPoints.map((p) =>
      worldToScreen(p.t, p.m, viewport, width, height)
    );

    const startPoint = screenPoints[0];
    const endPoint = screenPoints[screenPoints.length - 1];

    // 1. Draw area under curve
    g.beginPath();
    g.moveTo(startPoint.x, height); // Start from bottom left
    g.lineTo(startPoint.x, startPoint.y);
    for (let i = 1; i < screenPoints.length; i++) {
      g.lineTo(screenPoints[i].x, screenPoints[i].y);
    }
    g.lineTo(endPoint.x, height); // Line down to bottom right
    g.lineTo(startPoint.x, height); // Back to bottom left
    g.setFillStyle({ color, alpha: 0.15 });
    g.fill();

    // 2. Draw main glowing line (thicker, lower alpha)
    g.setStrokeStyle({ width: 8, color, alpha: 0.3 });
    g.beginPath();
    g.moveTo(startPoint.x, startPoint.y);
    for (let i = 1; i < screenPoints.length; i++) {
      g.lineTo(screenPoints[i].x, screenPoints[i].y);
    }
    g.stroke();

    // 3. Draw main sharp line
    g.setStrokeStyle({ width: 3, color, alpha: 1 });
    g.beginPath();
    g.moveTo(startPoint.x, startPoint.y);
    for (let i = 1; i < screenPoints.length; i++) {
      g.lineTo(screenPoints[i].x, screenPoints[i].y);
    }
    g.stroke();

    if (isFlying) {
      g.setFillStyle({ color: 0xffffff, alpha: 1 });
      g.circle(endPoint.x, endPoint.y, 4);
      g.fill();
      
      // Rocket position update
      setRocketPosition({ x: endPoint.x, y: endPoint.y });
    }
  }, [width, height]);

  useTick(tick);

  const drawCallback = useCallback((g: Graphics) => {
    graphicsRef.current = g;
  }, []);

  return <pixiGraphics draw={drawCallback} />;
}
