/// Sokoban tests — full game loop, edge cases.
#[test_only]
module sokoban::game_tests;

use sui::test_scenario;
use sui::clock;
use sokoban::game::{Self, GameSession};
use world::world::World;
use systems::grid_sys::Grid;
use entity::entity::Entity;

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

const PLAYER: address = @0xA1;

// ═══════════════════════════════════════════════
// TEST: Create and start level
// ═══════════════════════════════════════════════

#[test]
fun test_create_and_start_level() {
    let mut scenario = test_scenario::begin(PLAYER);

    // Deploy
    game::init_for_testing(test_scenario::ctx(&mut scenario));

    // Start level 1
    test_scenario::next_tx(&mut scenario, PLAYER);
    {
        let mut session = test_scenario::take_shared<GameSession>(&scenario);
        let mut world = test_scenario::take_shared<World>(&scenario);
        let mut grid = test_scenario::take_shared<Grid>(&scenario);
        let c = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        game::start_level(
            &mut session,
            &mut world,
            &mut grid,
            1,  // level_id
            &c,
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(session);
        test_scenario::return_shared(world);
        test_scenario::return_shared(grid);
        clock::destroy_for_testing(c);
    };

    test_scenario::end(scenario);
}

// ═══════════════════════════════════════════════
// TEST: Solve Level 1 with valid solution
// ═══════════════════════════════════════════════

#[test]
fun test_solve_level_1() {
    let mut scenario = test_scenario::begin(PLAYER);

    // Deploy
    game::init_for_testing(test_scenario::ctx(&mut scenario));

    // Start level 1
    test_scenario::next_tx(&mut scenario, PLAYER);
    {
        let mut session = test_scenario::take_shared<GameSession>(&scenario);
        let mut world = test_scenario::take_shared<World>(&scenario);
        let mut grid = test_scenario::take_shared<Grid>(&scenario);
        let c = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        game::start_level(
            &mut session, &mut world, &mut grid, 1, &c,
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(session);
        test_scenario::return_shared(world);
        test_scenario::return_shared(grid);
        clock::destroy_for_testing(c);
    };

    // Submit solution: [LEFT, UP, RIGHT, LEFT, LEFT, UP, RIGHT, RIGHT] = [3,0,1,3,3,0,1,1]
    test_scenario::next_tx(&mut scenario, PLAYER);
    {
        let mut session = test_scenario::take_shared<GameSession>(&scenario);
        let world = test_scenario::take_shared<World>(&scenario);
        let mut grid = test_scenario::take_shared<Grid>(&scenario);

        // Get player entity and box entities
        let mut player = test_scenario::take_shared<Entity>(&scenario);

        // We need to collect box entities — they were shared during start_level
        // In test_scenario, shared objects of the same type come out in creation order
        let box1 = test_scenario::take_shared<Entity>(&scenario);
        let box2 = test_scenario::take_shared<Entity>(&scenario);

        let directions = vector[3, 0, 1, 3, 3, 0, 1, 1];
        let box_entities = vector[box1, box2];

        game::submit_solution(
            &mut session,
            &world,
            &mut grid,
            &mut player,
            box_entities,
            directions,
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(session);
        test_scenario::return_shared(world);
        test_scenario::return_shared(grid);
        test_scenario::return_shared(player);
    };

    test_scenario::end(scenario);
}
