import { extend, useTick } from '@pixi/react';
import { Container } from 'pixi.js';
import { useEffect, useRef } from 'react';
import { GamePhase } from '@crash/shared';
import { useGameStore } from '../../store/game-store.js';
import { StarField } from './StarField.js';
import { MultiplierCurve } from '../components/MultiplierCurve.js';
import { Explosion } from '../components/Explosion.js';

extend({ Container });

interface CrashSceneProps {
  width: number;
  height: number;
}

export function CrashScene({ width, height }: CrashSceneProps) {
  const containerRef = useRef<Container | null>(null);
  const shakeIntensityRef = useRef(0);

  useEffect(() => {
    return useGameStore.subscribe((state, prevState) => {
      if (state.phase === GamePhase.CRASHED && prevState.phase !== GamePhase.CRASHED) {
        shakeIntensityRef.current = 15; // Max shake
      }
    });
  }, []);

  useTick(() => {
    const container = containerRef.current;
    if (!container) return;

    if (shakeIntensityRef.current > 0) {
      container.x = (Math.random() - 0.5) * shakeIntensityRef.current;
      container.y = (Math.random() - 0.5) * shakeIntensityRef.current;
      shakeIntensityRef.current *= 0.9; // decay
      if (shakeIntensityRef.current < 0.5) {
        shakeIntensityRef.current = 0;
        container.x = 0;
        container.y = 0;
      }
    } else {
      container.x = 0;
      container.y = 0;
    }
  });

  return (
    <pixiContainer ref={containerRef}>
      <StarField width={width} height={height} />
      <MultiplierCurve width={width} height={height} />
      <Explosion />
    </pixiContainer>
  );
}
