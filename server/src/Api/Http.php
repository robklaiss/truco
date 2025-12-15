<?php

declare(strict_types=1);

namespace Truco\Api;

final class Http
{
    public static function getMethod(): string
    {
        return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    }

    public static function getPath(): string
    {
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $path = parse_url($uri, PHP_URL_PATH);
        return is_string($path) ? $path : '/';
    }

    public static function readJsonBody(): array
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || $raw === '') {
            return [];
        }
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            throw new \RuntimeException('invalid_json');
        }
        return $decoded;
    }

    public static function sendJson(int $status, $data): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        if ($data === null) {
            return;
        }
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    public static function isOptionsRequest(): bool
    {
        return self::getMethod() === 'OPTIONS';
    }

    public static function applyCors(): void
    {
        $allowed = getenv('ALLOWED_ORIGIN');
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        if (is_string($allowed) && $allowed !== '') {
            header('Access-Control-Allow-Origin: ' . $allowed);
        } elseif (is_string($origin) && $origin !== '') {
            header('Access-Control-Allow-Origin: ' . $origin);
        } else {
            header('Access-Control-Allow-Origin: *');
        }

        header('Vary: Origin');
        header('Access-Control-Allow-Headers: Authorization, Content-Type');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    }
}
