import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import { useEffect, useState } from 'react';
import { GamePhase } from '@crash/shared';
import { useGameStore } from '../store/game-store.js';

const ROCKET_RIV_SRC = '/rocket.riv';
const STATE_MACHINE_NAME = 'State Machine 1';

export interface RocketRiveResult {
  RiveComponent: React.ComponentType<React.HTMLAttributes<HTMLCanvasElement>> | null;
  isLoaded: boolean;
  hasError: boolean;
}

export function useRocketRive(): RocketRiveResult {
  const phase = useGameStore((s) => s.phase);
  const multiplier = useGameStore((s) => s.multiplier);
  const [hasError, setHasError] = useState(false);

  const { rive, RiveComponent } = useRive({
    src: ROCKET_RIV_SRC,
    stateMachines: STATE_MACHINE_NAME,
    autoplay: true,
    onLoadError: () => setHasError(true),
    onLoad: () => setHasError(false),
  });

  const fireInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'fire');
  const rotationInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'rotation');

  useEffect(() => {
    if (!fireInput) return;
    fireInput.value = phase === GamePhase.FLYING;
  }, [phase, fireInput]);

  useEffect(() => {
    if (!rotationInput) return;
    if (phase === GamePhase.FLYING) {
      const normalized = Math.min(1, (multiplier - 1) / 9);
      rotationInput.value = normalized * 45;
    } else {
      rotationInput.value = 0;
    }
  }, [multiplier, phase, rotationInput]);

  const isLoaded = rive != null && !hasError;

  return {
    RiveComponent: isLoaded ? (RiveComponent as React.ComponentType<React.HTMLAttributes<HTMLCanvasElement>>) : null,
    isLoaded,
    hasError,
  };
}
