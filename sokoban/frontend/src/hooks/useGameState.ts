import { useQuery } from '@tanstack/react-query';
import { suiClient } from '../lib/suiClient';
import { GAME_SESSION_ID } from '../constants';

export interface GameSessionState {
    state: number;
    levelId: number;
    maxMoves: number;
    goalXs: number[];
    goalYs: number[];
    bestScore: number | null;
    player: string | null;
}

export function useGameState() {
    return useQuery<GameSessionState>({
        queryKey: ['gameSession', GAME_SESSION_ID],
        queryFn: async () => {
            const res = await suiClient.getObject({
                id: GAME_SESSION_ID,
                options: { showContent: true },
            });
            if (res.data?.content?.dataType !== 'moveObject') {
                throw new Error('GameSession not found');
            }
            const fields = res.data.content.fields as Record<string, any>;
            return {
                state: Number(fields.state),
                levelId: Number(fields.level_id),
                maxMoves: Number(fields.max_moves),
                goalXs: (fields.goal_xs as string[])?.map(Number) ?? [],
                goalYs: (fields.goal_ys as string[])?.map(Number) ?? [],
                bestScore: fields.best_score ? Number(fields.best_score) : null,
                player: fields.player ?? null,
            };
        },
        refetchInterval: 5_000,
    });
}
