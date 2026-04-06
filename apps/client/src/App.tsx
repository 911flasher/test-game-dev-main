import { useCallback, useEffect, useRef, useState } from 'react';
import { GamePhase } from '@crash/shared';
import { useGameSocket } from './hooks/use-game-socket.js';
import { useGameLoop } from './hooks/use-game-loop.js';
import { useGameStore } from './store/game-store.js';
import { usePlayerStore } from './store/player-store.js';
import { GameCanvas } from './canvas/GameCanvas.js';
import { RocketRive } from './rive/RocketRive.js';
import { MultiplierDisplay } from './components/hud/MultiplierDisplay.js';
import { RoundCountdown } from './components/hud/RoundCountdown.js';
import { BetPanel } from './components/hud/BetPanel.js';
import { PlayerList } from './components/social/PlayerList.js';
import { RoundHistory } from './components/history/RoundHistory.js';
import { VerifyModal } from './components/fairness/VerifyModal.js';

export function App() {
  const { send } = useGameSocket();
  useGameLoop();

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [verifyOpen, setVerifyOpen] = useState(false);

  const connected = useGameStore((s) => s.connected);
  const phase = useGameStore((s) => s.phase);
  const crashPoint = useGameStore((s) => s.crashPoint);

  // ResizeObserver for canvas container
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setCanvasSize({ width: Math.floor(width), height: Math.floor(height) });
      }
    });

    observer.observe(container);
    // Set initial size
    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setCanvasSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
    }

    return () => observer.disconnect();
  }, []);

  const handlePlaceBet = useCallback(
    (amount: number, autoCashout: number | undefined) => {
      const currentPhase = useGameStore.getState().phase;
      if (currentPhase !== GamePhase.WAITING && currentPhase !== GamePhase.COUNTDOWN) return;

      usePlayerStore.getState().placeBet(amount);
      send({ type: 'bet:place', amount, autoCashoutAt: autoCashout });
    },
    [send],
  );

  const handleCashOut = useCallback(() => {
    const { hasActiveBet } = usePlayerStore.getState();
    if (!hasActiveBet) return;

    send({ type: 'bet:cashout' });
  }, [send]);

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">
      {/* History bar */}
      <RoundHistory />

      {/* Main content */}
      <div className="flex flex-1 gap-4 p-4 min-h-0">
        {/* Canvas area */}
        <div
          ref={canvasContainerRef}
          className="flex-1 relative bg-gray-900/50 rounded-lg overflow-hidden"
        >
          <GameCanvas width={canvasSize.width} height={canvasSize.height} />
          <RocketRive />
          <MultiplierDisplay />
          <RoundCountdown />
        </div>

        {/* Sidebar */}
        <aside className="w-72 flex flex-col gap-3 shrink-0">
          <BetPanel onPlaceBet={handlePlaceBet} onCashOut={handleCashOut} />
          <PlayerList />
        </aside>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between px-4 py-2 bg-gray-900/50 border-t border-gray-800 text-xs text-gray-500">
        <div className="flex items-center gap-3">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              connected ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          />
          <span>
            {phase === GamePhase.CRASHED && crashPoint != null
              ? `Crashed at ${crashPoint.toFixed(2)}x`
              : `Phase: ${phase}`}
          </span>
        </div>
        <button
          onClick={() => setVerifyOpen(true)}
          className="text-gray-400 hover:text-cyan-400 transition-colors underline-offset-2 hover:underline"
        >
          Verify fairness
        </button>
      </footer>

      <VerifyModal isOpen={verifyOpen} onClose={() => setVerifyOpen(false)} />
    </div>
  );
}
