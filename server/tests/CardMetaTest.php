<?php

declare(strict_types=1);

namespace Truco\Tests;

use PHPUnit\Framework\TestCase;
use Truco\Game\CardMeta;

final class CardMetaTest extends TestCase
{
    public function testLoadsKnownCards(): void
    {
        $c = CardMeta::get('espadas_01');
        $this->assertSame('espadas', $c['suit']);
        $this->assertSame(1, $c['rank']);
        $this->assertSame(12, $c['trucoPower']);
        $this->assertSame(1, $c['envidoValue']);

        $b = CardMeta::get('bastos_01');
        $this->assertSame(11, $b['trucoPower']);

        $o7 = CardMeta::get('oros_07');
        $this->assertSame(9, $o7['trucoPower']);

        $e7 = CardMeta::get('espadas_07');
        $this->assertSame(10, $e7['trucoPower']);
    }
}
