<?php

declare(strict_types=1);

libxml_use_internal_errors(true);

$repoRoot = dirname(__DIR__);
$srcSvgPath = $repoRoot . '/baraja_espanola.svg';
$outCardsDir = $repoRoot . '/client/public/cards';
$outCardsJsonPath = $repoRoot . '/client/public/cards/cards.json';
$outCardsJsonCompatPath = $repoRoot . '/client/public/cards.json';

if (!file_exists($srcSvgPath)) {
    fwrite(STDERR, "Missing source SVG: {$srcSvgPath}\n");
    exit(1);
}

if (!is_dir($outCardsDir) && !mkdir($outCardsDir, 0775, true) && !is_dir($outCardsDir)) {
    fwrite(STDERR, "Failed to create output dir: {$outCardsDir}\n");
    exit(1);
}

$xml = file_get_contents($srcSvgPath);
if ($xml === false || $xml === '') {
    fwrite(STDERR, "Failed to read source SVG\n");
    exit(1);
}

$srcDoc = new DOMDocument();
$srcDoc->preserveWhiteSpace = false;
$srcDoc->loadXML($xml);

/**
 * @return array{0: float, 1: float}
 */
function parseTranslate(string $transform): array
{
    $transform = trim($transform);
    if ($transform === '') {
        return [0.0, 0.0];
    }

    if (preg_match('/translate\(([-0-9.]+)(?:[ ,]+([-0-9.]+))?\)/', $transform, $m)) {
        $x = (float) $m[1];
        $y = isset($m[2]) ? (float) $m[2] : 0.0;
        return [$x, $y];
    }

    if (preg_match('/matrix\(([-0-9.]+)[ ,]+([-0-9.]+)[ ,]+([-0-9.]+)[ ,]+([-0-9.]+)[ ,]+([-0-9.]+)[ ,]+([-0-9.]+)\)/', $transform, $m)) {
        return [(float) $m[5], (float) $m[6]];
    }

    return [0.0, 0.0];
}

/** @return array<string, DOMElement> */
function buildIdMap(DOMDocument $doc): array
{
    $map = [];
    $all = $doc->getElementsByTagName('*');
    foreach ($all as $node) {
        if (!$node instanceof DOMElement) {
            continue;
        }
        if ($node->hasAttribute('id')) {
            $id = $node->getAttribute('id');
            if ($id !== '' && !isset($map[$id])) {
                $map[$id] = $node;
            }
        }
    }
    return $map;
}

/** @return string[] */
function collectRefsFromElement(DOMElement $el): array
{
    $refs = [];

    foreach ($el->attributes as $attr) {
        $name = $attr->nodeName;
        $value = (string) $attr->nodeValue;

        if (preg_match('/(?:^|:)href$/', $name) && str_starts_with($value, '#')) {
            $refs[] = substr($value, 1);
        }

        if ($value !== '' && preg_match_all('/url\(#([^\)]+)\)/', $value, $m)) {
            foreach ($m[1] as $id) {
                if (is_string($id) && $id !== '') {
                    $refs[] = $id;
                }
            }
        }
    }

    foreach ($el->childNodes as $child) {
        if ($child instanceof DOMElement) {
            $refs = array_merge($refs, collectRefsFromElement($child));
        }
    }

    return $refs;
}

/**
 * @return array<string, bool>
 */
function dependencyClosure(DOMElement $root, array $idMap): array
{
    $seen = [];
    $queue = collectRefsFromElement($root);

    while (!empty($queue)) {
        $id = array_pop($queue);
        if (!is_string($id) || $id === '' || isset($seen[$id])) {
            continue;
        }
        $seen[$id] = true;

        if (isset($idMap[$id])) {
            $more = collectRefsFromElement($idMap[$id]);
            foreach ($more as $m) {
                if (!isset($seen[$m])) {
                    $queue[] = $m;
                }
            }
        }
    }

    return $seen;
}

function envidoValue(int $rank): int
{
    return ($rank >= 10) ? 0 : $rank;
}

function trucoPower(string $suit, int $rank): int
{
    if ($rank === 4) return 1;
    if ($rank === 5) return 2;
    if ($rank === 6) return 3;

    if ($rank === 7 && ($suit === 'copas' || $suit === 'bastos')) return 4;

    if (in_array($rank, [10, 11, 12], true)) return 5;

    if ($rank === 1 && ($suit === 'copas' || $suit === 'oros')) return 6;

    if ($rank === 2) return 7;
    if ($rank === 3) return 8;

    if ($rank === 7 && $suit === 'oros') return 9;
    if ($rank === 7 && $suit === 'espadas') return 10;

    if ($rank === 1 && $suit === 'bastos') return 11;
    if ($rank === 1 && $suit === 'espadas') return 12;

    return 0;
}

$idMap = buildIdMap($srcDoc);

$cardBody = $idMap['card_body'] ?? null;
if (!$cardBody instanceof DOMElement) {
    fwrite(STDERR, "Missing card_body in SVG\n");
    exit(1);
}

$cardX = (float) ($cardBody->getAttribute('x') !== '' ? $cardBody->getAttribute('x') : '0');
$cardY = (float) ($cardBody->getAttribute('y') !== '' ? $cardBody->getAttribute('y') : '0');
$cardW = (float) ($cardBody->getAttribute('width') !== '' ? $cardBody->getAttribute('width') : '207');
$cardH = (float) ($cardBody->getAttribute('height') !== '' ? $cardBody->getAttribute('height') : '318');

$pad = 2.0;
$outW = $cardW + 2.0 * $pad;
$outH = $cardH + 2.0 * $pad;

$suitMap = [
    'diamond' => 'oros',
    'heart' => 'copas',
    'spade' => 'espadas',
    'club' => 'bastos',
];

$cards = [];

foreach ($suitMap as $srcSuit => $suit) {
    for ($rank = 1; $rank <= 7; $rank++) {
        $sourceId = $rank . '_' . $srcSuit;
        $cards[] = ['sourceId' => $sourceId, 'suit' => $suit, 'rank' => $rank];
    }

    $cards[] = ['sourceId' => 'jack_' . $srcSuit, 'suit' => $suit, 'rank' => 10];
    $cards[] = ['sourceId' => 'queen_' . $srcSuit, 'suit' => $suit, 'rank' => 11];
    $cards[] = ['sourceId' => 'king_' . $srcSuit, 'suit' => $suit, 'rank' => 12];
}

/** @var array<int, array<string, mixed>> $cardsMeta */
$cardsMeta = [];

foreach ($cards as $c) {
    $sourceId = (string) $c['sourceId'];
    $suit = (string) $c['suit'];
    $rank = (int) $c['rank'];

    if (!isset($idMap[$sourceId])) {
        fwrite(STDERR, "Missing card group id in SVG: {$sourceId}\n");
        exit(1);
    }

    $cardGroup = $idMap[$sourceId];
    [$gTx, $gTy] = parseTranslate($cardGroup->getAttribute('transform'));

    $useBody = null;
    foreach ($cardGroup->getElementsByTagName('use') as $use) {
        if (!$use instanceof DOMElement) {
            continue;
        }
        $href = $use->getAttribute('xlink:href');
        if ($href === '') {
            $href = $use->getAttribute('href');
        }
        if ($href === '#card_body') {
            $useBody = $use;
            break;
        }
    }

    if (!$useBody instanceof DOMElement) {
        fwrite(STDERR, "Missing use(#card_body) for {$sourceId}\n");
        exit(1);
    }

    [$uTx, $uTy] = parseTranslate($useBody->getAttribute('transform'));

    $topLeftX = $gTx + $uTx + $cardX - $pad;
    $topLeftY = $gTy + $uTy + $cardY - $pad;

    $shiftX = -$topLeftX;
    $shiftY = -$topLeftY;

    $deps = dependencyClosure($cardGroup, $idMap);

    $outDoc = new DOMDocument('1.0', 'UTF-8');
    $outDoc->preserveWhiteSpace = false;

    $svg = $outDoc->createElement('svg');
    $svg->setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    $svg->setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    $svg->setAttribute('width', (string) $outW);
    $svg->setAttribute('height', (string) $outH);
    $svg->setAttribute('viewBox', '0 0 ' . $outW . ' ' . $outH);

    $defs = $outDoc->createElement('defs');

    $depIds = array_keys($deps);
    sort($depIds);
    foreach ($depIds as $depId) {
        if ($depId === $sourceId) {
            continue;
        }
        if (!isset($idMap[$depId])) {
            continue;
        }
        $clone = $outDoc->importNode($idMap[$depId], true);
        if ($clone instanceof DOMElement) {
            $defs->appendChild($clone);
        }
    }

    $svg->appendChild($defs);

    $wrap = $outDoc->createElement('g');
    $wrap->setAttribute('transform', 'translate(' . $shiftX . ' ' . $shiftY . ')');
    $wrap->appendChild($outDoc->importNode($cardGroup, true));

    $svg->appendChild($wrap);
    $outDoc->appendChild($svg);

    $cardId = sprintf('%s_%02d', $suit, $rank);
    $outPath = $outCardsDir . '/' . $cardId . '.svg';

    $outDoc->formatOutput = true;
    $saved = $outDoc->save($outPath);
    if ($saved === false) {
        fwrite(STDERR, "Failed to write {$outPath}\n");
        exit(1);
    }

    $cardsMeta[] = [
        'cardId' => $cardId,
        'suit' => $suit,
        'rank' => $rank,
        'trucoPower' => trucoPower($suit, $rank),
        'envidoValue' => envidoValue($rank),
        'sourceId' => $sourceId,
    ];
}

usort($cardsMeta, function (array $a, array $b): int {
    return strcmp((string) $a['cardId'], (string) $b['cardId']);
});

$json = json_encode($cardsMeta, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
if (!is_string($json)) {
    fwrite(STDERR, "Failed to encode JSON\n");
    exit(1);
}

if (!is_dir(dirname($outCardsJsonPath)) && !mkdir(dirname($outCardsJsonPath), 0775, true) && !is_dir(dirname($outCardsJsonPath))) {
    fwrite(STDERR, "Failed to create cards json dir\n");
    exit(1);
}

file_put_contents($outCardsJsonPath, $json . "\n");
file_put_contents($outCardsJsonCompatPath, $json . "\n");

fwrite(STDOUT, "Exported " . count($cardsMeta) . " cards to {$outCardsDir}\n");
fwrite(STDOUT, "Wrote {$outCardsJsonPath} and {$outCardsJsonCompatPath}\n");
