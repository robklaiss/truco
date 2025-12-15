<?php

declare(strict_types=1);

namespace Truco\Game;

final class Rules
{
    public static function applyPlayCard(array $game, array $private, string $uid, string $cardId): array
    {
        $turnUid = $game['turnUid'] ?? null;
        if (!is_string($turnUid) || $turnUid === '') {
            throw new \InvalidArgumentException('missing_turnUid');
        }
        if ($turnUid !== $uid) {
            throw new \InvalidArgumentException('not_your_turn');
        }

        $phase = $game['phase'] ?? null;
        if (!is_string($phase) || $phase === '') {
            throw new \InvalidArgumentException('missing_phase');
        }
        if (!in_array($phase, [Types::PHASE_PRE_PLAY, Types::PHASE_PLAYING], true)) {
            throw new \InvalidArgumentException('invalid_phase');
        }

        $hand = $private['hand'] ?? null;
        $played = $private['playedCardIds'] ?? [];
        if (!is_array($hand) || count($hand) !== 3) {
            throw new \InvalidArgumentException('invalid_hand');
        }
        if (!is_array($played)) {
            throw new \InvalidArgumentException('invalid_played');
        }

        Validate::assertCardInHand($hand, $played, $cardId);

        $table = $game['table'] ?? [];
        $playedTable = $table['played'] ?? [];
        if (!is_array($playedTable)) {
            $playedTable = [];
        }

        $playedTable[] = [
            'uid' => $uid,
            'cardPublicId' => $cardId,
            'at' => time(),
        ];

        $table['played'] = $playedTable;
        $game['table'] = $table;
        $game['phase'] = Types::PHASE_PLAYING;
        $game['updatedAt'] = time();
        $game['lastAction'] = ['type' => Types::ACTION_PLAY_CARD, 'byUid' => $uid, 'at' => time()];

        $private['playedCardIds'] = array_values(array_merge($played, [$cardId]));

        return [$game, $private];
    }
}
