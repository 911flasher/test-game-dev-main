/**
 * Компонент RocketRive.
 * Назначение: Интеграция Rive-анимации (rocket.riv) в приложение.
 * Компонент отслеживает состояние игры (useGameStore) и передает 
 * нужные инпуты (Inputs) внутрь стейт-машины Rive для управления анимацией.
 */
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import { useEffect, useState } from 'react';
import { GamePhase } from '@crash/shared';
import { useGameStore } from '../store/game-store.js';

const ROCKET_SIZE = 80;

export function RocketRive() {
  // Получаем позицию ракеты с графика, текущую фазу и множитель
  const rocketPosition = useGameStore((s) => s.rocketPosition);
  const phase = useGameStore((s) => s.phase);
  const multiplier = useGameStore((s) => s.multiplier);
  const [hasError, setHasError] = useState(false);

  // Инициализируем Rive: загружаем .riv файл и подключаем State Machine
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

  // Получаем доступ к входным параметрам (Inputs) внутри Rive анимации
  const fireInput = useStateMachineInput(rive, 'State Machine 1', 'fire');
  const rotationInput = useStateMachineInput(rive, 'State Machine 1', 'rotation');

  // Включаем или выключаем пламя из сопла ракеты во время полета
  useEffect(() => {
    if (!fireInput) return;
    fireInput.value = phase === GamePhase.FLYING;
  }, [phase, fireInput]);

  // Меняем наклон ракеты в зависимости от множителя (скорости)
  useEffect(() => {
    if (!rotationInput) return;
    if (phase === GamePhase.FLYING) {
      // Динамический поворот ракеты: чем выше множитель, тем круче вверх
      const normalized = Math.min(1, (multiplier - 1) / 5);
      rotationInput.value = normalized * 60; 
    } else if (phase === GamePhase.CRASHED) {
      // При краше опускаем нос ракеты вниз
      rotationInput.value = -90;
    } else {
      rotationInput.value = 0;
    }
  }, [multiplier, phase, rotationInput]);

  const isCrashed = phase === GamePhase.CRASHED;
  const isWaiting = phase === GamePhase.WAITING;

  // Вычисляем CSS-ротацию всего контейнера ракеты на случай, 
  // если внутренняя Rive-ротация недостаточна или для fall-back иконки
  let containerRotation = 0;
  if (isCrashed) {
    containerRotation = 90;
  } else if (phase === GamePhase.FLYING) {
    containerRotation = Math.min(1, (multiplier - 1) / 5) * 45;
  } else if (isWaiting) {
    containerRotation = 0;
  }

  // Стили для позиционирования ракеты ровно по центру точки графика
  const style: React.CSSProperties = {
    position: 'absolute',
    left: rocketPosition.x - ROCKET_SIZE / 2,
    top: rocketPosition.y - ROCKET_SIZE / 2,
    width: ROCKET_SIZE,
    height: ROCKET_SIZE,
    pointerEvents: 'none',
    // Мы убрали сглаживание для left/top, чтобы ракета не отставала от Canvas
    transition: 'transform 0.3s ease-out, opacity 0.5s ease-out',
    // Применяем вращение и убираем (скейлим до 0) ракету при краше
    transform: `rotate(${-containerRotation}deg) scale(${isCrashed ? 0 : 1})`,
    opacity: isCrashed ? 0 : 1, // При краше ракета исчезает (ее заменяет взрыв из Canvas)
    filter: phase === GamePhase.FLYING ? `drop-shadow(0 0 10px rgba(34, 211, 238, 0.5))` : 'none',
  };

  // Если файл .riv не загрузился, показываем эмодзи в качестве заглушки (fallback)
  if (hasError || !RiveComponent) {
    return (
      <div style={style} className={`flex items-center justify-center text-5xl select-none ${isWaiting ? 'animate-bounce' : ''}`}>
        🚀
      </div>
    );
  }

  // Рендерим саму Rive компоненту
  return (
    <div style={style} className={isWaiting ? 'animate-pulse' : ''}>
      <RiveComponent style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
