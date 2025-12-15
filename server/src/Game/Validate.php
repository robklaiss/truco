<?php

declare(strict_types=1);

namespace Truco\Game;

final class Validate
{
    public static function assertActionShape(array $action): void
    {
        $type = $action['type'] ?? null;
        if (!is_string($type) || $type === '') {
            throw new \InvalidArgumentException('invalid_action_type');
        }

        if ($type === Types::ACTION_PLAY_CARD) {
            $cardId = $action['cardId'] ?? null;
            if (!is_string($cardId) || $cardId === '') {
                throw new \InvalidArgumentException('missing_cardId');
            }
            CardMeta::get($cardId);
        }
    }

    public static function assertCardInHand(array $hand, array $played, string $cardId): void
    {
        if (!in_array($cardId, $hand, true)) {
            throw new \InvalidArgumentException('card_not_in_hand');
        }
        if (in_array($cardId, $played, true)) {
            throw new \InvalidArgumentException('card_already_played');
        }
    }
}
