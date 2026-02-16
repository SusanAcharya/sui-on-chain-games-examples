import { useEffect, useCallback } from 'react';
import { DIR_UP, DIR_RIGHT, DIR_DOWN, DIR_LEFT } from '../constants';
import { useGameStore } from '../stores/gameStore';

export function MoveControls() {
  const addMove = useGameStore((s) => s.addMove);
  const undoMove = useGameStore((s) => s.undoMove);
  const resetMoves = useGameStore((s) => s.resetMoves);
  const moveQueue = useGameStore((s) => s.moveQueue);
  const getDirectionName = useGameStore((s) => s.getDirectionName);
  const levelData = useGameStore((s) => s.levelData);
  const isSolved = useGameStore((s) => s.isSolved);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          e.preventDefault();
          addMove(DIR_UP);
          break;
        case 'ArrowRight':
        case 'd':
          e.preventDefault();
          addMove(DIR_RIGHT);
          break;
        case 'ArrowDown':
        case 's':
          e.preventDefault();
          addMove(DIR_DOWN);
          break;
        case 'ArrowLeft':
        case 'a':
          e.preventDefault();
          addMove(DIR_LEFT);
          break;
        case 'z':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            undoMove();
          }
          break;
        case 'r':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            resetMoves();
          }
          break;
      }
    },
    [addMove, undoMove, resetMoves]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const solved = isSolved();
  const maxMoves = levelData?.maxMoves ?? 0;

  return (
    <div className="controls">
      {/* Move queue display */}
      <div className="move-queue">
        {moveQueue.length === 0 ? (
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            Use arrow keys or D-pad to move
          </span>
        ) : (
          moveQueue.map((dir, i) => (
            <span key={i} className="move-arrow">
              {getDirectionName(dir)}
            </span>
          ))
        )}
      </div>

      {/* D-Pad */}
      <div className="dpad">
        <div className="dpad-btn empty" />
        <button className="dpad-btn" onClick={() => addMove(DIR_UP)}>↑</button>
        <div className="dpad-btn empty" />
        <button className="dpad-btn" onClick={() => addMove(DIR_LEFT)}>←</button>
        <div className="dpad-btn empty" />
        <button className="dpad-btn" onClick={() => addMove(DIR_RIGHT)}>→</button>
        <div className="dpad-btn empty" />
        <button className="dpad-btn" onClick={() => addMove(DIR_DOWN)}>↓</button>
        <div className="dpad-btn empty" />
      </div>

      {/* Move counter */}
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        {moveQueue.length} / {maxMoves} moves
        {solved && <span style={{ marginLeft: 8, color: 'var(--cell-box-on-goal)' }}>✓ Solved!</span>}
      </div>

      {/* Action buttons */}
      <div className="action-bar">
        <button
          className="btn btn-secondary"
          onClick={undoMove}
          disabled={moveQueue.length === 0}
        >
          ↩ Undo
        </button>
        <button
          className="btn btn-danger"
          onClick={resetMoves}
          disabled={moveQueue.length === 0}
        >
          ⟲ Reset
        </button>
      </div>

      <div className="keyboard-hint">
        <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> or <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>
        &nbsp;·&nbsp; <kbd>⌘Z</kbd> undo &nbsp;·&nbsp; <kbd>⌘R</kbd> reset
      </div>
    </div>
  );
}
