<?php

declare(strict_types=1);

namespace Truco\Game;

final class CardMeta
{
    private static ?array $byCardId = null;

    public static function get(string $cardId): array
    {
        $map = self::loadByCardId();
        if (!isset($map[$cardId])) {
            throw new \InvalidArgumentException('unknown_card');
        }
        return $map[$cardId];
    }

    public static function all(): array
    {
        return array_values(self::loadByCardId());
    }

    private static function loadByCardId(): array
    {
        if (self::$byCardId !== null) {
            return self::$byCardId;
        }

        $path = dirname(__DIR__, 2) . '/resources/cards.json';
        $raw = file_get_contents($path);
        if ($raw === false || $raw === '') {
            throw new \RuntimeException('missing_cards_json');
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            throw new \RuntimeException('invalid_cards_json');
        }

        $map = [];
        foreach ($decoded as $row) {
            if (!is_array($row)) {
                throw new \RuntimeException('invalid_cards_json_row');
            }

            $cardId = $row['cardId'] ?? null;
            $suit = $row['suit'] ?? null;
            $rank = $row['rank'] ?? null;
            $trucoPower = $row['trucoPower'] ?? null;
            $envidoValue = $row['envidoValue'] ?? null;

            if (!is_string($cardId) || $cardId === '') {
                throw new \RuntimeException('invalid_cardId');
            }
            if (!is_string($suit) || $suit === '') {
                throw new \RuntimeException('invalid_suit');
            }
            if (!is_int($rank)) {
                throw new \RuntimeException('invalid_rank');
            }
            if (!is_int($trucoPower)) {
                throw new \RuntimeException('invalid_trucoPower');
            }
            if (!is_int($envidoValue)) {
                throw new \RuntimeException('invalid_envidoValue');
            }

            $map[$cardId] = [
                'cardId' => $cardId,
                'suit' => $suit,
                'rank' => $rank,
                'trucoPower' => $trucoPower,
                'envidoValue' => $envidoValue,
            ];
        }

        ksort($map);
        self::$byCardId = $map;
        return self::$byCardId;
    }
}
