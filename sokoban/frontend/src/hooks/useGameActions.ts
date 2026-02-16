import { Transaction } from '@mysten/sui/transactions';
import { useDAppKit, useCurrentClient } from '@mysten/dapp-kit-react';
import { useQueryClient } from '@tanstack/react-query';
import { suiClient } from '../lib/suiClient';
import {
    PACKAGE_ID, WORLD_ID, GRID_ID, GAME_SESSION_ID, CLOCK_ID,
    ENTITY_PACKAGE_ID, ERROR_MAP, getLevelData, GRID_W,
} from '../constants';

function parseTransactionError(failure: { error: string }): Error {
    const match = failure.error.match(/MoveAbort.*?(\d+)\)?$/);
    if (match) {
        const code = Number(match[1]);
        const message = ERROR_MAP[code] ?? `Transaction failed (code ${code})`;
        return new Error(message);
    }
    return new Error(failure.error || 'Transaction failed');
}

export function useGameActions() {
    const dAppKit = useDAppKit();
    const client = useCurrentClient();
    const queryClient = useQueryClient();

    return {
        startLevel: async (levelId: number) => {
            const tx = new Transaction();
            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'start_level',
                arguments: [
                    tx.object(GAME_SESSION_ID),
                    tx.object(WORLD_ID),
                    tx.object(GRID_ID),
                    tx.pure.u64(levelId),
                    tx.object(CLOCK_ID),
                ],
            });

            const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
            if (result.$kind === 'FailedTransaction') {
                throw parseTransactionError(result.FailedTransaction as any);
            }

            // Wait for finality
            await client.waitForTransaction({
                digest: result.Transaction.digest,
                include: { effects: true },
            });

            // Discover entities by querying the Grid's Table for known positions
            const { playerEntityId, boxEntityIds } = await discoverEntitiesFromGrid(levelId);

            await queryClient.refetchQueries({ queryKey: ['gameSession'] });

            return { playerEntityId, boxEntityIds };
        },

        submitSolution: async (directions: number[], playerEntityId: string, boxEntityIds: string[]) => {
            const tx = new Transaction();

            // Build the box entity vector
            const boxObjects = boxEntityIds.map(id => tx.object(id));
            const boxVec = tx.makeMoveVec({
                type: `${ENTITY_PACKAGE_ID}::entity::Entity`,
                elements: boxObjects,
            });

            tx.moveCall({
                package: PACKAGE_ID,
                module: 'game',
                function: 'submit_solution',
                arguments: [
                    tx.object(GAME_SESSION_ID),
                    tx.object(WORLD_ID),
                    tx.object(GRID_ID),
                    tx.object(playerEntityId),
                    boxVec,
                    tx.pure.vector('u8', directions),
                ],
            });

            const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
            if (result.$kind === 'FailedTransaction') {
                throw parseTransactionError(result.FailedTransaction as any);
            }

            await client.waitForTransaction({
                digest: result.Transaction.digest,
                include: { effects: true },
            });

            await queryClient.refetchQueries({ queryKey: ['gameSession'] });

            return result.Transaction;
        },
    };
}

/**
 * Discover player and box entities by reading the Grid's Table.
 *
 * Grid structure:
 *   Grid { cells: Table<u64, ID>, ... }
 *   Table entries are dynamic fields on the Table's own UID.
 *   Key = y * GRID_W + x (u64), Value = entity object ID.
 *
 * Steps:
 *   1. Read Grid object → extract Table UID from cells.id.id
 *   2. For each needed position, use getDynamicFieldObject on the Table
 */
async function discoverEntitiesFromGrid(levelId: number) {
    const levelData = getLevelData(levelId);

    // Step 1: Read Grid to get the Table's internal UID
    const gridObj = await suiClient.getObject({
        id: GRID_ID,
        options: { showContent: true },
    });

    const gridFields = (gridObj.data?.content as any)?.fields;
    const tableId = gridFields?.cells?.fields?.id?.id;

    if (!tableId) {
        throw new Error('Could not read Grid cells table ID');
    }

    console.log(`[EntityDiscovery] Grid Table ID: ${tableId}`);

    // Step 2: Look up each needed position via getDynamicFieldObject
    const playerPosIndex = levelData.playerY * GRID_W + levelData.playerX;
    const boxPosIndices = levelData.boxXs.map((bx, i) => levelData.boxYs[i] * GRID_W + bx);

    const allPositions = [playerPosIndex, ...boxPosIndices];

    // Fetch all positions in parallel
    const results = await Promise.all(
        allPositions.map(async (posIndex) => {
            try {
                const field = await suiClient.getDynamicFieldObject({
                    parentId: tableId,
                    name: { type: 'u64', value: String(posIndex) },
                });
                const entityId = (field.data?.content as any)?.fields?.value;
                return { posIndex, entityId: entityId ? String(entityId) : '' };
            } catch (e) {
                console.warn(`[EntityDiscovery] No entity at position ${posIndex}:`, e);
                return { posIndex, entityId: '' };
            }
        })
    );

    const playerEntityId = results[0].entityId;
    const boxEntityIds = results.slice(1).map(r => r.entityId);

    console.log(`[EntityDiscovery] Player: ${playerEntityId}`);
    console.log(`[EntityDiscovery] Boxes: ${boxEntityIds.join(', ')}`);

    if (!playerEntityId) {
        throw new Error('Could not find player entity on grid');
    }
    if (boxEntityIds.some(id => !id)) {
        throw new Error('Could not find all box entities on grid');
    }

    return { playerEntityId, boxEntityIds };
}
