<?php

declare(strict_types=1);

function rrmdir(string $dir): void {
    if (!is_dir($dir)) {
        return;
    }
    $items = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($items as $item) {
        if ($item->isDir()) {
            @rmdir($item->getPathname());
        } else {
            @unlink($item->getPathname());
        }
    }
    @rmdir($dir);
}

function rcopy(string $src, string $dst): void {
    $dir = opendir($src);
    if ($dir === false) {
        throw new RuntimeException("Failed to open src: {$src}");
    }
    if (!is_dir($dst) && !mkdir($dst, 0775, true) && !is_dir($dst)) {
        throw new RuntimeException("Failed to create dst: {$dst}");
    }
    while (false !== ($file = readdir($dir))) {
        if ($file === '.' || $file === '..') {
            continue;
        }
        $srcPath = $src . DIRECTORY_SEPARATOR . $file;
        $dstPath = $dst . DIRECTORY_SEPARATOR . $file;
        if (is_dir($srcPath)) {
            rcopy($srcPath, $dstPath);
        } else {
            if (!copy($srcPath, $dstPath)) {
                throw new RuntimeException("Failed to copy {$srcPath} -> {$dstPath}");
            }
        }
    }
    closedir($dir);
}

$root = dirname(__DIR__);
$src = $root . '/src';
$dst = $root . '/public/src';

if (!is_dir($src)) {
    fwrite(STDERR, "Missing client/src. Nothing to sync.\n");
    exit(1);
}

rrmdir($dst);
rcopy($src, $dst);

fwrite(STDOUT, "Synced client/src -> client/public/src\n");
