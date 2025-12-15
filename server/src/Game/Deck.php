<?php

declare(strict_types=1);

namespace Truco\Game;

final class Deck
{
    public static function newShuffledDeck(): array
    {
        $cards = array_map(
            static fn (array $m): string => (string) $m['cardId'],
            CardMeta::all()
        );

        for ($i = count($cards) - 1; $i > 0; $i--) {
            $j = random_int(0, $i);
            [$cards[$i], $cards[$j]] = [$cards[$j], $cards[$i]];
        }

        return $cards;
    }

    public static function deal(array $deck, int $count): array
    {
        $hand = array_slice($deck, 0, $count);
        $rest = array_slice($deck, $count);
        return [$hand, $rest];
    }
}
