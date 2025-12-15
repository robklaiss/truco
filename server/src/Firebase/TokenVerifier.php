<?php

declare(strict_types=1);

namespace Truco\Firebase;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use GuzzleHttp\Client;

final class TokenVerifier
{
    private const KEYS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
    private const CACHE_FILE = '/tmp/firebase_public_keys_cache.json';
    private const CACHE_TTL_SECONDS = 3600;

    public function verify(string $jwt): AuthContext
    {
        $projectId = getenv('FIREBASE_PROJECT_ID');
        if (!is_string($projectId) || $projectId === '') {
            throw new \RuntimeException('missing_FIREBASE_PROJECT_ID');
        }

        $kid = $this->getKid($jwt);
        $keys = $this->getKeys();

        if (!isset($keys[$kid])) {
            $keys = $this->refreshKeys();
        }
        if (!isset($keys[$kid])) {
            throw new \RuntimeException('unknown_kid');
        }

        $claimsObj = JWT::decode($jwt, new Key($keys[$kid], 'RS256'));
        $claims = json_decode(json_encode($claimsObj, JSON_UNESCAPED_SLASHES), true);
        if (!is_array($claims)) {
            throw new \RuntimeException('invalid_claims');
        }

        $aud = $claims['aud'] ?? null;
        $iss = $claims['iss'] ?? null;
        $sub = $claims['sub'] ?? null;
        $uid = $claims['user_id'] ?? $sub;

        if ($aud !== $projectId) {
            throw new \RuntimeException('invalid_audience');
        }
        if ($iss !== 'https://securetoken.google.com/' . $projectId) {
            throw new \RuntimeException('invalid_issuer');
        }
        if (!is_string($uid) || $uid === '') {
            throw new \RuntimeException('missing_uid');
        }

        return new AuthContext($uid, $claims);
    }

    private function getKid(string $jwt): string
    {
        $parts = explode('.', $jwt);
        if (count($parts) < 2) {
            throw new \RuntimeException('invalid_jwt');
        }
        $headerJson = JWT::urlsafeB64Decode($parts[0]);
        $header = json_decode($headerJson, true);
        if (!is_array($header)) {
            throw new \RuntimeException('invalid_jwt_header');
        }
        $kid = $header['kid'] ?? null;
        if (!is_string($kid) || $kid === '') {
            throw new \RuntimeException('missing_kid');
        }
        return $kid;
    }

    private function getKeys(): array
    {
        $cached = $this->readCache();
        if ($cached !== null) {
            return $cached;
        }
        return $this->refreshKeys();
    }

    private function refreshKeys(): array
    {
        $client = new Client(['timeout' => 5.0]);
        $res = $client->get(self::KEYS_URL);
        $json = (string) $res->getBody();
        $keys = json_decode($json, true);
        if (!is_array($keys)) {
            throw new \RuntimeException('invalid_keys_response');
        }
        $this->writeCache($keys);
        return $keys;
    }

    private function readCache(): ?array
    {
        if (!file_exists(self::CACHE_FILE)) {
            return null;
        }
        $raw = file_get_contents(self::CACHE_FILE);
        if ($raw === false || $raw === '') {
            return null;
        }
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return null;
        }
        $fetchedAt = $decoded['fetchedAt'] ?? null;
        $keys = $decoded['keys'] ?? null;
        if (!is_int($fetchedAt) || !is_array($keys)) {
            return null;
        }
        if ((time() - $fetchedAt) > self::CACHE_TTL_SECONDS) {
            return null;
        }
        return $keys;
    }

    private function writeCache(array $keys): void
    {
        $payload = json_encode([
            'fetchedAt' => time(),
            'keys' => $keys,
        ]);
        @file_put_contents(self::CACHE_FILE, $payload === false ? '' : $payload);
    }
}
