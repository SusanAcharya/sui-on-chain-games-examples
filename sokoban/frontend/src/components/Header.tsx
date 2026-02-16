import { ConnectButton } from '@mysten/dapp-kit-react';
import { useGameStore } from '../stores/gameStore';
import { LEVELS } from '../constants';

export function Header() {
  const levelId = useGameStore((s) => s.levelId);
  const level = levelId ? LEVELS.find((l) => l.id === levelId) : null;

  return (
    <header className="header">
      <div className="header-logo">
        <span className="emoji">📦</span>
        <h1>SOKOBAN</h1>
        {level && <span className="header-badge">Lv.{level.id} — {level.name}</span>}
      </div>
      <div className="header-info">
        <button
          className="btn btn-danger"
          style={{ padding: '4px 10px', fontSize: 11 }}
          onClick={() => { localStorage.clear(); window.location.reload(); }}
        >
          🗑 Reset
        </button>
        <span className="header-badge">testnet</span>
        <ConnectButton />
      </div>
    </header>
  );
}
