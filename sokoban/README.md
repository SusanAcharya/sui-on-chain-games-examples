# Sokoban

An on-chain box-pushing puzzle game built fully on-chain using the **Sui Game Engine**. Push all boxes onto goal tiles in the fewest moves possible across 5 hand-crafted levels.

> All game logic runs on-chain. The player submits their **entire solution** as a `vector<u8>` of directions — the contract simulates every move and verifies the puzzle is solved.

https://github.com/user-attachments/assets/demo.mp4

---

## Demo

https://github.com/user-attachments/assets/demo.mp4

![Sokoban Demo](demo.mp4)

---

## Game Overview

```
6×6 Grid    Symbols           Directions
┌─────────┐ @ = Player        0 = UP
│ . . . . │ # = Wall          1 = RIGHT
│ . # B . │ B = Box           2 = DOWN
│ . . G . │ G = Goal          3 = LEFT
│ . @ . . │ . = Empty
└─────────┘
```

**Win condition**: Push every box onto a goal tile.

**How it works**: The player solves the puzzle offline, then submits the full move sequence on-chain. The contract replays every step — if a move hits a wall, pushes a box into another box, or goes out of bounds, the transaction aborts. If all boxes land on goals, you win.

---

## Architecture

### Shared Objects

| Object | Type | Purpose |
|--------|------|---------|
| `World` | Engine world | ECS container (max 10,000 entities) — shared singleton created on deploy |
| `Grid` | Per-session grid | 6×6 tile grid — one per player per level start |
| `GameSession` | Per-session state | Tracks level, goals, best score, and game state |
| `Entity` | Tile entity | Player, walls, and boxes are all entities with `Position` components |

### State Machine

```
start_level → ACTIVE → submit_solution → FINISHED
```

| State | Value | Description |
|-------|-------|-------------|
| `STATE_LOBBY` | 0 | Reserved |
| `STATE_ACTIVE` | 1 | Puzzle in progress |
| `STATE_FINISHED` | 2 | Puzzle solved |

### Per-Player Isolation

Each call to `start_level` creates a **fresh** `Grid` + `GameSession` + all tile entities for that player. Multiple players can solve the same level concurrently without interference.

---

## Entry Functions

### `start_level(world, level_id, clock, ctx)`

Creates a new puzzle session for the caller:

1. Validates `level_id` is 1–5
2. Creates a fresh 6×6 `Grid`
3. Spawns wall, box, and player entities at level-defined positions
4. Creates a `GameSession` with goal positions and max move limit
5. Shares all objects

### `submit_solution(session, world, grid, player_entity, box_entities, directions, ctx)`

Submits a full solution — all-or-nothing verification:

1. Validates the caller owns the session and state is `ACTIVE`
2. Checks move count ≤ `max_moves`
3. **Simulates every move** sequentially:
   - Calculates target position from direction
   - If target has a box → pushes it one tile further (aborts if blocked)
   - If target has a wall → aborts
   - Moves player to target
4. **Verifies win condition**: every goal position must have a box
5. Records score, updates best if improved
6. Sets state to `FINISHED`

---

## Levels

All levels use a **6×6 grid**. `@` = player start, `#` = wall, `B` = box, `G` = goal.

### Level 1 — "First Steps" (2 boxes, 12 max moves)

```
. . . . . .
. # # # # .
. . . . G .
. . B B G .
. . . @ . .
. . . . . .
```

### Level 2 — "Open Field" (2 boxes, 16 max moves)

```
. . . . . .
. . . . . .
. G . B . .
. . # . . .
. G . B . .
. . . @ . .
```

### Level 3 — "Storage Room" (3 boxes, 14 max moves)

```
. . . . . .
. . # # # .
. . . . . .
. G B . . .
. G B . . .
. G B @ . .
```

### Level 4 — "Crossroads" (2 boxes, 14 max moves)

```
. . . . . .
. . . # . .
. G . B . .
. . . . . .
. . B . G .
. . @ # . .
```

### Level 5 — "The Gauntlet" (3 boxes, 20 max moves)

```
. . . . . .
. # . # . .
. . B . G .
G . B . . .
. . B . G .
. # @ # . .
```

---

## Entity Types (Markers)

| Marker | Value | Description |
|--------|-------|-------------|
| `MARKER_PLAYER` | 0 | The player character |
| `MARKER_WALL` | 1 | Immovable obstacle |
| `MARKER_BOX` | 2 | Pushable box — must land on goals |

---

## Engine Components Used

| Component | Module | What It Stores |
|-----------|--------|----------------|
| `Position` | `components::position` | `x: u64`, `y: u64` — tile coordinates |

### GameSession Schema

```
GameSession {
    state: u8,                // 0=Lobby, 1=Active, 2=Finished
    player: address,          // session owner
    level_id: u64,            // which level (1-5)
    max_moves: u64,           // move limit for this level
    goal_xs: vector<u64>,     // goal X coordinates
    goal_ys: vector<u64>,     // goal Y coordinates
    best_score: Option<u64>,  // fewest moves to solve (if solved)
}
```

---

## Events

| Event | Fields | Emitted When |
|-------|--------|--------------|
| `WorldCreated` | world_id | Package deployed |
| `LevelStarted` | session_id, grid_id, level_id, player | `start_level` called |
| `LevelComplete` | session_id, level_id, move_count, is_new_best | Puzzle solved |
| `SolutionFailed` | session_id, level_id | Solution rejected |

---

## Error Codes

| Code | Name | Cause |
|------|------|-------|
| 100 | `EInvalidState` | Action not valid in current state |
| 101 | `ENotPlayer` | Caller is not the session owner |
| 102 | `EInvalidDirection` | Direction value > 3 |
| 103 | `ETooManyMoves` | Solution exceeds max_moves for the level |
| 104 | `EBlockedByWall` | Player tried to move into a wall |
| 105 | `EOutOfBounds` | Move would go outside the 6×6 grid |
| 106 | `EBlockedByBox` | Box push destination is occupied |
| 107 | `EPuzzleNotSolved` | Not all goals have boxes after solution |
| 108 | `EInvalidLevel` | Level ID not in range 1–5 |
| 109 | `EAlreadyStarted` | Duplicate start attempt |
| 110 | `ELevelNotActive` | Session is not in ACTIVE state |

---

## Testing

```
sui move test
```

```
[ PASS ] test_start_level
[ PASS ] test_solve_level_1
[ PASS ] test_two_players_independent
Test result: OK. Total tests: 3; passed: 3; failed: 0
```

---

## Build & Deploy

```bash
# Build
sui move build

# Test
sui move test

# Deploy to testnet
sui client publish --gas-budget 500000000
```
