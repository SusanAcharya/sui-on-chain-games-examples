import { useState } from 'react';
import { LEVELS } from '../constants';
import { useGameActions } from '../hooks/useGameActions';
import { useGameStore } from '../stores/gameStore';

interface Props {
  onLevelStarted: () => void;
}

export function LevelSelect({ onLevelStarted }: Props) {
  const { startLevel } = useGameActions();
  const initLevel = useGameStore((s) => s.initLevel);
  const [loading, setLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(levelId: number) {
    setLoading(levelId);
    setError(null);
    try {
      const { playerEntityId, boxEntityIds } = await startLevel(levelId);
      initLevel(levelId, playerEntityId, boxEntityIds);
      onLevelStarted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start level');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="level-select">
      <h2>Select Level</h2>
      <p className="subtitle">Push all boxes onto the goal tiles. Fewer moves = better score.</p>

      {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="level-grid">
        {LEVELS.map((level) => (
          <div
            key={level.id}
            className={`level-card ${loading !== null ? 'disabled' : ''}`}
            onClick={() => handleSelect(level.id)}
          >
            <div className="level-number">Level {level.id}</div>
            <div className="level-name">{level.name}</div>
            <div className="level-meta">
              <span className={`tag ${level.difficulty.toLowerCase()}`}>
                {level.difficulty}
              </span>
              <span className="tag info">{level.boxes} boxes</span>
              <span className="tag info">≤{level.maxMoves} moves</span>
            </div>
            {loading === level.id && (
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className="spinner" />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Starting...</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
