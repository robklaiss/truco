<?php

declare(strict_types=1);

namespace Truco\Firebase;

final class AuthContext
{
    public string $uid;

    public array $claims;

    public function __construct(string $uid, array $claims)
    {
        $this->uid = $uid;
        $this->claims = $claims;
    }
}
