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
}

interface StarFieldProps {
  width: number;
  height: number;
}

function createStars(width: number, height: number, count = 150): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 2 + 0.5,
    speed: Math.random() * 0.8 + 0.2,
    alpha: Math.random() * 0.7 + 0.3,
  }));
}

export function StarField({ width, height }: StarFieldProps) {
  const graphicsRef = useRef<Graphics | null>(null);
  const starsRef = useRef<Star[]>(createStars(width, height));

  const draw = useCallback(() => {
    const g = graphicsRef.current;
    if (!g) return;

    const { phase } = useGameStore.getState();
    const isFlying = phase === GamePhase.FLYING;

    // Scroll stars during flying
    if (isFlying) {
      for (const star of starsRef.current) {
        star.y += star.speed;
        if (star.y > height) {
          star.y = 0;
          star.x = Math.random() * width;
        }
      }
    }

    g.clear();

    for (const star of starsRef.current) {
      g.setFillStyle({ color: 0xffffff, alpha: star.alpha });
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
