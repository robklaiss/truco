<?php

declare(strict_types=1);

namespace Truco\Tests;

use PHPUnit\Framework\TestCase;
use Truco\Game\Scoring;

final class ScoringTest extends TestCase
{
    public function testCompareCards(): void
    {
        $this->assertSame(1, Scoring::compareCards('espadas_01', 'bastos_01'));
        $this->assertSame(-1, Scoring::compareCards('oros_04', 'oros_05'));
        $this->assertSame(0, Scoring::compareCards('copas_10', 'oros_10'));
    }

    public function testEnvidoValue(): void
    {
        $hand = ['oros_05', 'oros_06', 'copas_12'];
        $this->assertSame(31, Scoring::envidoValue($hand));

        $hand2 = ['oros_10', 'copas_12', 'espadas_07'];
        $this->assertSame(7, Scoring::envidoValue($hand2));
    }

    public function testFlorValue(): void
    {
        $hand = ['oros_05', 'oros_06', 'oros_07'];
        $this->assertTrue(Scoring::hasFlor($hand));
        $this->assertSame(38, Scoring::florValue($hand));
        $this->assertSame('flor_38', Scoring::paraguaySpecialFlorWin($hand));

        $hand2 = ['bastos_04', 'copas_04', 'oros_04'];
        $this->assertSame('flor_chaquena', Scoring::paraguaySpecialFlorWin($hand2));
    }

    public function testResolveHandWinnerTieRules(): void
    {
        $mano = 'p1';

        $this->assertSame('p2', Scoring::resolveHandWinner($mano, [null, 'p2']));
        $this->assertSame('p1', Scoring::resolveHandWinner($mano, ['p1', null]));
        $this->assertSame('p1', Scoring::resolveHandWinner($mano, ['p1', 'p2', null]));
        $this->assertSame('p1', Scoring::resolveHandWinner($mano, [null, null, null]));
    }
}
