<?php

declare(strict_types=1);

namespace Truco\Api;

use Google\Auth\ApplicationDefaultCredentials;
use Google\Auth\HttpHandler\HttpHandlerFactory;
use GuzzleHttp\Client;
use Truco\Firebase\Auth;

final class Router
{
    public static function handle(): void
    {
        $method = Http::getMethod();
        $path = Http::getPath();

        if ($method === 'POST' && $path === '/api/profile/nickname') {
            $ctx = Auth::requireAuth();

            try {
                $body = Http::readJsonBody();
            } catch (\Throwable $e) {
                Http::sendJson(400, ['error' => 'invalid_json']);
                return;
            }

            $nickname = $body['nickname'] ?? '';
            if (!is_string($nickname)) {
                Http::sendJson(400, ['error' => 'invalid_nickname']);
                return;
            }

            $nickname = trim($nickname);
            if (strlen($nickname) < 3 || strlen($nickname) > 20) {
                Http::sendJson(400, ['error' => 'invalid_nickname']);
                return;
            }
            if (!preg_match('/^[a-zA-Z0-9_\-]+$/', $nickname)) {
                Http::sendJson(400, ['error' => 'invalid_nickname']);
                return;
            }

            $projectId = getenv('FIREBASE_PROJECT_ID');
            if (!is_string($projectId) || $projectId === '') {
                Http::sendJson(500, ['error' => 'missing_FIREBASE_PROJECT_ID']);
                return;
            }

            try {
                $scopes = ['https://www.googleapis.com/auth/datastore'];
                $creds = ApplicationDefaultCredentials::getCredentials($scopes);
                $httpHandler = HttpHandlerFactory::build();
                $tokenArr = $creds->fetchAuthToken($httpHandler);
                $accessToken = is_array($tokenArr) ? ($tokenArr['access_token'] ?? null) : null;
                if (!is_string($accessToken) || $accessToken === '') {
                    throw new \RuntimeException('missing_access_token');
                }

                $g = new Client(['timeout' => 10]);
                $base = 'https://firestore.googleapis.com/v1/projects/' . $projectId . '/databases/(default)/documents';
                $docPath = '/users/' . $ctx->uid;
                $docName = 'projects/' . $projectId . '/databases/(default)/documents' . $docPath;
                $payload = [
                    'name' => $docName,
                    'fields' => [
                        'nickname' => ['stringValue' => $nickname],
                    ],
                ];

                try {
                    $g->request('PATCH', $base . $docPath, [
                        'headers' => [
                            'Authorization' => 'Bearer ' . $accessToken,
                            'Content-Type' => 'application/json',
                        ],
                        'query' => ['updateMask.fieldPaths' => 'nickname'],
                        'json' => $payload,
                    ]);
                } catch (\GuzzleHttp\Exception\ClientException $e) {
                    $res = $e->getResponse();
                    $status = $res ? $res->getStatusCode() : 0;
                    if ($status !== 404) {
                        throw $e;
                    }

                    $g->request('POST', $base . '/users', [
                        'headers' => [
                            'Authorization' => 'Bearer ' . $accessToken,
                            'Content-Type' => 'application/json',
                        ],
                        'query' => ['documentId' => $ctx->uid],
                        'json' => ['fields' => $payload['fields']],
                    ]);
                }
            } catch (\Throwable $e) {
                Http::sendJson(500, [
                    'error' => 'firestore_error',
                    'type' => get_class($e),
                    'message' => $e->getMessage(),
                ]);
                return;
            }

            Http::sendJson(200, ['ok' => true, 'uid' => $ctx->uid, 'nickname' => $nickname]);
            return;
        }

        if ($method === 'GET' && $path === '/api/health') {
            Http::sendJson(200, ['ok' => true, 'ts' => time()]);
            return;
        }

        if ($method === 'GET' && $path === '/api/whoami') {
            $ctx = Auth::requireAuth();
            Http::sendJson(200, [
                'uid' => $ctx->uid,
                'claims' => $ctx->claims,
            ]);
            return;
        }

        Http::sendJson(404, ['error' => 'not_found']);
    }
}
