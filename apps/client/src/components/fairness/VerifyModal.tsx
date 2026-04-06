import { useEffect, useState } from 'react';
import { sha256 } from '@crash/shared';
import { useGameStore } from '../../store/game-store.js';

interface VerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type VerifyStatus = 'idle' | 'verifying' | 'valid' | 'invalid' | 'unavailable';

export function VerifyModal({ isOpen, onClose }: VerifyModalProps) {
  const { roundId, crashPoint, serverSeed, roundHistory } = useGameStore();
  const [status, setStatus] = useState<VerifyStatus>('idle');
  const [computedHash, setComputedHash] = useState<string | null>(null);

  // Find the next round's hash from history (for verification)
  const latestRound = roundHistory[0];
  const previousRound = roundHistory[1];

  useEffect(() => {
    if (!isOpen) {
      setStatus('idle');
      setComputedHash(null);
      return;
    }

    if (!serverSeed || !latestRound?.hash) {
      setStatus('unavailable');
      return;
    }

    setStatus('verifying');

    sha256(serverSeed)
      .then((computed) => {
        setComputedHash(computed);
        const isValid = computed === latestRound.hash;
        setStatus(isValid ? 'valid' : 'invalid');
      })
      .catch(() => setStatus('invalid'));
  }, [isOpen, serverSeed, latestRound, previousRound]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Verify Round Fairness</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 text-sm">
          {/* Round ID */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">
              Round ID
            </label>
            <code className="block bg-gray-800 rounded-lg px-3 py-2 text-cyan-300 font-mono text-xs break-all">
              {roundId ?? latestRound?.roundId ?? '—'}
            </code>
          </div>

          {/* Server Seed */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">
              Server Seed (revealed after crash)
            </label>
            <code className="block bg-gray-800 rounded-lg px-3 py-2 text-yellow-300 font-mono text-xs break-all">
              {serverSeed ?? '—'}
            </code>
          </div>

          {/* Round Hash */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">
              Round Hash
            </label>
            <code className="block bg-gray-800 rounded-lg px-3 py-2 text-purple-300 font-mono text-xs break-all">
              {latestRound?.hash ?? '—'}
            </code>
          </div>

          {/* Crash point */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">
              Crash Point
            </label>
            <code className="block bg-gray-800 rounded-lg px-3 py-2 text-white font-mono text-xs">
              {crashPoint != null ? `${crashPoint.toFixed(2)}x` : '—'}
            </code>
          </div>

          {/* Computed hash */}
          {computedHash && (
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">
                SHA-256(serverSeed) — Computed
              </label>
              <code className="block bg-gray-800 rounded-lg px-3 py-2 text-gray-300 font-mono text-xs break-all">
                {computedHash}
              </code>
            </div>
          )}

          {/* Verification status */}
          <div className="pt-2">
            {status === 'idle' && null}
            {status === 'verifying' && (
              <p className="text-gray-400 text-center animate-pulse">Verifying...</p>
            )}
            {status === 'valid' && (
              <div className="flex items-center gap-2 text-emerald-400 bg-emerald-900/30 border border-emerald-800 rounded-lg px-4 py-3">
                <span className="text-lg">✓</span>
                <span className="font-semibold">Round verified — provably fair</span>
              </div>
            )}
            {status === 'invalid' && (
              <div className="flex items-center gap-2 text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-4 py-3">
                <span className="text-lg">✗</span>
                <span className="font-semibold">Hash mismatch — verification failed</span>
              </div>
            )}
            {status === 'unavailable' && (
              <p className="text-gray-500 text-center text-xs">
                Verification data not yet available. Complete a round first.
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-800 text-xs text-gray-500">
          SHA-256(serverSeed) must equal the round hash committed before the game started.
        </div>
      </div>
    </div>
  );
}
