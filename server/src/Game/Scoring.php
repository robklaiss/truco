<?php

declare(strict_types=1);

namespace Truco\Game;

final class Scoring
{
    public static function compareCards(string $cardA, string $cardB): int
    {
        $a = CardMeta::get($cardA);
        $b = CardMeta::get($cardB);

        $pa = (int) $a['trucoPower'];
        $pb = (int) $b['trucoPower'];

        if ($pa === $pb) {
            return 0;
        }
        return ($pa < $pb) ? -1 : 1;
    }

    public static function hasFlor(array $handCardIds): bool
    {
        if (count($handCardIds) !== 3) {
            return false;
        }
        $suits = array_map(static fn (string $id): string => (string) CardMeta::get($id)['suit'], $handCardIds);
        return $suits[0] === $suits[1] && $suits[1] === $suits[2];
    }

    public static function florValue(array $handCardIds): int
    {
        if (!self::hasFlor($handCardIds)) {
            throw new \InvalidArgumentException('no_flor');
        }
        $sum = 0;
        foreach ($handCardIds as $id) {
            $sum += (int) CardMeta::get($id)['envidoValue'];
        }
        return 20 + $sum;
    }

    public static function envidoValue(array $handCardIds): int
    {
        if (count($handCardIds) !== 3) {
            throw new \InvalidArgumentException('invalid_hand');
        }

        $cards = array_map(static fn (string $id): array => CardMeta::get($id), $handCardIds);

        $bySuit = [];
        foreach ($cards as $c) {
            $suit = (string) $c['suit'];
            $bySuit[$suit] ??= [];
            $bySuit[$suit][] = (int) $c['envidoValue'];
        }

        $best = 0;
        foreach ($bySuit as $vals) {
            rsort($vals);
            if (count($vals) >= 2) {
                $best = max($best, 20 + $vals[0] + $vals[1]);
            }
        }

        if ($best > 0) {
            return $best;
        }

        $max = 0;
        foreach ($cards as $c) {
            $max = max($max, (int) $c['envidoValue']);
        }
        return $max;
    }

    public static function paraguaySpecialFlorWin(array $handCardIds): ?string
    {
        if (count($handCardIds) !== 3) {
            return null;
        }

        $metas = array_map(static fn (string $id): array => CardMeta::get($id), $handCardIds);
        $ranks = array_map(static fn (array $m): int => (int) $m['rank'], $metas);
        sort($ranks);

        if ($ranks === [4, 4, 4]) {
            return 'flor_chaquena';
        }

        $suits = array_map(static fn (array $m): string => (string) $m['suit'], $metas);
        $allOros = ($suits[0] === 'oros' && $suits[1] === 'oros' && $suits[2] === 'oros');
        if ($allOros && $ranks === [5, 6, 7]) {
            return 'flor_38';
        }

        return null;
    }

    public static function resolveHandWinner(string $manoUid, array $trickWinners): ?string
    {
        $t1 = $trickWinners[0] ?? null;
        $t2 = $trickWinners[1] ?? null;
        $t3 = $trickWinners[2] ?? null;

        if ($t1 !== null) {
            if ($t2 === $t1) {
                return $t1;
            }
            if ($t2 === null) {
                return $t1;
            }
            if ($t3 === null) {
                return $t1;
            }
            return $t3;
        }

        if ($t2 !== null) {
            return $t2;
        }

        if ($t3 !== null) {
            return $t3;
        }

        return $manoUid;
    }
}
