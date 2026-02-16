/// Sokoban — On-Chain Box Pusher
/// Player submits entire solution as a vector<u8> of directions.
/// Contract simulates all moves and verifies the puzzle is solved.
#[allow(unused_const, unused_field, lint(public_entry))]
module sokoban::game;

use std::ascii;
use sui::clock::Clock;
use sui::event;
use entity::entity::{Self, Entity};
use world::world::{Self, World};
use systems::grid_sys::{Self, Grid};
use components::position;


// ═══════════════════════════════════════════════
// ERROR CONSTANTS
// ═══════════════════════════════════════════════

const EInvalidState: u64 = 100;
const ENotPlayer: u64 = 101;
const EInvalidDirection: u64 = 102;
const ETooManyMoves: u64 = 103;
const EBlockedByWall: u64 = 104;
const EOutOfBounds: u64 = 105;
const EBlockedByBox: u64 = 106;
const EPuzzleNotSolved: u64 = 107;
const EInvalidLevel: u64 = 108;
const EAlreadyStarted: u64 = 109;
const ELevelNotActive: u64 = 110;

// ═══════════════════════════════════════════════
// GAME CONSTANTS
// ═══════════════════════════════════════════════

const STATE_LOBBY: u8 = 0;
const STATE_ACTIVE: u8 = 1;
const STATE_FINISHED: u8 = 2;

// Directions
const DIR_UP: u8 = 0;
const DIR_RIGHT: u8 = 1;
const DIR_DOWN: u8 = 2;
const DIR_LEFT: u8 = 3;

// Marker types (symbol field)
const MARKER_PLAYER: u64 = 0;
const MARKER_WALL: u64 = 1;
const MARKER_BOX: u64 = 2;

// Grid size
const GRID_W: u64 = 6;
const GRID_H: u64 = 6;

// Max levels
const MAX_LEVEL: u64 = 5;

// ═══════════════════════════════════════════════
// GAME SESSION
// ═══════════════════════════════════════════════

public struct GameSession has key {
    id: UID,
    state: u8,
    player: Option<address>,
    level_id: u64,
    max_moves: u64,
    // Goal positions (parallel arrays)
    goal_xs: vector<u64>,
    goal_ys: vector<u64>,
    // Starting positions for reset
    player_start_x: u64,
    player_start_y: u64,
    box_start_xs: vector<u64>,
    box_start_ys: vector<u64>,
    // Wall positions (stored so we can clear grid on restart)
    wall_xs: vector<u64>,
    wall_ys: vector<u64>,
    // Scoring
    best_score: Option<u64>,
}

// ═══════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════

public struct GameCreated has copy, drop {
    session_id: ID,
    world_id: ID,
}

public struct LevelStarted has copy, drop {
    session_id: ID,
    level_id: u64,
    player: address,
}

public struct LevelComplete has copy, drop {
    session_id: ID,
    level_id: u64,
    move_count: u64,
    is_new_best: bool,
}

public struct SolutionFailed has copy, drop {
    session_id: ID,
    level_id: u64,
}

// ═══════════════════════════════════════════════
// INIT — Creates World + Grid + GameSession
// ═══════════════════════════════════════════════

fun init(ctx: &mut TxContext) {
    let world = world::create_world(
        ascii::string(b"Sokoban"),
        200,  // max entities (walls + boxes + player across levels)
        ctx,
    );

    let grid = world::create_grid(&world, GRID_W, GRID_H, ctx);

    let session = GameSession {
        id: object::new(ctx),
        state: STATE_LOBBY,
        player: option::none(),
        level_id: 0,
        max_moves: 0,
        goal_xs: vector[],
        goal_ys: vector[],
        player_start_x: 0,
        player_start_y: 0,
        box_start_xs: vector[],
        box_start_ys: vector[],
        wall_xs: vector[],
        wall_ys: vector[],
        best_score: option::none(),
    };

    event::emit(GameCreated {
        session_id: object::id(&session),
        world_id: object::id(&world),
    });

    world::share_grid(grid);
    world::share(world);
    transfer::share_object(session);
}

// ═══════════════════════════════════════════════
// ENTRY FUNCTIONS
// ═══════════════════════════════════════════════

/// Start a level — spawns all entities for the chosen level.
public entry fun start_level(
    session: &mut GameSession,
    world: &mut World,
    grid: &mut Grid,
    level_id: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(session.state == STATE_LOBBY || session.state == STATE_FINISHED || session.state == STATE_ACTIVE, EInvalidState);
    assert!(level_id >= 1 && level_id <= MAX_LEVEL, EInvalidLevel);

    // If restarting from ACTIVE or FINISHED, clear old entities from grid first
    if (session.state == STATE_ACTIVE || session.state == STATE_FINISHED) {
        clear_grid(session, grid);
    };

    let player_addr = ctx.sender();
    session.player = option::some(player_addr);
    session.level_id = level_id;
    session.state = STATE_ACTIVE;
    session.best_score = option::none();

    // Load level data
    let (wall_xs, wall_ys, box_xs, box_ys, goal_xs, goal_ys, px, py, max_moves) =
        get_level_data(level_id);

    session.max_moves = max_moves;
    session.goal_xs = goal_xs;
    session.goal_ys = goal_ys;
    session.player_start_x = px;
    session.player_start_y = py;
    session.box_start_xs = box_xs;
    session.box_start_ys = box_ys;
    session.wall_xs = wall_xs;
    session.wall_ys = wall_ys;

    // Spawn walls
    let num_walls = vector::length(&wall_xs);
    let mut i = 0;
    while (i < num_walls) {
        let wx = *vector::borrow(&wall_xs, i);
        let wy = *vector::borrow(&wall_ys, i);
        let wall = world::spawn_tile(world, wx, wy, (MARKER_WALL as u8), clock, ctx);
        world::place(world, grid, object::id(&wall), wx, wy);
        entity::share(wall);
        i = i + 1;
    };

    // Spawn boxes
    let num_boxes = vector::length(&session.box_start_xs);
    i = 0;
    while (i < num_boxes) {
        let bx = *vector::borrow(&session.box_start_xs, i);
        let by = *vector::borrow(&session.box_start_ys, i);
        let box_entity = world::spawn_tile(world, bx, by, (MARKER_BOX as u8), clock, ctx);
        world::place(world, grid, object::id(&box_entity), bx, by);
        entity::share(box_entity);
        i = i + 1;
    };

    // Spawn player
    let player_entity = world::spawn_tile(world, px, py, (MARKER_PLAYER as u8), clock, ctx);
    world::place(world, grid, object::id(&player_entity), px, py);
    entity::share(player_entity);

    event::emit(LevelStarted {
        session_id: object::id(session),
        level_id,
        player: player_addr,
    });
}

/// Submit a solution — vector of directions. All-or-nothing.
/// The player_entity must be passed first, then all box entities in spawn order.
public entry fun submit_solution(
    session: &mut GameSession,
    world: &World,
    grid: &mut Grid,
    player_entity: &mut Entity,
    mut box_entities: vector<Entity>,
    directions: vector<u8>,
    ctx: &TxContext,
) {
    assert!(session.state == STATE_ACTIVE, ELevelNotActive);
    assert!(option::contains(&session.player, &ctx.sender()), ENotPlayer);

    let num_moves = vector::length(&directions);
    assert!(num_moves <= session.max_moves, ETooManyMoves);

    // Simulate all moves
    let mut i = 0;
    while (i < num_moves) {
        let dir = *vector::borrow(&directions, i);
        assert!(dir <= 3, EInvalidDirection);

        // Get current player position
        let player_pos = position::borrow(player_entity);
        let player_x = position::x(player_pos);
        let player_y = position::y(player_pos);

        // Calculate target position
        let (target_x, target_y, valid) = calc_target(player_x, player_y, dir);
        assert!(valid, EOutOfBounds);

        // Check what's at target
        if (grid_sys::is_occupied(grid, target_x, target_y)) {
            // Something is there — could be wall or box
            let target_entity_id = grid_sys::get_entity_at(grid, target_x, target_y);
            
            // Find if it's a box
            let (is_box, box_idx) = find_box_entity(&box_entities, target_entity_id);

            if (is_box) {
                // It's a box — try to push it
                let (push_x, push_y, push_valid) = calc_target(target_x, target_y, dir);
                assert!(push_valid, EOutOfBounds);
                assert!(!grid_sys::is_occupied(grid, push_x, push_y), EBlockedByBox);

                // Move box: remove from grid, update position, re-place
                let box_ref = vector::borrow_mut(&mut box_entities, box_idx);
                world::remove_from_grid(world, grid, target_x, target_y);
                let box_pos = position::borrow_mut(box_ref);
                position::set(box_pos, push_x, push_y);
                world::place(world, grid, object::id(box_ref), push_x, push_y);
            } else {
                // It's a wall — blocked
                abort EBlockedByWall
            };
        };

        // Move player: remove from grid, update position, re-place
        world::remove_from_grid(world, grid, player_x, player_y);
        let p_pos = position::borrow_mut(player_entity);
        position::set(p_pos, target_x, target_y);
        world::place(world, grid, object::id(player_entity), target_x, target_y);

        i = i + 1;
    };

    // Check win condition: all goals must have a box
    let num_goals = vector::length(&session.goal_xs);
    let mut g = 0;
    while (g < num_goals) {
        let gx = *vector::borrow(&session.goal_xs, g);
        let gy = *vector::borrow(&session.goal_ys, g);
        
        // Check if there's a box at this goal position
        let has_box = is_box_at_position(&box_entities, gx, gy);
        assert!(has_box, EPuzzleNotSolved);
        g = g + 1;
    };

    // Puzzle solved!
    let is_new_best = if (option::is_some(&session.best_score)) {
        num_moves < *option::borrow(&session.best_score)
    } else {
        true
    };

    if (is_new_best) {
        session.best_score = option::some(num_moves);
    };

    session.state = STATE_FINISHED;

    event::emit(LevelComplete {
        session_id: object::id(session),
        level_id: session.level_id,
        move_count: num_moves,
        is_new_best,
    });

    // Return box entities to shared
    let mut j = 0;
    let len = vector::length(&box_entities);
    while (j < len) {
        let box_e = vector::pop_back(&mut box_entities);
        entity::share(box_e);
        j = j + 1;
    };
    vector::destroy_empty(box_entities);
}

// ═══════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════

/// Remove all entities from the grid using stored positions.
/// Called when restarting a level from ACTIVE state.
fun clear_grid(session: &GameSession, grid: &mut Grid) {
    // Remove walls
    let num_walls = vector::length(&session.wall_xs);
    let mut i = 0;
    while (i < num_walls) {
        let wx = *vector::borrow(&session.wall_xs, i);
        let wy = *vector::borrow(&session.wall_ys, i);
        if (grid_sys::is_occupied(grid, wx, wy)) {
            grid_sys::remove(grid, wx, wy);
        };
        i = i + 1;
    };

    // Remove boxes (at start positions — they haven't moved since no submit_solution succeeded)
    let num_boxes = vector::length(&session.box_start_xs);
    i = 0;
    while (i < num_boxes) {
        let bx = *vector::borrow(&session.box_start_xs, i);
        let by = *vector::borrow(&session.box_start_ys, i);
        if (grid_sys::is_occupied(grid, bx, by)) {
            grid_sys::remove(grid, bx, by);
        };
        i = i + 1;
    };

    // Remove player
    if (grid_sys::is_occupied(grid, session.player_start_x, session.player_start_y)) {
        grid_sys::remove(grid, session.player_start_x, session.player_start_y);
    };
}

/// Calculate target position from current position + direction.
/// Returns (x, y, is_valid). Invalid if out of bounds.
fun calc_target(x: u64, y: u64, dir: u8): (u64, u64, bool) {
    if (dir == DIR_UP) {
        if (y == 0) { return (x, y, false) };
        (x, y - 1, true)
    } else if (dir == DIR_RIGHT) {
        if (x + 1 >= GRID_W) { return (x, y, false) };
        (x + 1, y, true)
    } else if (dir == DIR_DOWN) {
        if (y + 1 >= GRID_H) { return (x, y, false) };
        (x, y + 1, true)
    } else {
        // DIR_LEFT
        if (x == 0) { return (x, y, false) };
        (x - 1, y, true)
    }
}

/// Find a box entity by its on-chain ID in the box_entities vector.
/// Returns (is_box, index).
fun find_box_entity(box_entities: &vector<Entity>, target_id: ID): (bool, u64) {
    let len = vector::length(box_entities);
    let mut i = 0;
    while (i < len) {
        let box_e = vector::borrow(box_entities, i);
        if (object::id(box_e) == target_id) {
            return (true, i)
        };
        i = i + 1;
    };
    (false, 0)
}

/// Check if any box entity is at the given position.
fun is_box_at_position(box_entities: &vector<Entity>, x: u64, y: u64): bool {
    let len = vector::length(box_entities);
    let mut i = 0;
    while (i < len) {
        let box_e = vector::borrow(box_entities, i);
        let pos = position::borrow(box_e);
        if (position::x(pos) == x && position::y(pos) == y) {
            return true
        };
        i = i + 1;
    };
    false
}

// ═══════════════════════════════════════════════
// LEVEL DATA
// ═══════════════════════════════════════════════

/// Returns (wall_xs, wall_ys, box_xs, box_ys, goal_xs, goal_ys, player_x, player_y, max_moves)
fun get_level_data(level_id: u64): (
    vector<u64>, vector<u64>,   // walls
    vector<u64>, vector<u64>,   // boxes
    vector<u64>, vector<u64>,   // goals
    u64, u64,                    // player start
    u64,                         // max moves
) {
    if (level_id == 1) {
        // Level 1: "First Steps" — 2 boxes, easy
        // . . . . . .
        // . # # # # .
        // . . . . G .
        // . . B B G .
        // . . . @ . .
        // . . . . . .
        (
            vector[1, 2, 3, 4],          // wall_xs
            vector[1, 1, 1, 1],          // wall_ys
            vector[2, 3],                // box_xs
            vector[3, 3],                // box_ys
            vector[4, 4],                // goal_xs
            vector[2, 3],                // goal_ys
            3, 4,                        // player start
            12,                          // max_moves
        )
    } else if (level_id == 2) {
        // Level 2: "Open Field" — 2 boxes, navigate around
        // . . . . . .
        // . . . . . .
        // . G . B . .
        // . . # . . .
        // . G . B . .
        // . . . @ . .
        (
            vector[2],                   // wall_xs
            vector[3],                   // wall_ys
            vector[3, 3],                // box_xs
            vector[2, 4],                // box_ys
            vector[1, 1],                // goal_xs
            vector[2, 4],                // goal_ys
            3, 5,                        // player start
            16,                          // max_moves
        )
    } else if (level_id == 3) {
        // Level 3: "Storage Room" — 3 boxes, zigzag
        // . . . . . .
        // . . # # # .
        // . . . . . .
        // . G B . . .
        // . G B . . .
        // . G B @ . .
        (
            vector[2, 3, 4],             // wall_xs
            vector[1, 1, 1],             // wall_ys
            vector[2, 2, 2],             // box_xs
            vector[3, 4, 5],             // box_ys
            vector[1, 1, 1],             // goal_xs
            vector[3, 4, 5],             // goal_ys
            3, 5,                        // player start
            14,                          // max_moves
        )
    } else if (level_id == 4) {
        // Level 4: "Crossroads" — 2 boxes, opposite directions
        // . . . . . .
        // . . . # . .
        // . G . B . .
        // . . . . . .
        // . . B . G .
        // . . @ # . .
        (
            vector[3, 3],                // wall_xs
            vector[1, 5],                // wall_ys
            vector[3, 2],                // box_xs
            vector[2, 4],                // box_ys
            vector[1, 4],                // goal_xs
            vector[2, 4],                // goal_ys
            2, 5,                        // player start
            14,                          // max_moves
        )
    } else {
        // Level 5: "The Gauntlet" — 3 boxes, complex
        // . . . . . .
        // . # . # . .
        // . . B . G .
        // G . B . . .
        // . . B . G .
        // . # @ # . .
        (
            vector[1, 3, 1, 3],          // wall_xs
            vector[1, 1, 5, 5],          // wall_ys
            vector[2, 2, 2],             // box_xs
            vector[2, 3, 4],             // box_ys
            vector[4, 0, 4],             // goal_xs
            vector[2, 3, 4],             // goal_ys
            2, 5,                        // player start
            20,                          // max_moves
        )
    }
}

// ═══════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}
