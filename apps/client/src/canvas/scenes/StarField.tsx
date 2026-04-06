import { extend, useTick } from '@pixi/react';
import { Graphics } from 'pixi.js';
import { useCallback, useRef } from 'react';
import { GamePhase } from '@crash/shared';
import { useGameStore } from '../../store/game-store.js';

extend({ Graphics });

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
  layer: number;
  color: number;
}

interface StarFieldProps {
  width: number;
  height: number;
}

const STAR_COLORS = [0xffffff, 0xd0e1f9, 0xffd700, 0xffb6c1, 0x87ceeb];

function createStars(width: number, height: number, count = 250): Star[] {
  return Array.from({ length: count }, () => {
    // 1 = back (slow), 2 = middle, 3 = front (fast)
    const layer = Math.random() > 0.8 ? 3 : Math.random() > 0.4 ? 2 : 1;
    const baseSpeed = layer * 0.4;
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      size: (Math.random() * 1.5 + 0.5) * layer,
      speed: baseSpeed + Math.random() * 0.2,
      alpha: layer === 3 ? Math.random() * 0.5 + 0.5 : layer === 2 ? Math.random() * 0.4 + 0.2 : Math.random() * 0.3 + 0.1,
      layer,
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
    };
  });
}

export function StarField({ width, height }: StarFieldProps) {
  const graphicsRef = useRef<Graphics | null>(null);
  const starsRef = useRef<Star[]>(createStars(width, height));

  const draw = useCallback(() => {
    const g = graphicsRef.current;
    if (!g) return;

    const { phase, multiplier } = useGameStore.getState();
    const isFlying = phase === GamePhase.FLYING;
    const isCrashed = phase === GamePhase.CRASHED;

    // Scroll stars during flying
    if (isFlying || isCrashed) {
      const speedMultiplier = isCrashed ? 0.1 : 1 + (multiplier * 0.1);
      for (const star of starsRef.current) {
        star.y += star.speed * speedMultiplier;
        if (star.y > height) {
          star.y = 0;
          star.x = Math.random() * width;
        }
      }
    }

    g.clear();

    // Simple nebula glow effect
    const nebulaGradient = 0x110033; // Dark purple tint
    g.setFillStyle({ color: nebulaGradient, alpha: 0.1 });
    g.rect(0, 0, width, height);
    g.fill();

    for (const star of starsRef.current) {
      g.setFillStyle({ color: star.color, alpha: star.alpha });
      g.circle(star.x, star.y, star.size);
      g.fill();
    }
  }, [width, height]);

  useTick(draw);

  const drawCallback = useCallback((g: Graphics) => {
    graphicsRef.current = g;
  }, []);

  return <pixiGraphics draw={drawCallback} />;
}
