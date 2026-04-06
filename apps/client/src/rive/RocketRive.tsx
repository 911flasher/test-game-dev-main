import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import { useEffect, useState } from 'react';
import { GamePhase } from '@crash/shared';
import { useGameStore } from '../store/game-store.js';

const ROCKET_SIZE = 80;

export function RocketRive() {
  const rocketPosition = useGameStore((s) => s.rocketPosition);
  const phase = useGameStore((s) => s.phase);
  const multiplier = useGameStore((s) => s.multiplier);
  const [hasError, setHasError] = useState(false);

  const { rive, RiveComponent } = useRive({
    src: '/rocket.riv',
    stateMachines: 'State Machine 1',
    autoplay: true,
    onLoadError: (e) => {
      console.error('[Rive] Load error:', e);
      setHasError(true);
    },
    onLoad: () => setHasError(false),
  });

  const fireInput = useStateMachineInput(rive, 'State Machine 1', 'fire');
  const rotationInput = useStateMachineInput(rive, 'State Machine 1', 'rotation');

  // Toggle fire thruster during flight
  useEffect(() => {
    if (!fireInput) return;
    fireInput.value = phase === GamePhase.FLYING;
  }, [phase, fireInput]);

  // Adjust rotation based on multiplier
  useEffect(() => {
    if (!rotationInput) return;
    if (phase === GamePhase.FLYING) {
      const normalized = Math.min(1, (multiplier - 1) / 9);
      rotationInput.value = normalized * 45;
    } else {
      rotationInput.value = 0;
    }
  }, [multiplier, phase, rotationInput]);

  const style: React.CSSProperties = {
    position: 'absolute',
    left: rocketPosition.x - ROCKET_SIZE / 2,
    top: rocketPosition.y - ROCKET_SIZE / 2,
    width: ROCKET_SIZE,
    height: ROCKET_SIZE,
    pointerEvents: 'none',
    transition: 'left 16ms linear, top 16ms linear',
  };

  if (hasError || !RiveComponent) {
    return (
      <div style={style} className="flex items-center justify-center text-3xl select-none">
        🚀
      </div>
    );
  }

  return (
    <div style={style}>
      <RiveComponent style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
