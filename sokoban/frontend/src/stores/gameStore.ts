import { create } from 'zustand';
import {
    GRID_W, GRID_H, DIR_UP, DIR_RIGHT, DIR_DOWN, DIR_LEFT,
    getLevelData, type LevelData,
} from '../constants';

// Cell types for rendering
export type CellType = 'empty' | 'wall' | 'box' | 'player' | 'box_on_goal' | 'player_on_goal';

interface GameStore {
    // Level state
    levelId: number | null;
    levelData: LevelData | null;

    // On-chain entity IDs
    playerEntityId: string | null;
    boxEntityIds: string[];

    // Simulated board
    playerPos: { x: number; y: number } | null;
    boxPositions: { x: number; y: number }[];
    moveQueue: number[];

    // Actions
    initLevel: (levelId: number, playerEntityId: string, boxEntityIds: string[]) => void;
    addMove: (dir: number) => boolean;
    undoMove: () => void;
    resetMoves: () => void;
    getDirectionName: (dir: number) => string;
    getCellType: (x: number, y: number) => CellType;
    isGoal: (x: number, y: number) => boolean;
    isSolved: () => boolean;
}

export const useGameStore = create<GameStore>((set, get) => ({
    levelId: null,
    levelData: null,
    playerEntityId: null,
    boxEntityIds: [],
    playerPos: null,
    boxPositions: [],
    moveQueue: [],

    initLevel: (levelId: number, playerEntityId: string, boxEntityIds: string[]) => {
        const data = getLevelData(levelId);
        set({
            levelId,
            levelData: data,
            playerEntityId,
            boxEntityIds,
            playerPos: { x: data.playerX, y: data.playerY },
            boxPositions: data.boxXs.map((x, i) => ({ x, y: data.boxYs[i] })),
            moveQueue: [],
        });
    },

    addMove: (dir: number) => {
        const { playerPos, boxPositions, levelData, moveQueue } = get();
        if (!playerPos || !levelData) return false;
        if (moveQueue.length >= levelData.maxMoves) return false;

        const target = calcTarget(playerPos.x, playerPos.y, dir);
        if (!target) return false;

        // Check wall
        if (isWall(levelData, target.x, target.y)) return false;

        // Check box
        const boxIdx = boxPositions.findIndex(b => b.x === target.x && b.y === target.y);
        if (boxIdx >= 0) {
            // Try to push box
            const pushTarget = calcTarget(target.x, target.y, dir);
            if (!pushTarget) return false;
            if (isWall(levelData, pushTarget.x, pushTarget.y)) return false;
            if (boxPositions.some(b => b.x === pushTarget.x && b.y === pushTarget.y)) return false;

            // Push box
            const newBoxes = [...boxPositions];
            newBoxes[boxIdx] = { x: pushTarget.x, y: pushTarget.y };
            set({
                playerPos: { x: target.x, y: target.y },
                boxPositions: newBoxes,
                moveQueue: [...moveQueue, dir],
            });
            return true;
        }

        // Just move player
        set({
            playerPos: { x: target.x, y: target.y },
            moveQueue: [...moveQueue, dir],
        });
        return true;
    },

    undoMove: () => {
        const { moveQueue, levelData, levelId } = get();
        if (!moveQueue.length || !levelData || !levelId) return;

        // Replay from start minus last move
        const newQueue = moveQueue.slice(0, -1);
        const data = getLevelData(levelId);
        let px = data.playerX;
        let py = data.playerY;
        let boxes = data.boxXs.map((x, i) => ({ x, y: data.boxYs[i] }));

        for (const dir of newQueue) {
            const target = calcTarget(px, py, dir)!;
            const boxIdx = boxes.findIndex(b => b.x === target.x && b.y === target.y);
            if (boxIdx >= 0) {
                const push = calcTarget(target.x, target.y, dir)!;
                boxes = [...boxes];
                boxes[boxIdx] = { x: push.x, y: push.y };
            }
            px = target.x;
            py = target.y;
        }

        set({
            playerPos: { x: px, y: py },
            boxPositions: boxes,
            moveQueue: newQueue,
        });
    },

    resetMoves: () => {
        const { levelId, playerEntityId, boxEntityIds } = get();
        if (!levelId) return;
        get().initLevel(levelId, playerEntityId ?? '', boxEntityIds);
    },

    getDirectionName: (dir: number) => {
        switch (dir) {
            case DIR_UP: return '↑';
            case DIR_RIGHT: return '→';
            case DIR_DOWN: return '↓';
            case DIR_LEFT: return '←';
            default: return '?';
        }
    },

    getCellType: (x: number, y: number) => {
        const { playerPos, boxPositions, levelData } = get();
        if (!levelData) return 'empty';

        if (playerPos && playerPos.x === x && playerPos.y === y) {
            return isGoalAt(levelData, x, y) ? 'player_on_goal' : 'player';
        }
        if (boxPositions.some(b => b.x === x && b.y === y)) {
            return isGoalAt(levelData, x, y) ? 'box_on_goal' : 'box';
        }
        if (isWall(levelData, x, y)) return 'wall';
        return 'empty';
    },

    isGoal: (x: number, y: number) => {
        const { levelData } = get();
        if (!levelData) return false;
        return isGoalAt(levelData, x, y);
    },

    isSolved: () => {
        const { levelData, boxPositions } = get();
        if (!levelData) return false;
        return levelData.goalXs.every((gx, i) => {
            const gy = levelData.goalYs[i];
            return boxPositions.some(b => b.x === gx && b.y === gy);
        });
    },
}));

// Helpers
function calcTarget(x: number, y: number, dir: number): { x: number; y: number } | null {
    switch (dir) {
        case DIR_UP: return y === 0 ? null : { x, y: y - 1 };
        case DIR_RIGHT: return x + 1 >= GRID_W ? null : { x: x + 1, y };
        case DIR_DOWN: return y + 1 >= GRID_H ? null : { x, y: y + 1 };
        case DIR_LEFT: return x === 0 ? null : { x: x - 1, y };
        default: return null;
    }
}

function isWall(data: LevelData, x: number, y: number): boolean {
    return data.wallXs.some((wx, i) => wx === x && data.wallYs[i] === y);
}

function isGoalAt(data: LevelData, x: number, y: number): boolean {
    return data.goalXs.some((gx, i) => gx === x && data.goalYs[i] === y);
}
