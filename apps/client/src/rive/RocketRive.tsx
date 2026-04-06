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
      // Dynamic rotation based on multiplier speed
      const normalized = Math.min(1, (multiplier - 1) / 5);
      rotationInput.value = normalized * 60; // Pitch up as it goes faster
    } else if (phase === GamePhase.CRASHED) {
      // Point down heavily on crash
      rotationInput.value = -90;
    } else {
      rotationInput.value = 0;
    }
  }, [multiplier, phase, rotationInput]);

  const isCrashed = phase === GamePhase.CRASHED;
  const isWaiting = phase === GamePhase.WAITING;

  // Compute CSS rotation for fallback or entire container
  let containerRotation = 0;
  if (isCrashed) {
    containerRotation = 90; // Fallback spin
  } else if (phase === GamePhase.FLYING) {
    containerRotation = Math.min(1, (multiplier - 1) / 5) * 45;
  } else if (isWaiting) {
    // Idle float effect for waiting could be done via keyframes, but static rotation here is 0
    containerRotation = 0;
  }

  const style: React.CSSProperties = {
    position: 'absolute',
    left: rocketPosition.x - ROCKET_SIZE / 2,
    top: rocketPosition.y - ROCKET_SIZE / 2,
    width: ROCKET_SIZE,
    height: ROCKET_SIZE,
    pointerEvents: 'none',
    transition: 'left 16ms linear, top 16ms linear, transform 0.3s ease-out, opacity 0.5s ease-out',
    transform: `rotate(${-containerRotation}deg) scale(${isCrashed ? 0 : 1})`,
    opacity: isCrashed ? 0 : 1, // Hide rocket on crash (explosion takes over)
    filter: phase === GamePhase.FLYING ? `drop-shadow(0 0 10px rgba(34, 211, 238, 0.5))` : 'none',
  };

  if (hasError || !RiveComponent) {
    return (
      <div style={style} className={`flex items-center justify-center text-5xl select-none ${isWaiting ? 'animate-bounce' : ''}`}>
        🚀
      </div>
    );
  }

  return (
    <div style={style} className={isWaiting ? 'animate-pulse' : ''}>
      <RiveComponent style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
