import { useState } from 'react';
import { useWalletConnection } from '@mysten/dapp-kit-react';
import { Header } from './components/Header';
import { LevelSelect } from './components/LevelSelect';
import { GameBoard } from './components/GameBoard';
import { MoveControls } from './components/MoveControls';
import { useGameStore } from './stores/gameStore';
import { useGameActions } from './hooks/useGameActions';
import { LEVELS } from './constants';

type Screen = 'select' | 'play' | 'victory';

function App() {
  const { isConnected } = useWalletConnection();
  const [screen, setScreen] = useState<Screen>('select');
  const moveQueue = useGameStore((s) => s.moveQueue);
  const isSolved = useGameStore((s) => s.isSolved);
  const levelId = useGameStore((s) => s.levelId);
  const levelData = useGameStore((s) => s.levelData);
  const playerEntityId = useGameStore((s) => s.playerEntityId);
  const boxEntityIds = useGameStore((s) => s.boxEntityIds);
  const [submitting, setSubmitting] = useState(false);
  const [submitMoves, setSubmitMoves] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { submitSolution } = useGameActions();

  const level = levelId ? LEVELS.find((l) => l.id === levelId) : null;
  const solved = isSolved();

  async function handleSubmit() {
    if (!solved || !levelId || moveQueue.length === 0) return;
    if (!playerEntityId || boxEntityIds.length === 0) {
      setError('Entity IDs not found. Try restarting the level.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitSolution(moveQueue, playerEntityId, boxEntityIds);
      setSubmitMoves(moveQueue.length);
      setScreen('victory');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  function handleBackToSelect() {
    setScreen('select');
    setError(null);
  }

  return (
    <>
      <Header />

      {!isConnected ? (
        <div className="connect-prompt">
          <h2>📦 Sokoban On-Chain</h2>
          <p>Connect your Sui wallet to start playing.</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            Push boxes onto goals. All moves are verified on-chain.
          </p>
        </div>
      ) : screen === 'select' ? (
        <LevelSelect
          onLevelStarted={() => setScreen('play')}
        />
      ) : screen === 'play' ? (
        <div className="game-container">
          {/* Stats bar */}
          <div className="game-header">
            <div className="stat">
              <span className="stat-label">Level</span>
              <span className="stat-value">{level?.id ?? '-'}</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-label">Moves</span>
              <span className="stat-value">{moveQueue.length}</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-label">Max</span>
              <span className="stat-value">{levelData?.maxMoves ?? '-'}</span>
            </div>
            {playerEntityId && (
              <>
                <div className="stat-divider" />
                <div className="stat">
                  <span className="stat-label">Entities</span>
                  <span className="stat-value" style={{ fontSize: 12, color: 'var(--cell-box-on-goal)' }}>✓ Found</span>
                </div>
              </>
            )}
          </div>

          <GameBoard />
          <MoveControls />

          {/* Submit / Back */}
          <div className="action-bar">
            <button className="btn btn-secondary" onClick={handleBackToSelect}>
              ← Levels
            </button>
            {solved && (
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                    Submitting...
                  </>
                ) : (
                  '🎯 Submit Solution On-Chain'
                )}
              </button>
            )}
          </div>

          {error && <div className="error-msg">{error}</div>}
        </div>
      ) : (
        /* Victory screen */
        <div className="victory">
          <h2>🎉 Level Complete!</h2>
          <p>All boxes are on their goals. Solution verified on-chain!</p>
          <div className="stats">
            <div className="stat">
              <span className="stat-label">Level</span>
              <span className="stat-value">{level?.name}</span>
            </div>
            <div className="stat-divider" style={{ height: 40 }} />
            <div className="stat">
              <span className="stat-label">Moves Used</span>
              <span className="stat-value">{submitMoves}</span>
            </div>
          </div>
          <div className="action-bar" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={handleBackToSelect}>
              Play Another Level
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
