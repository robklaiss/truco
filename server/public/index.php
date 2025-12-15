<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use Truco\Api\Http;
use Truco\Api\Router;

Http::applyCors();

if (Http::isOptionsRequest()) {
    Http::sendJson(204, null);
    exit;
}

try {
    Router::handle();
} catch (Throwable $e) {
    error_log(json_encode([
        'severity' => 'ERROR',
        'message' => $e->getMessage(),
        'type' => get_class($e),
        'trace' => substr($e->getTraceAsString(), 0, 4000),
    ]));
    Http::sendJson(500, ['error' => 'internal_error']);
}
