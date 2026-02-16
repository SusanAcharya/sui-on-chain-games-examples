import { GRID_W, GRID_H } from '../constants';
import { useGameStore } from '../stores/gameStore';

export function GameBoard() {
  const getCellType = useGameStore((s) => s.getCellType);
  const isGoal = useGameStore((s) => s.isGoal);

  const cells = [];
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const type = getCellType(x, y);
      const showGoal = isGoal(x, y) && type === 'empty';
      cells.push(
        <div
          key={`${x}-${y}`}
          className={`cell ${type} ${showGoal ? 'goal-marker' : ''}`}
        />
      );
    }
  }

  return <div className="board">{cells}</div>;
}
