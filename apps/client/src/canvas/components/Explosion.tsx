import { extend, useTick } from '@pixi/react';
import { Graphics } from 'pixi.js';
import { useCallback, useEffect, useRef } from 'react';
import { GamePhase } from '@crash/shared';
import { useGameStore } from '../../store/game-store.js';

extend({ Graphics });

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  life: number;
  color: number;
  size: number;
}

export function Explosion() {
  const graphicsRef = useRef<Graphics | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const hasExplodedRef = useRef(false);

  useEffect(() => {
    return useGameStore.subscribe((state, prevState) => {
      if (state.phase === GamePhase.CRASHED && prevState.phase !== GamePhase.CRASHED) {
        // Create explosion
        const pos = state.rocketPosition;
        hasExplodedRef.current = true;
        const particles: Particle[] = [];
        const colors = [0xff4444, 0xffaa00, 0xffffff, 0xff7700];
        
        for (let i = 0; i < 60; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 12 + 2;
          particles.push({
            x: pos.x,
            y: pos.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            life: Math.random() * 0.8 + 0.2,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 5 + 2,
          });
        }
        particlesRef.current = particles;
      } else if (state.phase === GamePhase.WAITING && prevState.phase === GamePhase.CRASHED) {
        hasExplodedRef.current = false;
        particlesRef.current = [];
      }
    });
  }, []);

  const draw = useCallback((_delta: number) => {
    const g = graphicsRef.current;
    if (!g) return;

    if (!hasExplodedRef.current || particlesRef.current.length === 0) {
      g.clear();
      return;
    }

    g.clear();
    const dt = 1/60;

    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3; // subtle gravity effect
      p.life -= dt;
      p.alpha = Math.max(0, p.life);
      
      if (p.life <= 0) {
        particlesRef.current.splice(i, 1);
        continue;
      }

      g.setFillStyle({ color: p.color, alpha: p.alpha });
      g.circle(p.x, p.y, p.size * Math.max(0.1, p.alpha));
      g.fill();
    }
  }, []);

  useTick(draw);

  const drawCallback = useCallback((g: Graphics) => {
    graphicsRef.current = g;
  }, []);

  return <pixiGraphics draw={drawCallback} />;
}