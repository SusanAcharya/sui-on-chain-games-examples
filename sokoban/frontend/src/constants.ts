// Deployed contract IDs (testnet) — v3 with grid clearing on restart
export const PACKAGE_ID = '0x6c44825e9e36296ea9821e4a929dd8e80a2afe0adfec6576f5e8c7fd45a020d1';
export const GAME_SESSION_ID = '0xd96c9bbb8c25955bdc088de2c913361563cc801367262f2753b1e679acf24b14';
export const GRID_ID = '0xe444047ed1d0979543602183e0f322f62c7fcd86d54d5eac31b8f2c4c1f6d008';
export const WORLD_ID = '0xf4eca83955ab6110761242a9b7745093b3d128b2dcad68e7c2b3935c745120b1';
export const CLOCK_ID = '0x6';
export const ENTITY_PACKAGE_ID = '0x5027c19c807223b4b91e8f70b694c5b37118d5ea727d982820b837b54697d7f4';

// Direction constants (match Move contract)
export const DIR_UP = 0;
export const DIR_RIGHT = 1;
export const DIR_DOWN = 2;
export const DIR_LEFT = 3;

// Marker types
export const MARKER_PLAYER = 0;
export const MARKER_WALL = 1;
export const MARKER_BOX = 2;

// Game states
export const STATE_LOBBY = 0;
export const STATE_ACTIVE = 1;
export const STATE_FINISHED = 2;

// Grid size
export const GRID_W = 6;
export const GRID_H = 6;

// Level metadata
export const LEVELS = [
    { id: 1, name: 'First Steps', boxes: 2, difficulty: 'Easy', maxMoves: 12 },
    { id: 2, name: 'Open Field', boxes: 2, difficulty: 'Easy', maxMoves: 16 },
    { id: 3, name: 'Storage Room', boxes: 3, difficulty: 'Medium', maxMoves: 14 },
    { id: 4, name: 'Crossroads', boxes: 2, difficulty: 'Medium', maxMoves: 14 },
    { id: 5, name: 'The Gauntlet', boxes: 3, difficulty: 'Hard', maxMoves: 20 },
];

// Level data for client-side simulation (mirrors Move contract)
export interface LevelData {
    wallXs: number[]; wallYs: number[];
    boxXs: number[]; boxYs: number[];
    goalXs: number[]; goalYs: number[];
    playerX: number; playerY: number;
    maxMoves: number;
}

export function getLevelData(levelId: number): LevelData {
    switch (levelId) {
        case 1: return {
            wallXs: [1, 2, 3, 4], wallYs: [1, 1, 1, 1],
            boxXs: [2, 3], boxYs: [3, 3],
            goalXs: [4, 4], goalYs: [2, 3],
            playerX: 3, playerY: 4, maxMoves: 12,
        };
        case 2: return {
            wallXs: [2], wallYs: [3],
            boxXs: [3, 3], boxYs: [2, 4],
            goalXs: [1, 1], goalYs: [2, 4],
            playerX: 3, playerY: 5, maxMoves: 16,
        };
        case 3: return {
            wallXs: [2, 3, 4], wallYs: [1, 1, 1],
            boxXs: [2, 2, 2], boxYs: [3, 4, 5],
            goalXs: [1, 1, 1], goalYs: [3, 4, 5],
            playerX: 3, playerY: 5, maxMoves: 14,
        };
        case 4: return {
            wallXs: [3, 3], wallYs: [1, 5],
            boxXs: [3, 2], boxYs: [2, 4],
            goalXs: [1, 4], goalYs: [2, 4],
            playerX: 2, playerY: 5, maxMoves: 14,
        };
        case 5: return {
            wallXs: [1, 3, 1, 3], wallYs: [1, 1, 5, 5],
            boxXs: [2, 2, 2], boxYs: [2, 3, 4],
            goalXs: [4, 0, 4], goalYs: [2, 3, 4],
            playerX: 2, playerY: 5, maxMoves: 20,
        };
        default: throw new Error(`Invalid level: ${levelId}`);
    }
}

// Error code mapping
export const ERROR_MAP: Record<number, string> = {
    100: 'Invalid game state',
    101: 'Not the player',
    102: 'Invalid direction',
    103: 'Too many moves',
    104: 'Blocked by wall',
    105: 'Out of bounds',
    106: 'Blocked by another box',
    107: 'Puzzle not solved',
    108: 'Invalid level',
    109: 'Already started',
    110: 'Level not active',
};
