<?php

declare(strict_types=1);

namespace Truco\Firebase;

use Truco\Api\Http;

final class Auth
{
    public static function requireAuth(): AuthContext
    {
        $token = self::getBearerToken();
        if ($token === null) {
            Http::sendJson(401, ['error' => 'missing_auth']);
            exit;
        }

        try {
            $verifier = new TokenVerifier();
            $result = $verifier->verify($token);
            return $result;
        } catch (\Throwable $e) {
            Http::sendJson(401, ['error' => 'invalid_auth', 'message' => $e->getMessage()]);
            exit;
        }
    }

    private static function getBearerToken(): ?string
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (!is_string($header) || $header === '') {
            $headers = function_exists('getallheaders') ? getallheaders() : [];
            if (is_array($headers)) {
                foreach ($headers as $k => $v) {
                    if (is_string($k) && is_string($v) && strtolower($k) === 'authorization') {
                        $header = $v;
                        break;
                    }
                }
            }
        }

        if (!is_string($header) || $header === '') {
            return null;
        }

        if (!preg_match('/^Bearer\s+(.+)$/i', $header, $m)) {
            return null;
        }

        $token = trim($m[1]);
        return $token === '' ? null : $token;
    }
}
